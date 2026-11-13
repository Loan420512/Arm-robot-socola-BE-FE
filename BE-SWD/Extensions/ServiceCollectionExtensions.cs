using System.Text;
using System.Threading.RateLimiting;
using ChocoRobot.Configuration;
using ChocoRobot.Data;
using ChocoRobot.Helpers;
using ChocoRobot.Interfaces.Repositories;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Repositories;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace ChocoRobot.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDatabaseServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = ComposePostgresConnection(configuration)
            ?? configuration.GetConnectionString(DatabaseDefinitions.ConnectionName);

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Configure ConnectionStrings__DefaultConnection using environment variables or User Secrets");
        }

        if (IsPostgresConnection(connectionString))
        {
            try
            {
                var postgres = new NpgsqlConnectionStringBuilder(connectionString);
                if (!IsAllowedDatabase(postgres.Database))
                {
                    throw new InvalidOperationException("The configured database must be ChocoRobotDB");
                }
            }
            catch (ArgumentException)
            {
                throw new InvalidOperationException("Invalid PostgreSQL connection configuration");
            }

            services.AddDbContext<ChocoRobotDbContext>(options => options.UseNpgsql(connectionString));
            return services;
        }

        try
        {
            var connectionOptions = new SqlConnectionStringBuilder(connectionString);
            var isExpectedDatabase = string.Equals(
                connectionOptions.InitialCatalog,
                DatabaseDefinitions.Name,
                StringComparison.OrdinalIgnoreCase);

            if (!isExpectedDatabase)
            {
                throw new InvalidOperationException("The configured database must be ChocoRobotDB");
            }
        }
        catch (ArgumentException)
        {
            throw new InvalidOperationException("Invalid SQL Server connection configuration");
        }

        services.AddDbContext<ChocoRobotDbContext>(options => options.UseSqlServer(connectionString));
        return services;
    }

    // Render gắn host, user, password và database riêng. Chuỗi này thắng connection string SQL cũ.
    private static string? ComposePostgresConnection(IConfiguration configuration)
    {
        var host = configuration["PGHOST"];
        var user = configuration["PGUSER"];
        var password = configuration["PGPASSWORD"];
        var database = configuration["PGDATABASE"];
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(user)
            || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(database))
        {
            return null;
        }

        if (!int.TryParse(configuration["PGPORT"], out var port))
            port = 5432;

        var ssl = host.Contains(".render.com", StringComparison.OrdinalIgnoreCase)
            ? SslMode.Require
            : SslMode.Disable;
        return new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = port,
            Username = user,
            Password = password,
            Database = database,
            SslMode = ssl
        }.ConnectionString;
    }

    // Render đặt tên database theo instance (chocorobot_db). SQL Server local vẫn bắt buộc ChocoRobotDB.
    private static bool IsAllowedDatabase(string? database)
    {
        return string.Equals(database, DatabaseDefinitions.Name, StringComparison.OrdinalIgnoreCase)
            || string.Equals(database, "chocorobot_db", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPostgresConnection(string connectionString)
    {
        var value = connectionString.TrimStart();
        return value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
            || value.Contains("Host=", StringComparison.OrdinalIgnoreCase);
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IBusinessRepository, BusinessRepository>();
        services.AddScoped(typeof(ICrudService<,,,>), typeof(CrudService<,,,>));
        services.AddScoped<BusinessRules>();
        services.AddScoped<AuthService>();
        services.AddScoped<PaymentService>();
        services.AddScoped<DashboardService>();
        services.AddHttpContextAccessor();

        return services;
    }

    public static IServiceCollection AddApiControllers(this IServiceCollection services)
    {
        services.AddControllers().ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = CreateValidationResponse;
        });

        return services;
    }

    private static IActionResult CreateValidationResponse(ActionContext context)
    {
        var errors = context.ModelState
            .Where(entry => entry.Value!.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value!.Errors
                    .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage)
                        ? "Invalid input"
                        : error.ErrorMessage)
                    .ToArray());

        var response = new ApiResponse<object>(false, ApiMessages.ValidationFailed, null, errors);
        return new BadRequestObjectResult(response);
    }

    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        JwtOptions jwtOptions)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret)),
                    ClockSkew = TimeSpan.FromSeconds(jwtOptions.ClockSkewSeconds)
                };

                options.Events = new JwtBearerEvents
                {
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        var response = new ApiResponse<object>(false, ApiMessages.AuthenticationRequired, null);
                        await context.Response.WriteAsJsonAsync(response);
                    },
                    OnForbidden = async context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        var response = new ApiResponse<object>(false, ApiMessages.AccessDenied, null);
                        await context.Response.WriteAsJsonAsync(response);
                    }
                };
            });

        return services;
    }

    public static IServiceCollection AddCorsPolicy(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];

        if (origins.Any(origin => !IsValidOrigin(origin)))
        {
            throw new InvalidOperationException(
                "Cors:Origins must contain explicit HTTP(S) origins without wildcards, paths or credentials");
        }

        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.WithOrigins(origins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        return services;
    }

    private static bool IsValidOrigin(string origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        {
            return false;
        }

        var isHttp = uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps;
        var hasOnlyOrigin = uri.AbsolutePath == "/"
            && string.IsNullOrEmpty(uri.Query)
            && string.IsNullOrEmpty(uri.Fragment)
            && string.IsNullOrEmpty(uri.UserInfo);

        return isHttp && hasOnlyOrigin;
    }

    public static IServiceCollection AddLoginRateLimiting(
        this IServiceCollection services,
        SecurityOptions securityOptions, CustomerRegistrationOptions customerRegistration)
    {
        services.AddRateLimiter(options =>
        {
            options.AddPolicy(CustomerRegistrationOptions.RatePolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = customerRegistration.PermitLimit,
                        Window = TimeSpan.FromSeconds(customerRegistration.WindowSeconds), QueueLimit = 0
                    }));
            // A shared budget also bounds distributed spam without trusting spoofable forwarding headers.
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.GetEndpoint()?.Metadata.GetMetadata<Microsoft.AspNetCore.RateLimiting.EnableRateLimitingAttribute>()?.PolicyName == CustomerRegistrationOptions.RatePolicy
                        ? "customer-registration" : "other",
                    key => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = key == "customer-registration" ? customerRegistration.GlobalPermitLimit : int.MaxValue,
                        Window = TimeSpan.FromSeconds(customerRegistration.WindowSeconds), QueueLimit = 0
                    }));
            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new ApiResponse<object>(false, "Too many requests. Try again later.", null), cancellationToken);
            };
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(AuthDefinitions.LoginRatePolicy, context =>
            {
                var clientAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(clientAddress, _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = securityOptions.LoginPermitLimit,
                        Window = TimeSpan.FromSeconds(securityOptions.LoginWindowSeconds),
                        QueueLimit = 0
                    });
            });
        });

        return services;
    }

    public static IServiceCollection AddPayOsRateLimiting(
        this IServiceCollection services,
        PayOsOptions payOs)
    {
        services.AddRateLimiter(options =>
        {
            options.AddPolicy(PayOsOptions.RatePolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = payOs.PermitLimit,
                        Window = TimeSpan.FromSeconds(payOs.WindowSeconds), QueueLimit = 0
                    }));
        });

        return services;
    }

    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.OperationFilter<SwaggerResponses>();
            options.SchemaFilter<BusinessValueSchemaFilter>();
            var xmlFile = $"{typeof(Program).Assembly.GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            options.IncludeXmlComments(xmlPath);
            options.OperationFilter<SwaggerOperationDocumentation>();
            options.OperationFilter<SwaggerBusinessGroups>();
            options.DocumentFilter<SwaggerBusinessGroups>();
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "ChocoRobot API Documentation",
                Version = "v1",
                Description = "Chocolate Plate Customization and Ordering System"
            });
            options.CustomSchemaIds(type => type.FullName!.Replace('+', '.'));
            options.AddSecurityDefinition(AuthDefinitions.BearerScheme, new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT"
            });
        });

        return services;
    }
}




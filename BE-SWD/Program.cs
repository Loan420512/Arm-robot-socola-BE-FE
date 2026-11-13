using ChocoRobot.Configuration;
using ChocoRobot.Extensions;
using ChocoRobot.Middleware;
using ChocoRobot.Services;

// 1. Khởi tạo ứng dụng và các nguồn cấu hình theo môi trường.
LoadDotEnv(System.IO.Path.Combine(AppContext.BaseDirectory, ".env"));
LoadDotEnv(System.IO.Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".env"));
var builder = WebApplication.CreateBuilder(args);
var templateImages = builder.BindValidatedOptions<TemplateImageOptions>(TemplateImageOptions.Section);
builder.Services.AddScoped<TemplateImageService>();
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
    options.MultipartBodyLengthLimit = templateImages.MaxFileBytes + 65536L);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = templateImages.MaxFileBytes + 65536L);
var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(renderPort))
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");

// 2. Đọc và kiểm tra cấu hình; không sử dụng khóa bí mật mặc định.
var jwtOptions = builder.BindValidatedOptions<JwtOptions>(JwtOptions.Section);
var customerRegistration = builder.BindValidatedOptions<CustomerRegistrationOptions>(CustomerRegistrationOptions.Section);
builder.Services.AddSingleton<CustomerRegistrationGuard>();
var securityOptions = builder.BindValidatedOptions<SecurityOptions>(SecurityOptions.Section);
builder.BindValidatedOptions<ReportingOptions>(ReportingOptions.Section);
var payOsSection = builder.Configuration.GetSection(PayOsOptions.Section);
var payOsOptions = payOsSection.Get<PayOsOptions>() ?? new PayOsOptions();
if (payOsOptions.PermitLimit <= 0) payOsOptions.PermitLimit = 10;
if (payOsOptions.WindowSeconds <= 0) payOsOptions.WindowSeconds = 60;
builder.Services.AddSingleton(Microsoft.Extensions.Options.Options.Create(payOsOptions));
builder.Services.AddScoped<PayOsService>();
builder.Services.AddHttpClient();
builder.Services.AddPayOsRateLimiting(payOsOptions);

// 3. Kết nối SQL Server, không tự tạo database hoặc chạy migration.
builder.Services.AddDatabaseServices(builder.Configuration);

// 4. Đăng ký Repository và Service theo phạm vi mỗi request.
builder.Services.AddApplicationServices();

// 5. Đăng ký Controller và chuẩn hóa phản hồi validation.
builder.Services.AddApiControllers();

// 6. Xác thực JWT bằng cấu hình đã kiểm tra.
builder.Services.AddJwtAuthentication(jwtOptions);

// 7. Phân quyền Admin được khai báo tại các Controller.
builder.Services.AddAuthorization();

// 8. Chỉ cho phép các origin được cấu hình rõ ràng.
builder.Services.AddCorsPolicy(builder.Configuration);

// 9. Giới hạn số lần đăng nhập theo địa chỉ IP.
builder.Services.AddLoginRateLimiting(securityOptions, customerRegistration);

// 10. Sinh tài liệu Swagger từ Controller và DTO thật.
builder.Services.AddSwaggerDocumentation();

// 11. Hoàn tất đăng ký dịch vụ và khởi tạo ứng dụng.
var app = builder.Build();

// 12. Giữ đúng thứ tự xử lý lỗi, CORS, xác thực và phân quyền.
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.DocumentTitle = "ChocoRobot API Documentation";
        options.SwaggerEndpoint("v1/swagger.json", "ChocoRobot API v1");
    });
}

// Render terminates TLS and sets PORT. Redirecting inside the container loops.
if (!app.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PORT")))
{
    app.UseHttpsRedirection();
}
if (!app.Environment.IsDevelopment())
{
    var webAssets = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
    webAssets.Mappings[".glb"] = "model/gltf-binary";
    webAssets.Mappings[".gltf"] = "model/gltf+json";
    webAssets.Mappings[".gcode"] = "text/plain";
    app.UseDefaultFiles();
    app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = webAssets });
}
var imageDirectory = Path.GetFullPath(templateImages.StoragePath, app.Environment.ContentRootPath);
Directory.CreateDirectory(imageDirectory);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(imageDirectory),
    RequestPath = templateImages.RequestPath,
    ContentTypeProvider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider(
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { [".png"] = "image/png", [".jpg"] = "image/jpeg" }),
    OnPrepareResponse = context => context.Context.Response.Headers["X-Content-Type-Options"] = "nosniff"
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
if (!app.Environment.IsDevelopment())
    app.MapFallbackToFile("index.html");

// 13. Chỉ tạo Admin ban đầu khi bảng còn trống.
if (!string.IsNullOrWhiteSpace(builder.Configuration["Bootstrap:Username"]))
{
    using var scope = app.Services.CreateScope();
    var authService = scope.ServiceProvider.GetRequiredService<AuthService>();
    await authService.Seed();
}

// 14. Bắt đầu nhận request.
app.Run();

public partial class Program
{
    static void LoadDotEnv(string path)
    {
        string fullPath;
        try { fullPath = System.IO.Path.GetFullPath(path); }
        catch { return; }
        if (!System.IO.File.Exists(fullPath)) return;
        foreach (var rawLine in System.IO.File.ReadAllLines(fullPath))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;
            var separator = line.IndexOf('=');
            if (separator <= 0) continue;
            var key = line[..separator].Trim();
            var value = line[(separator + 1)..].Trim().Trim('"');
            if (!string.IsNullOrEmpty(key) && System.Environment.GetEnvironmentVariable(key) is null)
                System.Environment.SetEnvironmentVariable(key, value);
        }
    }
}



using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using ChocoRobot.Common;
using ChocoRobot.Data;
using ChocoRobot.Helpers;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

if (args.Contains("--staff-checks") || args.Contains("--staff-checks-sql"))
{
    await StaffChecks.Run(args.Contains("--staff-checks-sql"));
    return;
}

int AvailablePort()
{
    var listener = new TcpListener(IPAddress.Loopback, 0);
    listener.Start();
    var port = ((IPEndPoint)listener.LocalEndpoint).Port;
    listener.Stop();
    return port;
}

var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../"));
var apiAssemblyArgument = Array.IndexOf(args, "--api-assembly");
var apiAssemblyPath = apiAssemblyArgument >= 0
    ? Path.GetFullPath(args[apiAssemblyArgument + 1])
    : Path.Combine(repoRoot, "BE-SWD/bin/Debug/net8.0/BE-SWD.dll");
var configuration = new ConfigurationBuilder().AddJsonFile(Path.Combine(repoRoot, "BE-SWD/appsettings.json")).Build();
var snapshotArgument = Array.IndexOf(args, "--snapshot-directory");
var snapshotDirectory = snapshotArgument >= 0 ? Path.GetFullPath(args[snapshotArgument + 1]) : null;
if (snapshotDirectory is not null)
    Directory.CreateDirectory(snapshotDirectory);
var testUrl = new UriBuilder(Uri.UriSchemeHttp, IPAddress.Loopback.ToString(), AvailablePort()).Uri;
var failureConnection = new SqlConnectionStringBuilder
{
    DataSource = $"{IPAddress.Loopback},{AvailablePort()}",
    InitialCatalog = DatabaseDefinitions.Name,
    IntegratedSecurity = true,
    TrustServerCertificate = true,
    ConnectTimeout = 1
}
.ConnectionString;
int passed = 0;
void Check(bool ok, string name)
{
    if (!ok)
        throw new Exception("FAIL: " + name);
    Console.WriteLine("PASS: " + name);
    passed++;
}

Check(Workflow.CanTransition("Pending", "Processing"), "Confirm Pending order");
Check(Workflow.CanTransition("Processing", "Cancelled"), "Cancel reserved order");
Check(!Workflow.CanTransition("Completed", "Pending"), "Completed is terminal");
Check(!Workflow.CanTransition("Processing", "Processing"), "Repeated transition cannot deduct stock twice");
Check(!Workflow.CanTransition("Cancelled", "Processing"), "Cancelled is terminal");
Check(!Workflow.CanTransition("Pending", "Completed"), "Cannot skip processing");
Check(
Workflow.CanTransitionIncident(StatusValues.Open, StatusValues.InProgress),
 "Incident can enter investigation"
);
Check(
!Workflow.CanTransitionIncident(StatusValues.Resolved, StatusValues.Open),
 "Resolved incident cannot reopen arbitrarily"
);
Check(
!Workflow.CanTransition(StatusValues.Pending, StatusValues.Approved),
 "Refund status is not an order status"
);
var options = new DbContextOptionsBuilder<ChocoRobotDbContext>().UseSqlServer(failureConnection).Options;
using (var db = new ChocoRobotDbContext(options))
{
    Check(db.Model.GetEntityTypes().Count() == 13, "Exactly 13 mapped tables");
    Check(
db.Model.FindEntityType(typeof(Admin))!.FindProperty("PasswordHash")!.GetColumnName() == "password_hash",
 "SQL column mapping"
);
    Check(
db.Model.FindEntityType(typeof(Payment))!.GetIndexes().Any(x => x.IsUnique && x.Properties.Single().Name == "OrderId"),
 "Payment order uniqueness"
);
    Check(
db.Model.FindEntityType(typeof(RefundTransaction))!.GetIndexes().Any(x => x.IsUnique && x.Properties.Single().Name == "PaymentId"),
 "Refund payment uniqueness"
);
    Check(
db.Model.FindEntityType(typeof(PlateColor))!.FindProperty("ColorName")!.IsNullable == false,
 "Required color name"
);
    Check(
db.Model.FindEntityType(typeof(Admin))!.FindProperty("Username")!.IsNullable,
 "Preserved nullable admin username"
);
    Check(
db.Model.GetEntityTypes().SelectMany(x => x.GetForeignKeys()).All(x => x.DeleteBehavior == DeleteBehavior.NoAction),
 "No cascading deletes"
);
    var schema = db.Database.GenerateCreateScript(); // Generate SQL text only; never execute it.
    if (snapshotDirectory is not null)
        File.WriteAllText(Path.Combine(snapshotDirectory, "schema.sql"), schema);
    Check(
schema.Contains(SchemaChecks.In("status", BusinessValueSet.OrderStatuses)),
 "SQL order constraint uses centralized catalogue"
);
    Check(
schema.Contains(SchemaChecks.In("payment_status", BusinessValueSet.PaymentStatuses)),
 "SQL payment constraint uses centralized catalogue"
);
    Check(
schema.Contains(SchemaChecks.In("role", BusinessValueSet.Roles)),
 "SQL role constraint uses Admin-only catalogue"
);
}

var errors = new List<ValidationResult>();
var color = new ChocoRobot.DTOs.PlateColor.CreateRequest
{
    ColorName = "Pink",
    ColorCode = "pink",
    IsActive = true
};
Check(!Validator.TryValidateObject(color, new ValidationContext(color), errors, true), "Invalid HEX rejected");
color.ColorCode = "#FFC0CB";
errors.Clear();
Check(Validator.TryValidateObject(color, new ValidationContext(color), errors, true), "Valid HEX accepted");
var hash = BCrypt.Net.BCrypt.HashPassword(Convert.ToBase64String(RandomNumberGenerator.GetBytes(20)));
Check(hash.StartsWith("$2"), "BCrypt hash format");
// Real HTTP pipeline tests with a random test-only signing key; no database substitute.
var useDevelopmentSecrets = args.Contains("--development-user-secrets");
var secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
if (useDevelopmentSecrets)
{
    var secretId = XDocument.Load(Path.Combine(repoRoot, "BE-SWD/BE-SWD.csproj")).Descendants("UserSecretsId").Single().Value;
    var secretsFile = Path.Combine(
Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
 "Microsoft",
 "UserSecrets",
 secretId,
 "secrets.json"
);
    using var stored = JsonDocument.Parse(File.ReadAllText(secretsFile));
    secret = stored.RootElement.TryGetProperty("Jwt:Secret", out var flatSecret) ? flatSecret.GetString()! : stored.RootElement.GetProperty("Jwt").GetProperty("Secret").GetString()!;
}

var start = new ProcessStartInfo("dotnet")
{
    WorkingDirectory = Path.Combine(repoRoot, "BE-SWD"),
    UseShellExecute = false,
    CreateNoWindow = true,
    RedirectStandardOutput = true,
    RedirectStandardError = true
};
start.ArgumentList.Add(apiAssemblyPath);
start.Environment.Remove("Jwt__Secret");
start.Environment.Remove("Jwt:Secret");
if (!useDevelopmentSecrets)
    start.Environment["Jwt__Secret"] = secret;
start.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
start.Environment["DOTNET_ENVIRONMENT"] = "Development";
start.Environment["ASPNETCORE_URLS"] = testUrl.ToString();
start.Environment["Bootstrap__Username"] = "";
start.Environment["ConnectionStrings__DefaultConnection"] = failureConnection;
using var process = Process.Start(start)!;
process.BeginOutputReadLine();
process.BeginErrorReadLine();
try
{
    using var client = new HttpClient
    {
        BaseAddress = testUrl,
        Timeout = TimeSpan.FromSeconds(15)
    };
    bool ready = false;
    for (int i = 0; i < 160; i++)
    {
        try
        {
            if ((await client.GetAsync("/swagger/index.html")).IsSuccessStatusCode)
            {
                ready = true;
                break;
            }
        }
        catch (HttpRequestException)
        {
        }

        await Task.Delay(250);
    }

    Check(ready, "Swagger UI serves HTTP");
    if (useDevelopmentSecrets)
        Check(
!start.Environment.ContainsKey("Jwt__Secret") && !start.Environment.ContainsKey("Jwt:Secret"),
 "Development startup loads JWT secret from User Secrets without an environment override"
);
    var spec = await client.GetStringAsync("/swagger/v1/swagger.json");
    using var json = JsonDocument.Parse(spec);
    var paths = json.RootElement.GetProperty("paths");
    if (snapshotDirectory is not null)
        File.WriteAllText(Path.Combine(snapshotDirectory, "openapi.json"), spec);
    Check(paths.EnumerateObject().Count() >= 40, "All module paths appear in OpenAPI");
    Check(!spec.Contains("passwordHash", StringComparison.OrdinalIgnoreCase), "Swagger excludes password hashes");
    var expectedTags = new[]
    {
        "admin.auth", "admin.admins", "admin.customers", "admin.staff", "admin.plate-types",
        "admin.plate-colors", "admin.plates", "admin.choco-templates", "admin.template-elements",
        "admin.orders", "admin.payments", "admin.refunds", "admin.incident-reports",
        "admin.cash-flow-audits", "admin.dashboard"
    };
    var declaredTags = json.RootElement.GetProperty("tags").EnumerateArray()
        .Select(tag => tag.GetProperty("name").GetString());
    Check(declaredTags.SequenceEqual(expectedTags), "Swagger groups follow the requested admin.xxx order");
    Check(json.RootElement.GetProperty("info").GetProperty("title").GetString() == "ChocoRobot API Documentation",
        "Swagger documentation title is configured");

    foreach (var documentedPath in paths.EnumerateObject())
    {
        var resource = documentedPath.Name.Split('/')[2];
        var expectedTag = resource == "admin" ? SwaggerGroups.Admins : "admin." + resource;

        foreach (var documentedMethod in documentedPath.Value.EnumerateObject())
        {
            var operation = documentedMethod.Value;
            var endpoint = documentedMethod.Name.ToUpperInvariant() + " " + documentedPath.Name;
            Check(operation.TryGetProperty("summary", out var summary) && !string.IsNullOrWhiteSpace(summary.GetString()),
                "Non-empty Swagger summary: " + endpoint);
            Check(operation.TryGetProperty("description", out var description)
                && !string.IsNullOrWhiteSpace(description.GetString()), "Non-empty Swagger description: " + endpoint);
            Check(operation.GetProperty("tags").EnumerateArray().Single().GetString() == expectedTag,
                "Correct Swagger group: " + endpoint);
            Check(operation.GetProperty("responses").EnumerateObject().Any(response => response.Name.StartsWith('2')),
                "Success status documented: " + endpoint);

            if (operation.TryGetProperty("parameters", out var parameters))
            {
                Check(parameters.EnumerateArray().All(parameter => parameter.TryGetProperty("description", out var text)
                    && !string.IsNullOrWhiteSpace(text.GetString())), "Parameters described: " + endpoint);
            }
        }
    }

    Check(paths.GetProperty("/api/auth/change-password").GetProperty("post").GetProperty("responses")
        .TryGetProperty("204", out _), "Password change documents its actual 204 response");
    var loginDocumentation = paths.GetProperty("/api/auth/login").GetProperty("post");
    Check(!loginDocumentation.TryGetProperty("security", out var loginSecurity)
        || loginSecurity.GetArrayLength() == 0, "Anonymous login is not marked as requiring JWT");
    Check(paths.GetProperty("/api/admin").GetProperty("get").GetProperty("security")[0]
        .TryGetProperty(AuthDefinitions.BearerScheme, out _), "Protected endpoints document their JWT requirement");
    Check(!loginDocumentation.GetProperty("responses").GetProperty("400").GetProperty("content")
        .GetProperty("application/json").GetProperty("example").GetProperty("success").GetBoolean(),
        "Swagger failure examples show success false");
    var schemas = json.RootElement.GetProperty("components").GetProperty("schemas");
    Check(!schemas.GetProperty(typeof(ChocoRobot.DTOs.Staff.CreateRequest).FullName!).GetProperty("properties")
        .TryGetProperty("adminId", out _), "Swagger staff create excludes adminId");
    var paymentSchema = schemas.GetProperty(typeof(ChocoRobot.DTOs.Payment.CreateRequest).FullName!);
    Check(
paymentSchema.GetProperty("properties").GetProperty("paymentMethod").GetProperty("enum").EnumerateArray()
.Select(x => x.GetString())
.SequenceEqual(BusinessValues.Methods),
 "Swagger payment methods match DTO validation"
);
    Check(
paymentSchema.GetProperty("required").EnumerateArray().Any(x => x.GetString() == "cashReceivedConfirmed"),
 "Swagger requires explicit cash receipt confirmation"
);
    Check(
json.RootElement.GetProperty("components").GetProperty("securitySchemes").GetProperty(AuthDefinitions.BearerScheme)
.GetProperty("scheme")
.GetString() == "bearer",
 "Swagger has JWT Authorize"
);
    var methods = paths.EnumerateObject().SelectMany(p => p.Value.EnumerateObject().Select(m => m.Name)).ToHashSet();
    Check(
new[] { "get", "post", "put", "patch", "delete" }.All(methods.Contains),
 "Swagger retains all five HTTP methods"
);
    foreach (var p in paths.EnumerateObject().Where(p => p.Name != "/api/auth/login"))
    {
        foreach (var method in p.Value.EnumerateObject().Select(x => x.Name))
        {
            using var req = new HttpRequestMessage(new HttpMethod(method), p.Name.Replace("{id}", "1"));
            var response = await client.SendAsync(req);
            Check(response.StatusCode == HttpStatusCode.Unauthorized, "Anonymous blocked: " + method + " " + p.Name);
        }
    }

    Check(
(await client.PostAsJsonAsync("/api/auth/login", new
{
})).StatusCode == HttpStatusCode.BadRequest,
 "Login required fields validated before SQL"
);
    var testSubject = RandomNumberGenerator.GetInt32(1, int.MaxValue).ToString(); // Validation tests never load this test-only subject from SQL.
    string Token(string role, DateTime expiry) => new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
configuration["Jwt:Issuer"],
 configuration["Jwt:Audience"],
 new[] { new Claim(ClaimTypes.NameIdentifier, testSubject), new Claim(ClaimTypes.Role, role) },
 expires: expiry,
 signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256)
));
    client.DefaultRequestHeaders.Authorization = new("Bearer", Token("Guest", DateTime.UtcNow.AddMinutes(5)));
    Check((await client.GetAsync("/api/plates")).StatusCode == HttpStatusCode.Forbidden, "Non-Admin JWT rejected");
    client.DefaultRequestHeaders.Authorization = new("Bearer", Token("Admin", DateTime.UtcNow.AddMinutes(-1)));
    Check((await client.GetAsync("/api/plates")).StatusCode == HttpStatusCode.Unauthorized, "Expired JWT rejected");
    client.DefaultRequestHeaders.Authorization = new("Bearer", Token("Admin", DateTime.UtcNow.AddMinutes(5)));
    Check(
(await client.GetAsync("/api/plates?pageSize=0")).StatusCode == HttpStatusCode.BadRequest,
 "Authenticated pagination validation"
);
    Check(
(await client.PostAsJsonAsync("/api/plate-colors", new
{
    colorName = "Pink",
    colorCode = "bad",
    isActive = true
}))
.StatusCode == HttpStatusCode.BadRequest,
 "Authenticated HEX validation"
);
    var uploadOperation = paths.GetProperty("/api/choco-templates/upload-image").GetProperty("post");
    var uploadSchema = uploadOperation.GetProperty("requestBody").GetProperty("content").GetProperty("multipart/form-data").GetProperty("schema");
    Check(uploadSchema.GetProperty("properties").GetProperty("File").GetProperty("format").GetString() == "binary", "Swagger upload has a file chooser");
    async Task<HttpResponseMessage> Upload(byte[] bytes, string name, string mime)
    {
        using var form = new MultipartFormDataContent();
        var part = new ByteArrayContent(bytes);
        part.Headers.ContentType = new(mime);
        form.Add(part, "File", name);
        return await client.PostAsync("/api/choco-templates/upload-image", form);
    }
    using var sampleBitmap = new SkiaSharp.SKBitmap(2, 2);
    sampleBitmap.Erase(SkiaSharp.SKColors.Brown);
    using var sampleImage = SkiaSharp.SKImage.FromBitmap(sampleBitmap);
    foreach (var format in new[] { SkiaSharp.SKEncodedImageFormat.Png, SkiaSharp.SKEncodedImageFormat.Jpeg })
    {
        using var sampleData = sampleImage.Encode(format, 90);
        var png = format == SkiaSharp.SKEncodedImageFormat.Png;
        var bytes = sampleData.ToArray();
        var uploaded = await Upload(bytes, png ? "sample.png" : "sample.jpg", png ? "image/png" : "image/jpeg");
        Check(uploaded.StatusCode == HttpStatusCode.OK, "Valid image upload: " + format);
        using var uploadedBody = JsonDocument.Parse(await uploaded.Content.ReadAsStringAsync());
        var imageUrl = uploadedBody.RootElement.GetProperty("data").GetProperty("imagePreviewUrl").GetString()!;
        var downloaded = await client.GetAsync(imageUrl);
        Check(downloaded.IsSuccessStatusCode && downloaded.Content.Headers.ContentType?.MediaType == (png ? "image/png" : "image/jpeg"), "Uploaded image URL serves correct format: " + format);
        Check((await Upload(bytes, png ? "wrong.jpg" : "wrong.png", png ? "image/jpeg" : "image/png")).StatusCode == HttpStatusCode.BadRequest, "Mismatched image content rejected: " + format);
    }
    Check((await Upload([], "empty.png", "image/png")).StatusCode == HttpStatusCode.BadRequest, "Empty image rejected");
    Check((await Upload(Encoding.UTF8.GetBytes("<script>alert(1)</script>"), "fake.png", "image/png")).StatusCode == HttpStatusCode.BadRequest, "Spoofed PNG rejected");
    Check((await Upload(new byte[5242881], "large.png", "image/png")).StatusCode == HttpStatusCode.BadRequest, "Oversized image rejected");
    client.DefaultRequestHeaders.Authorization = new("Bearer", Token("Guest", DateTime.UtcNow.AddMinutes(5)));
    Check((await Upload([1], "file.png", "image/png")).StatusCode == HttpStatusCode.Forbidden, "Only Admin may upload images");
    client.DefaultRequestHeaders.Authorization = new("Bearer", Token("Admin", DateTime.UtcNow.AddMinutes(5)));
    Check((await client.PostAsJsonAsync("/api/staff", new
    {
        fullName = "Validation check", employeeCode = Guid.NewGuid().ToString("N"),
        phone = "0901234567", position = "Designer", isActive = true
    })).StatusCode == HttpStatusCode.InternalServerError,
        "Staff POST without adminId passes validation and reaches unavailable SQL");
    var orderStatusSchema = schemas.GetProperty(typeof(ChocoRobot.DTOs.Order.StatusRequest).FullName!);
    Check(
orderStatusSchema.GetProperty("properties").GetProperty("status").GetProperty("enum").EnumerateArray().Select(x => x.GetString())
.SequenceEqual(BusinessValues.OrderStatuses),
 "Swagger order status catalogue matches runtime"
);
    Check(
(await client.PatchAsJsonAsync("/api/orders/" + testSubject + "/status", new
{
    status = StatusValues.Approved
}))
.StatusCode == HttpStatusCode.BadRequest,
 "Cross-module order status rejected before SQL"
);
    Check(
(await client.PatchAsJsonAsync("/api/incident-reports/" + testSubject + "/status", new
{
    status = StatusValues.Completed
}))
.StatusCode == HttpStatusCode.BadRequest,
 "Cross-module incident status rejected before SQL"
);
    Check(
(await client.PostAsJsonAsync("/api/payments", new
{
    orderId = int.Parse(testSubject),
    amount = 1,
    paymentMethod = PaymentMethods.Cash
}))
.StatusCode == HttpStatusCode.BadRequest,
 "Cash payment without receipt confirmation rejected before SQL"
);
    Check(
(await client.PostAsJsonAsync(
"/api/payments",
 new
 {
     orderId = int.Parse(testSubject),
     amount = 1,
     paymentMethod = PaymentMethods.Cash,
     cashReceivedConfirmed = false
 }
))
.StatusCode == HttpStatusCode.BadRequest,
 "Unreceived cash cannot become a successful payment"
);
    Check(
(await client.PostAsJsonAsync(
"/api/payments",
 new
 {
     orderId = int.Parse(testSubject),
     amount = 1,
     paymentMethod = "unsupported",
     cashReceivedConfirmed = true
 }
))
.StatusCode == HttpStatusCode.BadRequest,
 "Unknown payment method rejected before SQL"
);
    Check(
(await client.PatchAsJsonAsync("/api/plate-colors/" + testSubject + "/status", new
{
})).StatusCode == HttpStatusCode.BadRequest,
 "Missing active flag cannot silently disable a color"
);
    var failure = await client.PostAsJsonAsync(
"/api/auth/login",
 new
 {
     username = "unavailable",
     password = Convert.ToBase64String(RandomNumberGenerator.GetBytes(20))
 }
);
    var failureBody = await failure.Content.ReadAsStringAsync();
    Check(failure.StatusCode == HttpStatusCode.InternalServerError, "SQL connection failure mapped to 500");
    Check(
!failureBody.Contains("Server=") && !failureBody.Contains("SqlException") && failureBody.Contains("traceId"),
 "Database errors do not expose connection or stack trace"
);
    Check(
(await client.GetAsync("/api/plates")).StatusCode == HttpStatusCode.InternalServerError,
 "Plate list fails on unavailable SQL instead of returning fake products"
);
    var dashboardFailure = await client.GetAsync("/api/dashboard/overview");
    using var dashboardEnvelope = JsonDocument.Parse(await dashboardFailure.Content.ReadAsStringAsync());
    Check(
dashboardFailure.StatusCode == HttpStatusCode.InternalServerError && !dashboardEnvelope.RootElement.GetProperty("success").GetBoolean() && dashboardEnvelope.RootElement.GetProperty("data").ValueKind == JsonValueKind.Null,
 "Dashboard fails on unavailable SQL instead of returning fixed statistics"
);
    async Task<bool> RejectsConfiguration(string key, string value, string expectedMessage)
    {
        var invalid = new ProcessStartInfo(start.FileName)
        {
            WorkingDirectory = start.WorkingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        foreach (var argument in start.ArgumentList)
            invalid.ArgumentList.Add(argument);
        foreach (var environment in start.Environment)
            invalid.Environment[environment.Key] = environment.Value;
        invalid.Environment[key] = value;
        using var child = Process.Start(invalid)!;
        var output = child.StandardOutput.ReadToEndAsync();
        var error = child.StandardError.ReadToEndAsync();
        try
        {
            await child.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(10));
        }
        catch (TimeoutException)
        {
            child.Kill(true);
            return false;
        }

        return child.ExitCode != 0 && ((await output) + (await error)).Contains(expectedMessage, StringComparison.OrdinalIgnoreCase);
    }

    Check(
await RejectsConfiguration("ConnectionStrings__DefaultConnection", "", "ConnectionStrings__DefaultConnection"),
 "Missing SQL configuration fails startup without fallback"
);
    Check(
await RejectsConfiguration("Jwt__Secret", "", "Secret"),
 "Missing JWT secret fails startup without fallback"
);
    Check(
await RejectsConfiguration("Jwt__Secret", "short", "at least 32 bytes"),
 "Short JWT secret rejected at startup"
);
    var wrongDatabase = new SqlConnectionStringBuilder(failureConnection)
    {
        InitialCatalog = Guid.NewGuid().ToString("N")
    };
    Check(
await RejectsConfiguration("ConnectionStrings__DefaultConnection", wrongDatabase.ConnectionString, "database must be ChocoRobotDB"),
 "Accidental database target rejected before connecting"
);
    Check(
await RejectsConfiguration("Cors__Origins__0", "*", "explicit HTTP(S) origins"),
 "Wildcard CORS configuration rejected"
);
    Console.WriteLine($"RESULT: {passed} checks passed. SQL CRUD not tested: requires configured SQL Server.");
}
finally
{
    if (!process.HasExited)
        process.Kill(true);
}





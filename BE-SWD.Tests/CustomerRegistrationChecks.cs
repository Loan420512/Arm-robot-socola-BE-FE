using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ChocoRobot.Data;
using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

internal static class CustomerRegistrationChecks
{
    public static async Task Run()
    {
        static void Check(bool ok, string message)
        {
            if (!ok) throw new Exception("FAIL: " + message);
            Console.WriteLine("PASS: " + message);
        }
        var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../"));
        var configuration = new ConfigurationBuilder().AddJsonFile(Path.Combine(root, "BE-SWD/appsettings.json"))
            .AddEnvironmentVariables().Build();
        using var db = new ChocoRobotDbContext(new DbContextOptionsBuilder<ChocoRobotDbContext>()
            .UseSqlServer(configuration.GetConnectionString("DefaultConnection")).Options);
        var customerType = db.Model.FindEntityType(typeof(Customer))!;
        Check(customerType.FindProperty(nameof(Customer.CreatedAt))!.GetDefaultValueSql() == "GETDATE()",
            "CUSTOMER.created_at retains SQL default");
        Check(db.Model.GetEntityTypes().Count() == 13 && db.Model.FindEntityType(typeof(Order))!.GetForeignKeys()
            .Any(fk => fk.PrincipalEntityType.ClrType == typeof(Customer)), "13 tables and ORDER customer relation retained");
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        var secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        var start = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = Path.Combine(root, "BE-SWD"), UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardOutput = true, RedirectStandardError = true
        };
        start.ArgumentList.Add(Path.Combine(AppContext.BaseDirectory, "BE-SWD.dll"));
        start.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
        start.Environment["DOTNET_ENVIRONMENT"] = "Development";
        start.Environment["ASPNETCORE_URLS"] = $"http://127.0.0.1:{port}";
        start.Environment["Jwt__Secret"] = secret;
        start.Environment["Bootstrap__Username"] = "";
        using var process = Process.Start(start)!;
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        using var client = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}"), Timeout = TimeSpan.FromSeconds(30) };
        var unique = Guid.NewGuid().ToString("N");
        var email = unique + "@example.invalid";
        var name = "Registration test " + unique;
        int? createdId = null;
        try
        {
            var ready = false;
            for (int attempt = 0; attempt < 100; attempt++)
            {
                try { if ((await client.GetAsync("/swagger/v1/swagger.json")).IsSuccessStatusCode) { ready = true; break; } }
                catch (HttpRequestException) { }
                await Task.Delay(200);
            }
            Check(ready, "Live SQL test API ready");
            var contact = new { fullName = name, phone = "0901234567", email };
            using var response = await client.PostAsJsonAsync("/api/customers", contact);
            Check(response.StatusCode == HttpStatusCode.Created, "Anonymous customer POST saves successfully to SQL without JWT");
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = body.RootElement.GetProperty("data");
            createdId = data.GetProperty("customerId").GetInt32();
            Check(data.EnumerateObject().Count() == 1 && !body.RootElement.ToString().Contains(email)
                && response.Headers.CacheControl?.NoStore == true && response.Headers.Location is null,
                "Public response returns only customerId, no PII, credential or private Location");
            var saved = await db.Set<Customer>().AsNoTracking().SingleAsync(c => c.Id == createdId);
            Check(saved.FullName == name && saved.Email == email && saved.CreatedAt.HasValue,
                "SQL generates identity and created_at while preserving submitted contact fields");
            Check((await client.GetAsync("/api/admin/customers/" + createdId)).StatusCode == HttpStatusCode.Unauthorized,
                "Submitting contacts grants no access to customer details");
            Check((await client.PostAsJsonAsync("/api/customers", contact)).StatusCode == HttpStatusCode.TooManyRequests,
                "Duplicate contact cooldown works after successful insert");
            Check(await db.Set<Customer>().CountAsync(c => c.Email == email) == 1, "Repeated submission creates no extra row");
            var token = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
                configuration["Jwt:Issuer"], configuration["Jwt:Audience"],
                new[] { new Claim(ClaimTypes.Role, "Admin"), new Claim(ClaimTypes.NameIdentifier, RandomNumberGenerator.GetInt32(1, int.MaxValue).ToString()) },
                expires: DateTime.UtcNow.AddMinutes(5), signingCredentials: new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256)));
            client.DefaultRequestHeaders.Authorization = new("Bearer", token);
            Check((await client.GetAsync("/api/admin/customers")).IsSuccessStatusCode, "Admin JWT can list customers");
            Check((await client.GetAsync("/api/admin/customers/" + createdId)).IsSuccessStatusCode, "Admin JWT can read customer details");
            Check((await client.PutAsJsonAsync("/api/admin/customers/" + createdId, contact)).IsSuccessStatusCode,
                "Admin JWT can update the test customer");
            Check((await client.DeleteAsync("/api/admin/customers/" + createdId)).StatusCode == HttpStatusCode.NoContent,
                "Admin JWT can delete the newly created test customer");
            Check(!await db.Set<Customer>().AnyAsync(c => c.Id == createdId), "New test customer removed");
        }
        finally
        {
            // Cleanup is restricted to the newly created, uniquely marked test contact.
            if (createdId.HasValue)
                await db.Set<Customer>().Where(c => c.Id == createdId && c.Email == email && c.FullName == name).ExecuteDeleteAsync();
            if (!process.HasExited) process.Kill(true);
        }
    }
}

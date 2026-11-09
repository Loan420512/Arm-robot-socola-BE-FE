using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using ChocoRobot.Common;
using ChocoRobot.Configuration;
using ChocoRobot.Data;
using ChocoRobot.Models.Entities;
using ChocoRobot.Repositories;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;

internal static class StaffChecks
{
    public static async Task Run(bool sql = false)
    {
        static void Check(bool ok, string message)
        {
            if (!ok) throw new Exception("FAIL: " + message);
            Console.WriteLine("PASS: " + message);
        }
        var request = new ChocoRobot.DTOs.Staff.CreateRequest
        {
            FullName = "Staff validation", EmployeeCode = Guid.NewGuid().ToString("N"),
            Phone = "0901234567", Position = "Designer", IsActive = true
        };
        Check(typeof(ChocoRobot.DTOs.Staff.CreateRequest).GetProperty("AdminId") is null, "CreateRequest excludes adminId");
        Check(Validator.TryValidateObject(request, new ValidationContext(request), new List<ValidationResult>(), true), "Staff request valid without adminId");
        Check(typeof(ChocoRobot.DTOs.Staff.UpdateRequest).GetProperty("AdminId") is not null, "Existing update contract retained");
        var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../"));
        var configuration = new ConfigurationBuilder().AddJsonFile(Path.Combine(root, "BE-SWD/appsettings.json"))
            .AddEnvironmentVariables().Build();
        var connection = configuration.GetConnectionString("DefaultConnection")!;
        using var db = new ChocoRobotDbContext(new DbContextOptionsBuilder<ChocoRobotDbContext>()
            .UseSqlServer(connection).Options);
        var staffType = db.Model.FindEntityType(typeof(Staff))!;
        Check(staffType.FindPrimaryKey()!.Properties.Single().Name == nameof(Staff.Id)
            && staffType.FindProperty(nameof(Staff.Id))!.GetColumnName() == "id", "STAFF.id remains primary key");
        Check(staffType.FindProperty(nameof(Staff.AdminId))!.IsNullable
            && staffType.FindProperty(nameof(Staff.AdminId))!.GetColumnName() == "admin_id"
            && staffType.GetForeignKeys().Single().PrincipalEntityType.ClrType == typeof(Admin), "Nullable admin_id and original Admin FK retained");
        foreach (var type in new[] { typeof(ChocoTemplate), typeof(TemplateElement), typeof(IncidentReport) })
        {
            var fk = db.Model.FindEntityType(type)!.GetForeignKeys().Single(x => x.Properties.Single().Name == "StaffId");
            Check(fk.Properties.Single().GetColumnName() == "staff_id" && fk.PrincipalEntityType.ClrType == typeof(Staff)
                && fk.PrincipalKey.Properties.Single().Name == "Id", type.Name + ": staff_id references STAFF.id");
        }
        Check(db.Model.GetEntityTypes().Count() == 13, "Exactly 13 tables retained");
        if (sql)
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            var inserted = System.Text.Json.JsonSerializer.Deserialize<Staff>(System.Text.Json.JsonSerializer.Serialize(request))!;
            var liveRules = new BusinessRules(new BusinessRepository(db), new HttpContextAccessor(), Options.Create(new SecurityOptions()));
            await liveRules.Before(inserted, true, request);
            db.Add(inserted);
            await db.SaveChangesAsync();
            var persisted = await db.Set<Staff>().AsNoTracking().SingleAsync(x => x.Id == inserted.Id);
            Check(persisted.AdminId is null && persisted.Id == inserted.Id, "SQL insert generates STAFF.id and stores admin_id NULL");
            await transaction.RollbackAsync();
            db.ChangeTracker.Clear();
        }
        var staff = new Staff { Id = RandomNumberGenerator.GetInt32(1, int.MaxValue), Position = request.Position };
        var template = new ChocoTemplate { Id = RandomNumberGenerator.GetInt32(1, int.MaxValue) };
        db.Attach(staff);
        db.Attach(template);
        var rules = new BusinessRules(new BusinessRepository(db), new HttpContextAccessor(), Options.Create(new SecurityOptions()));
        await rules.Before(staff, true, request);
        Check(staff.AdminId is null, "Staff creation leaves AdminId null and needs no Admin lookup");
        // FindAsync resolves the tracked STAFF and template without connecting to SQL.
        // No matching Admin is tracked; a lookup in ADMIN would fail this check.
        await rules.Before(new TemplateElement { StaffId = staff.Id, TemplateId = template.Id }, true, new object());
        Check(!db.ChangeTracker.Entries<Admin>().Any(), "TemplateElement validates staffId in STAFF without an Admin lookup");
    }
}



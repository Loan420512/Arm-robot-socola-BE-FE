using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ChocoRobot.Helpers;

[AttributeUsage(AttributeTargets.Class)]
public sealed class SwaggerGroupAttribute(string name) : Attribute
{
    public string Name { get; } = name;
}

// Thứ tự này là thứ tự hiển thị nhóm trong Swagger, không ảnh hưởng route.
public static class SwaggerGroups
{
    public const string Auth = "admin.auth";
    public const string Admins = "admin.admins";
    public const string Customers = "admin.customers";
    public const string Staff = "admin.staff";
    public const string PlateTypes = "admin.plate-types";
    public const string PlateColors = "admin.plate-colors";
    public const string Plates = "admin.plates";
    public const string ChocoTemplates = "admin.choco-templates";
    public const string TemplateElements = "admin.template-elements";
    public const string Orders = "admin.orders";
    public const string Payments = "admin.payments";
    public const string Refunds = "admin.refunds";
    public const string IncidentReports = "admin.incident-reports";
    public const string CashFlowAudits = "admin.cash-flow-audits";
    public const string Dashboard = "admin.dashboard";

    public static readonly IReadOnlyList<(string Name, string Description)> Ordered = Array.AsReadOnly(new[]
    {
        (Auth, "Admin authentication, current profile and password management."),
        (Admins, "Administrator accounts with the Admin role only."),
        (Customers, "Customer contact information and search."),
        (Staff, "Staff information and active status; staff do not have separate login accounts."),
        (PlateTypes, "Plate shapes, names and dimensions."),
        (PlateColors, "Admin-managed HEX colors and availability."),
        (Plates, "Plate catalog, pricing, color references and stock."),
        (ChocoTemplates, "Chocolate designs, preview images and G-code file references."),
        (TemplateElements, "Design element positions and scale."),
        (Orders, "Single-plate orders, customer references and controlled status transitions."),
        (Payments, "Recorded payments; cash requires explicit receipt confirmation."),
        (Refunds, "Refund requests and review decisions; approval does not execute a refund."),
        (IncidentReports, "Operational incidents and resolution status."),
        (CashFlowAudits, "Financial reconciliation based on recorded transactions."),
        (Dashboard, "Statistics calculated from the SQL Server data.")
    });
}

public sealed class SwaggerGroupOrderFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument document, DocumentFilterContext context)
    {
        document.Tags = SwaggerGroups.Ordered
            .Select(group => new OpenApiTag { Name = group.Name, Description = group.Description })
            .ToList();
    }
}

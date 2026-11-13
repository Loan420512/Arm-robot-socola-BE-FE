using ChocoRobot.Controllers;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ChocoRobot.Helpers;

// Documentation only: grouping never changes routing or authorization metadata.
public sealed class SwaggerBusinessGroups : IOperationFilter, IDocumentFilter
{
    public static readonly IReadOnlyList<(string Name, string Description, Type[] Controllers)> Groups =
        Array.AsReadOnly(new (string, string, Type[])[]
        {
            ("authentication", "Admin sign-in, current profile and password management.", [typeof(AuthController)]),
            ("admin-management", "Administrator accounts managed by authenticated Admins.", [typeof(AdminController)]),
            ("customer-management", "Public contact submission for ordering and Admin customer management. Submission does not verify identity or email/phone ownership. Access requirements are documented per endpoint.", [typeof(CustomerController), typeof(CustomerRegistrationController)]),
            ("staff-management", "Staff contact details, employee information and active status.", [typeof(StaffController)]),
            ("plate-type-management", "Plate types, shapes and dimensions.", [typeof(PlateTypeController)]),
            ("plate-color-management", "Plate colors, HEX codes and availability.", [typeof(PlateColorController)]),
            ("plate-management", "Plate catalog, prices, color references and stock.", [typeof(PlateController)]),
            ("chocolate-design-management", "Chocolate designs, preview image uploads and G-code references.", [typeof(ChocoTemplateController)]),
            ("design-element-management", "Chocolate design elements, positions and scale.", [typeof(TemplateElementController)]),
            ("order-management", "Customer orders and controlled order status transitions.", [typeof(OrderController)]),
            ("payment-management", "Payment records, explicit cash receipt confirmation and PayOS online checkout.", [typeof(PaymentController), typeof(PayOsCheckoutController)]),
            ("refund-management", "Refund requests and review decisions. Approval does not execute a refund.", [typeof(RefundTransactionController)]),
            ("incident-management", "Operational incidents, investigation and resolution status.", [typeof(IncidentReportController)]),
            ("cash-flow-audit-management", "Cash flow audits and financial reconciliation.", [typeof(CashFlowAuditController)]),
            ("dashboard-reports", "Dashboard statistics, revenue and operational reports calculated from stored data.", [typeof(DashboardController)])
        });

    public static string TagFor(Type controller) => Groups.Single(group => group.Controllers.Contains(controller)).Name;

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        operation.Tags = new List<OpenApiTag> { new() { Name = TagFor(context.MethodInfo.DeclaringType!) } };
    }

    public void Apply(OpenApiDocument document, DocumentFilterContext context)
    {
        document.Tags = Groups.Select(group => new OpenApiTag { Name = group.Name, Description = group.Description }).ToList();
    }
}

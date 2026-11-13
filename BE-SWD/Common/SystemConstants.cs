namespace ChocoRobot.Common;

public static class SystemRoles
{
    public const string Admin = "Admin";
}

// Các giá trị thuộc định nghĩa CHECK của SQL, không phải dữ liệu nghiệp vụ mẫu.
public static class StatusValues
{
    public const string Pending = "Pending";
    public const string Processing = "Processing";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string Success = "Success";
    public const string Failed = "Failed";
    public const string Refunded = "Refunded";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Open = "Open";
    public const string InProgress = "In Progress";
    public const string Resolved = "Resolved";
    public const string Matched = "Matched";
    public const string Discrepancy = "Discrepancy";
}

public static class PaymentMethods
{
    public const string Cash = "Cash";
    public const string PayOs = "PayOs";
    public const string VNPay = "VNPay";
    public const string Momo = "Momo";
    public const string ZaloPay = "ZaloPay";
}

public static class StaffPositions
{
    public const string Support = "Support";
    public const string Operator = "Operator";
    public const string Designer = "Designer";
}

public enum BusinessValueSet
{
    OrderStatuses,
    PaymentStatuses,
    RefundStatuses,
    IncidentStatuses,
    AuditStatuses,
    PaymentMethods,
    StaffPositions,
    Roles
}

public static class BusinessValues
{
    public static IReadOnlyList<string> For(BusinessValueSet set) => set switch
    {
        BusinessValueSet.OrderStatuses => OrderStatuses,
        BusinessValueSet.PaymentStatuses => PaymentStatuses,
        BusinessValueSet.RefundStatuses => RefundStatuses,
        BusinessValueSet.IncidentStatuses => IncidentStatuses,
        BusinessValueSet.AuditStatuses => AuditStatuses,
        BusinessValueSet.PaymentMethods => Methods,
        BusinessValueSet.StaffPositions => Positions,
        BusinessValueSet.Roles => Roles,
        _ => throw new ArgumentOutOfRangeException(nameof(set))
    };

    public static readonly IReadOnlyList<string> OrderStatuses = Array.AsReadOnly(new[]
    {
        StatusValues.Pending,
        StatusValues.Processing,
        StatusValues.Completed,
        StatusValues.Cancelled
    });

    public static readonly IReadOnlyList<string> PaymentStatuses = Array.AsReadOnly(new[]
    {
        StatusValues.Success,
        StatusValues.Failed,
        StatusValues.Refunded
    });

    public static readonly IReadOnlyList<string> RefundStatuses = Array.AsReadOnly(new[]
    {
        StatusValues.Pending,
        StatusValues.Approved,
        StatusValues.Rejected
    });

    public static readonly IReadOnlyList<string> IncidentStatuses = Array.AsReadOnly(new[]
    {
        StatusValues.Open,
        StatusValues.InProgress,
        StatusValues.Resolved
    });

    public static readonly IReadOnlyList<string> AuditStatuses = Array.AsReadOnly(new[]
    {
        StatusValues.Matched,
        StatusValues.Discrepancy
    });

    public static readonly IReadOnlyList<string> Methods = Array.AsReadOnly(new[]
    {
        PaymentMethods.Cash,
        PaymentMethods.PayOs,
        PaymentMethods.VNPay,
        PaymentMethods.Momo,
        PaymentMethods.ZaloPay
    });

    public static readonly IReadOnlyList<string> Positions = Array.AsReadOnly(new[]
    {
        StaffPositions.Support,
        StaffPositions.Operator,
        StaffPositions.Designer
    });
    public static readonly IReadOnlyList<string> Roles = Array.AsReadOnly(new[] { SystemRoles.Admin });
}

public static class ValidationRules
{
    public const string HexColorPattern = "^#[0-9a-fA-F]{6}$";
    public const int MinimumPasswordLength = 12;
    public const int MaximumPasswordBytes = 72;
    public const int MinimumJwtSecretBytes = 32;
    public const int MoneyScale = 2;
    public const double MaximumMoney = 9999999999999999d;
    public const int MaximumPageSize = 100;
    public const int DefaultPageSize = 10;
    public const int MaximumSearchLength = 200;
}

public static class ApiMessages
{
    public const string Retrieved = "Data retrieved successfully";
    public const string Created = "Created successfully";
    public const string Updated = "Updated successfully";
    public const string NotFound = "Record not found";
    public const string ValidationFailed = "Validation failed";
    public const string AuthenticationRequired = "Authentication required";
    public const string AccessDenied = "Access denied";
    public const string InvalidCredentials = "Invalid username or password";
}

public static class ApiRoutes
{
    public const string Prefix = "api/";
    public const string Admin = Prefix + "admin";
    public const string Auth = Prefix + "auth";
    public const string Customers = Prefix + "customers";
    public const string AdminCustomers = Prefix + "admin/customers";
    public const string Staff = Prefix + "staff";
    public const string PlateTypes = Prefix + "plate-types";
    public const string PlateColors = Prefix + "plate-colors";
    public const string Plates = Prefix + "plates";
    public const string ChocoTemplates = Prefix + "choco-templates";
    public const string TemplateElements = Prefix + "template-elements";
    public const string Orders = Prefix + "orders";
    public const string Payments = Prefix + "payments";
    public const string PayOsCheckout = Prefix + "checkout/payos";
    public const string PayOsRetry = Prefix + "checkout/payos/retry";
    public const string PayOsStatus = Prefix + "checkout/payos/status/{orderId:int}";
    public const string PayOsWebhook = Prefix + "webhooks/payos";
    public const string Refunds = Prefix + "refunds";
    public const string IncidentReports = Prefix + "incident-reports";
    public const string CashFlowAudits = Prefix + "cash-flow-audits";
    public const string Dashboard = Prefix + "dashboard";
    public const string ById = "{id:int}";
    public const string Status = ById + "/status";
    public const string Approve = ById + "/approve";
    public const string Reject = ById + "/reject";
    public const string ByColor = "by-color/" + ById;
    public const string ByType = "by-type/" + ById;
    public const string ByPlateType = "by-plate-type/" + ById;
    public const string ByTemplate = "by-template/" + ById;
    public const string ByCustomer = "by-customer/" + ById;
    public const string ByOrder = "by-order/" + ById;
    public const string Login = "login";
    public const string Me = "me";
    public const string ChangePassword = "change-password";
    public const string Overview = "overview";
    public const string Revenue = "revenue";
    public const string OrderStatistics = "orders-statistics";
    public const string TopPlates = "top-plates";
    public const string PaymentStatistics = "payment-statistics";
}

public static class AuthDefinitions
{
    public const string LoginRatePolicy = "AdminLogin";
    public const string BearerScheme = "Bearer";
    public const string UserIdClaim = "UserId";
    public const string UsernameClaim = "Username";
    public const string RoleClaim = "Role";
}

public static class DatabaseDefinitions
{
    public const string Name = "ChocoRobotDB";
    public const string ConnectionName = "DefaultConnection";
}


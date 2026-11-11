using System.Data;
using System.Security.Claims;
using System.Text;
using ChocoRobot.Configuration;
using ChocoRobot.Interfaces.Repositories;
using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ChocoRobot.Services;

public class BusinessRules(
    IBusinessRepository repository,
    IHttpContextAccessor httpContextAccessor,
    IOptions<SecurityOptions> securityOptions)
{
    public int UserId => int.Parse(
        httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public async Task<(
        string? TypeName,
        string? Shape,
        string? Dimensions,
        string? ColorName,
        string? ColorCode)> PlateDetails(Plate plate)
    {
        var plateType = await repository.Set<PlateType>()
            .AsNoTracking()
            .SingleOrDefaultAsync(type => type.Id == plate.TypeId);
        var plateColor = await repository.Set<PlateColor>()
            .AsNoTracking()
            .SingleOrDefaultAsync(color => color.Id == plate.ColorId);

        return (
            plateType?.TypeName,
            plateType?.Shape,
            plateType?.Dimensions,
            plateColor?.ColorName ?? plate.Color,
            plateColor?.ColorCode);
    }

    public async Task<TEntity> Find<TEntity>(int? id) where TEntity : class, IEntity
    {
        return await repository.Set<TEntity>().SingleOrDefaultAsync(entity => entity.Id == id)
            ?? throw new ApiException(400, $"Invalid {typeof(TEntity).Name} reference");
    }

    public async Task<TEntity> FindRecord<TEntity>(int id) where TEntity : class, IEntity
    {
        return await repository.Set<TEntity>().SingleOrDefaultAsync(entity => entity.Id == id)
            ?? throw new ApiException(404, ApiMessages.NotFound);
    }

    public async Task Before(IEntity entity, bool create, object request)
    {
        ValidateMoneyValues(entity);
        await ValidateForeignKeys(entity);

        switch (entity)
        {
            case Admin admin:
                await PrepareAdmin(admin, request);
                break;
            case Staff staff:
                Require(BusinessValues.Positions.Contains(staff.Position), "Invalid staff position");
                break;
            case PlateColor plateColor:
                await PreparePlateColor(plateColor, create);
                break;
            case Plate plate:
                var color = await Find<PlateColor>(plate.ColorId);
                plate.Color = color.ColorName;
                break;
            case Order order:
                await PrepareOrder(order, create);
                break;
            case Payment payment:
                await PreparePayment(payment, request);
                break;
            case RefundTransaction refund:
                await PrepareRefund(refund);
                break;
            case IncidentReport incident:
                PrepareIncident(incident, create);
                break;
            case CashFlowAudit audit:
                await PrepareCashFlowAudit(audit, request);
                break;
        }

        if (create && entity is ChocoTemplate template)
        {
            template.CreatedAt = DateTime.Now;
        }
    }

    private static void ValidateMoneyValues(IEntity entity)
    {
        var moneyProperties = entity.GetType().GetProperties()
            .Where(property => property.PropertyType == typeof(decimal?));

        foreach (var property in moneyProperties)
        {
            if (property.GetValue(entity) is not decimal amount)
            {
                continue;
            }

            var hasValidPrecision = decimal.Round(amount, ValidationRules.MoneyScale) == amount;
            Require(amount >= 0 && hasValidPrecision,
                "Money values must be non-negative with at most 2 decimal places");
        }
    }

    private async Task ValidateForeignKeys(IEntity entity)
    {
        // Kiểm tra cả FK tùy chọn khi request có cung cấp giá trị.
        var entityType = repository.Model.FindEntityType(entity.GetType())!;

        foreach (var foreignKey in entityType.GetForeignKeys())
        {
            var property = foreignKey.Properties.Single();
            var value = entity.GetType().GetProperty(property.Name)!.GetValue(entity);
            if (value is null)
            {
                continue;
            }

            var referencedType = foreignKey.PrincipalEntityType.ClrType;
            var referencedEntity = await repository.FindAsync(referencedType, new object[] { value });
            if (referencedEntity is null)
            {
                throw new ApiException(400, $"Invalid {property.Name}");
            }
        }
    }

    private async Task PrepareAdmin(Admin admin, object request)
    {
        var identityExists = await repository.Set<Admin>().AnyAsync(existing =>
            existing.Id != admin.Id
            && (existing.Username == admin.Username || existing.Email == admin.Email));
        Require(!identityExists, "Username or email already exists", 409);

        admin.Role = SystemRoles.Admin;
        var passwordProperty = request.GetType().GetProperty(nameof(DTOs.Admin.CreateRequest.Password))!;
        var password = (string)passwordProperty.GetValue(request)!;
        Require(Encoding.UTF8.GetByteCount(password) <= ValidationRules.MaximumPasswordBytes,
            "Password exceeds BCrypt byte limit");

        admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, securityOptions.Value.BcryptWorkFactor);
    }

    private async Task PreparePlateColor(PlateColor color, bool create)
    {
        color.ColorCode = color.ColorCode.ToUpperInvariant();
        var colorExists = await repository.Set<PlateColor>()
            .AnyAsync(existing => existing.Id != color.Id && existing.ColorCode == color.ColorCode);
        Require(!colorExists, "Color code already exists", 409);

        if (create)
        {
            return;
        }

        // Đồng bộ tên màu cũ trên PLATE khi Admin đổi tên màu tham chiếu.
        var plates = await repository.Set<Plate>()
            .Where(plate => plate.ColorId == color.Id)
            .ToListAsync();

        foreach (var plate in plates)
        {
            plate.Color = color.ColorName;
        }
    }

    private async Task PrepareOrder(Order order, bool create)
    {
        await Find<Customer>(order.CustomerId);
        var plate = await Find<Plate>(order.PlateId);
        var template = await Find<ChocoTemplate>(order.ChocoTemplateId);

        Require(template.PlateTypeId == plate.TypeId, "Template is incompatible with plate type");
        Require(template.IsActive == true, "Template is inactive");
        var color = await Find<PlateColor>(plate.ColorId);
        Require(color.IsActive == true, "Plate color is inactive");
        Require(plate.StockQuantity > 0, "Plate is out of stock", 409);
        Require(plate.Price >= 0, "Invalid plate price");
        order.TotalAmount = plate.Price;

        if (create)
        {
            order.OrderCode = $"CR-{Guid.NewGuid():N}";
            order.Status = StatusValues.Pending;
            order.CreatedAt = DateTime.Now;
        }
    }

    private async Task PreparePayment(Payment payment, object request)
    {
        Require(request is DTOs.Payment.CreateRequest { CashReceivedConfirmed: true },
            "Cash receipt must be explicitly confirmed");

        var order = await Find<Order>(payment.OrderId);
        Require(order.Status != StatusValues.Cancelled, "Cannot pay cancelled order", 409);
        Require(payment.Amount == order.TotalAmount && payment.Amount > 0, "Payment must equal order total");
        Require(payment.PaymentMethod == PaymentMethods.Cash,
            "Online payment requires a verified provider integration", 409);

        var hasPayment = await repository.Set<Payment>().AnyAsync(existing => existing.OrderId == payment.OrderId);
        Require(!hasPayment, "Order already has a payment", 409);

        // Chỉ ghi nhận tiền mặt đã được Admin xác nhận thực nhận.
        payment.PaymentStatus = StatusValues.Success;
        payment.PaidAt = DateTime.Now;
    }

    private async Task PrepareRefund(RefundTransaction refund)
    {
        var payment = await Find<Payment>(refund.PaymentId);
        Require(payment.PaymentStatus == StatusValues.Success, "Payment is not refundable", 409);
        Require(refund.RefundAmount > 0 && refund.RefundAmount <= payment.Amount, "Invalid refund amount");

        var hasRefund = await repository.Set<RefundTransaction>()
            .AnyAsync(existing => existing.PaymentId == refund.PaymentId);
        Require(!hasRefund, "Refund already exists", 409);

        refund.AdminId = UserId;
        refund.Status = StatusValues.Pending;
        refund.CreatedAt = DateTime.Now;
    }

    private static void PrepareIncident(IncidentReport incident, bool create)
    {
        Require(BusinessValues.IncidentStatuses.Contains(incident.Status), "Invalid incident status");

        if (create)
        {
            Require(incident.Status == StatusValues.Open, "A new incident must be Open");
            incident.ReportedAt = DateTime.Now;
        }
    }

    private async Task PrepareCashFlowAudit(CashFlowAudit audit, object request)
    {
        Require(audit.AuditDate.HasValue, "Audit date is required");
        var start = audit.AuditDate!.Value.ToDateTime(TimeOnly.MinValue);
        var end = start.AddDays(1);
        var payments = await repository.Set<Payment>()
            .Where(payment => payment.PaidAt >= start && payment.PaidAt < end
                && (payment.PaymentStatus == StatusValues.Success || payment.PaymentStatus == StatusValues.Refunded))
            .ToListAsync();

        audit.TotalRevenue = payments.Sum(payment => payment.Amount ?? 0);
        audit.TotalRefund = await repository.Set<RefundTransaction>()
            .Where(refund => payments.Select(payment => payment.Id).Contains(refund.PaymentId)
                && repository.Set<Payment>().Any(payment =>
                    payment.Id == refund.PaymentId && payment.PaymentStatus == StatusValues.Refunded))
            .SumAsync(refund => refund.RefundAmount) ?? 0;
        audit.TotalRevenue -= audit.TotalRefund;

        var requestType = request.GetType();
        var expectedRevenue = (decimal?)requestType.GetProperty("ExpectedRevenue")!.GetValue(request);
        var expectedRefund = (decimal?)requestType.GetProperty("ExpectedRefund")!.GetValue(request);
        var matchesExpectedTotals = audit.TotalRevenue == expectedRevenue && audit.TotalRefund == expectedRefund;

        audit.AdminId = UserId;
        audit.Status = matchesExpectedTotals ? StatusValues.Matched : StatusValues.Discrepancy;
    }

    public Task BeforeDelete(IEntity entity)
    {
        Require(entity is not Admin admin || admin.Id != UserId,
            "Cannot delete the signed-in account", 409);
        return Task.CompletedTask;
    }

    public async Task SetActive<TEntity>(int id, bool active) where TEntity : class, IEntity
    {
        var entity = await FindRecord<TEntity>(id);
        typeof(TEntity).GetProperty(nameof(Staff.IsActive))!.SetValue(entity, active);
        await repository.SaveChangesAsync();
    }

    public async Task OrderStatus(int id, string status)
    {
        // Khóa cập nhật đơn và kho trong cùng transaction để tránh trừ kho hai lần.
        await using var transaction = await repository.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var order = await FindRecord<Order>(id);
        Require(Workflow.CanTransition(order.Status, status), "Invalid order status transition", 409);

        if (order.Status == StatusValues.Pending && status == StatusValues.Processing)
        {
            var plate = await Find<Plate>(order.PlateId);
            var template = await Find<ChocoTemplate>(order.ChocoTemplateId);
            var isCompatibleTemplate = template.IsActive == true && template.PlateTypeId == plate.TypeId;
            Require(isCompatibleTemplate, "Template is inactive or incompatible with plate type", 409);

            var color = await Find<PlateColor>(plate.ColorId);
            Require(color.IsActive == true, "Plate color is inactive", 409);
            Require(plate.StockQuantity > 0, "Plate is out of stock", 409);
            plate.StockQuantity--;
        }

        if (order.Status == StatusValues.Processing && status == StatusValues.Cancelled)
        {
            var plate = await Find<Plate>(order.PlateId);
            plate.StockQuantity++;
        }

        order.Status = status;
        await repository.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    public async Task RefundDecision(int id, bool approve)
    {
        await using var transaction = await repository.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var refund = await FindRecord<RefundTransaction>(id);
        Require(refund.Status == StatusValues.Pending, "Refund has already been reviewed", 409);

        var payment = await Find<Payment>(refund.PaymentId);
        Require(payment.PaymentStatus == StatusValues.Success, "Payment is no longer refundable", 409);

        // Phê duyệt yêu cầu không đồng nghĩa với việc đã hoàn tiền thực tế.
        refund.Status = approve ? StatusValues.Approved : StatusValues.Rejected;
        refund.AdminId = UserId;
        await repository.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    public async Task IncidentStatus(int id, string status)
    {
        await using var transaction = await repository.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var incident = await FindRecord<IncidentReport>(id);
        Require(Workflow.CanTransitionIncident(incident.Status, status), "Invalid incident status transition", 409);

        incident.Status = status;
        await repository.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    private static void Require(bool condition, string message, int statusCode = 400)
    {
        if (!condition)
        {
            throw new ApiException(statusCode, message);
        }
    }
}

public static class Workflow
{
    public static bool CanTransition(string? currentStatus, string nextStatus)
    {
        return (currentStatus, nextStatus) switch
        {
            (StatusValues.Pending, StatusValues.Processing) => true,
            (StatusValues.Pending, StatusValues.Cancelled) => true,
            (StatusValues.Processing, StatusValues.Completed) => true,
            (StatusValues.Processing, StatusValues.Cancelled) => true,
            _ => false
        };
    }

    public static bool CanTransitionIncident(string? currentStatus, string nextStatus)
    {
        return (currentStatus, nextStatus) switch
        {
            (StatusValues.Open, StatusValues.InProgress) => true,
            (StatusValues.Open, StatusValues.Resolved) => true,
            (StatusValues.InProgress, StatusValues.Resolved) => true,
            _ => false
        };
    }
}



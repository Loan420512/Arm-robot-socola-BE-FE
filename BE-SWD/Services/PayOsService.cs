using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ChocoRobot.Common;
using ChocoRobot.Configuration;
using ChocoRobot.DTOs.Order;
using ChocoRobot.Helpers;
using ChocoRobot.Interfaces.Repositories;
using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ChocoRobot.Services;

public sealed class PayOsService(
    IBusinessRepository repository,
    IRepository<Payment> payments,
    IHttpClientFactory httpFactory,
    IOptions<PayOsOptions> payOsOptions,
    ILogger<PayOsService> logger)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<CheckoutResponse> CreateCheckout(
        CheckoutRequest request, string baseUrl, CancellationToken cancellationToken)
    {
        var customer = new Customer
        {
            FullName = request.FullName!.Trim(),
            Phone = request.Phone!.Trim(),
            Email = request.Email!.Trim(),
            CreatedAt = DateTime.Now
        };
        repository.Set<Customer>().Add(customer);
        await repository.SaveChangesAsync();

        var plate = await repository.Set<Plate>()
            .SingleOrDefaultAsync(p => p.Id == request.PlateId, cancellationToken)
            ?? throw new ApiException(400, "Invalid Plate reference");
        var template = await repository.Set<ChocoTemplate>()
            .SingleOrDefaultAsync(t => t.Id == request.ChocoTemplateId, cancellationToken)
            ?? throw new ApiException(400, "Invalid ChocoTemplate reference");

        Require(template.PlateTypeId == plate.TypeId, "Template is incompatible with plate type");
        Require(template.IsActive == true, "Template is inactive");
        var color = await repository.Set<PlateColor>()
            .SingleOrDefaultAsync(c => c.Id == plate.ColorId, cancellationToken)
            ?? throw new ApiException(400, "Invalid PlateColor reference");
        Require(color.IsActive == true, "Plate color is inactive");
        Require(plate.StockQuantity > 0, "Plate is out of stock", 409);
        Require(plate.Price >= 0, "Invalid plate price");

        var order = new Order
        {
            CustomerId = customer.Id,
            PlateId = plate.Id,
            ChocoTemplateId = template.Id,
            TotalAmount = plate.Price,
            Status = StatusValues.Pending,
            OrderCode = $"CR-{Guid.NewGuid():N}",
            CreatedAt = DateTime.Now
        };
        repository.Set<Order>().Add(order);
        await repository.SaveChangesAsync();

        var amount = (long)Math.Round(order.TotalAmount ?? 0);
        Require(amount > 0, "Payment must equal order total");

        var (checkoutUrl, qrCode) = await CreatePayOsLink(order, baseUrl, cancellationToken);

        var payment = new Payment
        {
            OrderId = order.Id,
            Amount = order.TotalAmount,
            PaymentMethod = PaymentMethods.PayOs,
            PaymentStatus = StatusValues.Failed,
            TransactionId = _lastOrderCode.ToString()
        };
        payments.Add(payment);
        await payments.Save();

        return new CheckoutResponse(checkoutUrl, qrCode, order.Id, order.OrderCode!, order.TotalAmount ?? 0, customer.Id);
    }

    /// <summary>Create a new PayOS payment link reusing an existing unpaid order.</summary>
    public async Task<CheckoutResponse> RetryCheckout(
        int orderId, string baseUrl, CancellationToken cancellationToken)
    {
        var order = await repository.Set<Order>()
            .SingleOrDefaultAsync(o => o.Id == orderId, cancellationToken)
            ?? throw new ApiException(404, ApiMessages.NotFound);

        if (!string.Equals(order.Status, StatusValues.Pending, StringComparison.Ordinal))
            throw new ApiException(409, $"Đơn hàng không còn ở trạng thái chờ thanh toán (hiện tại: {order.Status}).");

        var paid = await payments.Query()
            .AnyAsync(p => p.OrderId == order.Id
                && p.PaymentStatus == StatusValues.Success, cancellationToken);
        if (paid)
            throw new ApiException(409, "Đơn hàng này đã được thanh toán thành công.");

        var plate = await repository.Set<Plate>()
            .SingleOrDefaultAsync(p => p.Id == order.PlateId, cancellationToken)
            ?? throw new ApiException(400, "Invalid Plate reference");
        Require(plate.StockQuantity > 0, "Plate is out of stock", 409);
        if (plate.Price != order.TotalAmount)
            throw new ApiException(409, "Giá dĩa đã thay đổi. Hóa đơn này giữ giá cũ; hãy tạo hóa đơn thanh toán mới.");

        var amount = (long)Math.Round(order.TotalAmount ?? 0);
        Require(amount > 0, "Payment must equal order total");

        var (checkoutUrl, qrCode) = await CreatePayOsLink(order, baseUrl, cancellationToken);

        var payment = new Payment
        {
            OrderId = order.Id,
            Amount = order.TotalAmount,
            PaymentMethod = PaymentMethods.PayOs,
            PaymentStatus = StatusValues.Failed,
            TransactionId = _lastOrderCode.ToString()
        };
        payments.Add(payment);
        await payments.Save();

        return new CheckoutResponse(checkoutUrl, qrCode, order.Id,
            order.OrderCode!, order.TotalAmount ?? 0, order.CustomerId ?? 0);
    }

    private long _lastOrderCode;

    private async Task<(string CheckoutUrl, string? QrCode)> CreatePayOsLink(
        Order order, string baseUrl, CancellationToken cancellationToken)
    {
        var amount = (long)Math.Round(order.TotalAmount ?? 0);
        var options = payOsOptions.Value;
        if (string.IsNullOrWhiteSpace(options.ClientId)
            || string.IsNullOrWhiteSpace(options.ApiKey)
            || string.IsNullOrWhiteSpace(options.ChecksumKey))
        {
            logger.LogWarning("PayOS checkout attempted without PayOS configuration");
            throw new ApiException(503, "PayOS chưa được cấu hình trên máy chủ. Vui lòng liên hệ xưởng hoặc thanh toán tiền mặt.");
        }
        var orderCode = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var description = $"ChocoRobot {order.OrderCode![3..11].ToUpperInvariant()}";
        var returnUrl = $"{baseUrl}/thanh-toan-thanh-cong?order={order.Id}";
        var cancelUrl = $"{baseUrl}/thanh-toan-that-bai?order={order.Id}";

        var signature = Sign(amount, cancelUrl, description, orderCode, returnUrl, options.ChecksumKey);
        var payload = new
        {
            orderCode,
            amount,
            description,
            cancelUrl,
            returnUrl,
            signature
        };

        using var http = httpFactory.CreateClient();
        http.DefaultRequestHeaders.Add("x-client-id", options.ClientId);
        http.DefaultRequestHeaders.Add("x-api-key", options.ApiKey);
        using var response = await http.PostAsJsonAsync(
            "https://api-merchant.payos.vn/v2/payment-requests", payload, Json, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("PayOS rejected checkout for order {OrderId}: {Status} {Body}",
                order.Id, (int)response.StatusCode, body);
            throw new ApiException(502, "Không tạo được link thanh toán PayOS. Vui lòng thử lại.");
        }

        using var doc = JsonDocument.Parse(body);
        if (doc.RootElement.GetProperty("code").GetString() != "00")
        {
            logger.LogWarning("PayOS error for order {OrderId}: {Body}", order.Id, body);
            throw new ApiException(502, "Không tạo được link thanh toán PayOS. Vui lòng thử lại.");
        }

        var data = doc.RootElement.GetProperty("data");
        var checkoutUrl = data.GetProperty("checkoutUrl").GetString()
            ?? throw new ApiException(502, "Không tạo được link thanh toán PayOS. Vui lòng thử lại.");
        var qrCode = data.TryGetProperty("qrCode", out var qr) ? qr.GetString() : null;

        _lastOrderCode = orderCode;
        return (checkoutUrl, qrCode);
    }

    public async Task<PaymentStatusResponse> GetStatus(int orderId, CancellationToken cancellationToken)
    {
        var order = await repository.Set<Order>()
            .AsNoTracking()
            .SingleOrDefaultAsync(o => o.Id == orderId, cancellationToken)
            ?? throw new ApiException(404, ApiMessages.NotFound);

        var payment = await payments.Query(true)
            .Where(p => p.OrderId == order.Id && p.PaymentMethod == PaymentMethods.PayOs)
            .OrderByDescending(p => p.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (payment is null)
            return new PaymentStatusResponse(false, "PENDING", order.OrderCode ?? "", order.TotalAmount ?? 0);

        if (string.Equals(payment.PaymentStatus, StatusValues.Success, StringComparison.Ordinal))
            return new PaymentStatusResponse(true, "PAID", order.OrderCode ?? "", order.TotalAmount ?? 0);

        if (!long.TryParse(payment.TransactionId, out var payOsCode))
            return new PaymentStatusResponse(false, "PENDING", order.OrderCode ?? "", order.TotalAmount ?? 0);

        var remote = await FetchPayOsStatus(payOsCode, cancellationToken);
        if (string.Equals(remote, "PAID", StringComparison.OrdinalIgnoreCase))
        {
            payment.PaymentStatus = StatusValues.Success;
            payment.PaidAt = DateTime.Now;
            await payments.Save();
            return new PaymentStatusResponse(true, "PAID", order.OrderCode ?? "", order.TotalAmount ?? 0);
        }

        return new PaymentStatusResponse(false, remote ?? "PENDING", order.OrderCode ?? "", order.TotalAmount ?? 0);
    }

    private async Task<string?> FetchPayOsStatus(long orderCode, CancellationToken cancellationToken)
    {
        var options = payOsOptions.Value;
        if (string.IsNullOrWhiteSpace(options.ClientId) || string.IsNullOrWhiteSpace(options.ApiKey))
            return null;

        using var http = httpFactory.CreateClient();
        http.DefaultRequestHeaders.Add("x-client-id", options.ClientId);
        http.DefaultRequestHeaders.Add("x-api-key", options.ApiKey);
        using var response = await http.GetAsync(
            $"https://api-merchant.payos.vn/v2/payment-requests/{orderCode}", cancellationToken);
        if (!response.IsSuccessStatusCode) return null;

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("code", out var code) || code.GetString() != "00") return null;
        if (!doc.RootElement.TryGetProperty("data", out var data)) return null;
        return data.TryGetProperty("status", out var status) ? status.GetString() : null;
    }

    public async Task<bool> HandleWebhook(JsonElement payload, CancellationToken cancellationToken)
    {
        if (!VerifyWebhook(payload, payOsOptions.Value.ChecksumKey))
        {
            logger.LogWarning("PayOS webhook signature mismatch");
            return false;
        }

        if (!payload.TryGetProperty("data", out var data)
            || !data.TryGetProperty("orderCode", out var codeElement)
            || !data.TryGetProperty("code", out var statusElement))
        {
            return false;
        }

        var payOsCode = codeElement.GetInt64().ToString();
        var success = statusElement.GetString() == "00";
        var payment = await payments.Query(true)
            .SingleOrDefaultAsync(p => p.TransactionId == payOsCode, cancellationToken);
        if (payment is null)
        {
            logger.LogWarning("PayOS webhook for unknown transaction {Code}", payOsCode);
            return true;
        }

        payment.PaymentStatus = success ? StatusValues.Success : StatusValues.Failed;
        if (success) payment.PaidAt = DateTime.Now;
        await payments.Save();
        return true;
    }

    internal static string Sign(long amount, string cancelUrl, string description, long orderCode, string returnUrl, string checksumKey)
    {
        var raw = $"amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(checksumKey));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
    }

    internal static bool VerifyWebhook(JsonElement payload, string checksumKey)
    {
        if (!payload.TryGetProperty("signature", out var signatureElement)
            || !payload.TryGetProperty("data", out var data))
        {
            return false;
        }

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(checksumKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data.GetRawText()));
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(signatureElement.GetString() ?? string.Empty),
            Encoding.UTF8.GetBytes(Convert.ToHexString(hash).ToLowerInvariant()));
    }

    private static void Require(bool condition, string message, int status = 400)
    {
        if (!condition) throw new ApiException(status, message);
    }
}

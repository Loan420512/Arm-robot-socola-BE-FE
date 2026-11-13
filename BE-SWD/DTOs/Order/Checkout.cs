using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.Order;

[System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
public sealed class CheckoutRequest
{
    [Required, MaxLength(100)]
    public string? FullName { get; set; }

    [Required, MaxLength(20)]
    [Phone]
    [RegularExpression(@"\+?[0-9]{8,15}", ErrorMessage = "Phone must contain 8 to 15 digits with an optional leading +.")]
    public string? Phone { get; set; }

    [Required, MaxLength(100), EmailAddress]
    public string? Email { get; set; }

    [Required]
    public int? PlateId { get; set; }

    [Required]
    public int? ChocoTemplateId { get; set; }
}

public sealed record CheckoutResponse(
    string CheckoutUrl,
    string? QrCode,
    int OrderId,
    string OrderCode,
    decimal Amount,
    int CustomerId);

public sealed record PaymentStatusResponse(bool Paid, string Status, string OrderCode, decimal Amount);

/// <summary>Retry a failed PayOS payment reusing the existing order.</summary>
public sealed class RetryCheckoutRequest
{
    [Required, Range(1, int.MaxValue)]
    public int? OrderId { get; set; }
}

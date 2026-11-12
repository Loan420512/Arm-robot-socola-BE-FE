using System.ComponentModel.DataAnnotations;
using ChocoRobot.Common;

namespace ChocoRobot.DTOs.Payment;

public class CreateRequest
{
    [Required, MustBeTrue]
    public bool? CashReceivedConfirmed
    {
        get; set;
    }

    [Required]
    public int? OrderId
    {
        get; set;
    }
    public int? AuditId
    {
        get; set;
    }

    [Required]
    [Range(0, ValidationRules.MaximumMoney)]
    public decimal? Amount
    {
        get; set;
    }

    [Required, AllowedBusinessValue(BusinessValueSet.PaymentMethods)]
    [MaxLength(30)]
    public string? PaymentMethod
    {
        get; set;
    }
}

public class UpdateRequest : CreateRequest
{
}

public class ResponseDto
{
    public int Id
    {
        get; set;
    }
    public int OrderId
    {
        get; set;
    }
    public int? AuditId
    {
        get; set;
    }
    public decimal? Amount
    {
        get; set;
    }
    public string? PaymentMethod
    {
        get; set;
    }
    public string? PaymentStatus
    {
        get; set;
    }
    public string? TransactionId
    {
        get; set;
    }
    public DateTime? PaidAt
    {
        get; set;
    }
}

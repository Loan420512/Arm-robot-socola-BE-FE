using System.ComponentModel.DataAnnotations;
using ChocoRobot.Common;

namespace ChocoRobot.DTOs.RefundTransaction;

public class CreateRequest
{
    public int? AuditId
    {
        get; set;
    }

    [Required]
    public int? PaymentId
    {
        get; set;
    }

    [Required]
    [Range(0, ValidationRules.MaximumMoney)]
    public decimal? RefundAmount
    {
        get; set;
    }

    [Required]
    [MaxLength(500)]
    public string? Reason
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
    public int? AuditId
    {
        get; set;
    }
    public int? AdminId
    {
        get; set;
    }
    public int PaymentId
    {
        get; set;
    }
    public decimal? RefundAmount
    {
        get; set;
    }
    public string? Reason
    {
        get; set;
    }
    public string? Status
    {
        get; set;
    }
    public DateTime? CreatedAt
    {
        get; set;
    }
}

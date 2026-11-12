using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.CashFlowAudit;

public class CreateRequest
{
    [Required, Range(0, double.MaxValue)]
    public decimal? ExpectedRevenue
    {
        get; set;
    }

    [Required, Range(0, double.MaxValue)]
    public decimal? ExpectedRefund
    {
        get; set;
    }

    [Required]
    public DateOnly? AuditDate
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
    public int? AdminId
    {
        get; set;
    }
    public DateOnly? AuditDate
    {
        get; set;
    }
    public decimal? TotalRevenue
    {
        get; set;
    }
    public decimal? TotalRefund
    {
        get; set;
    }
    public string? Status
    {
        get; set;
    }
}

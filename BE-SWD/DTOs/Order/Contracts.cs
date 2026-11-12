using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.Order;

public record StatusRequest([Required, AllowedBusinessValue(BusinessValueSet.OrderStatuses)] string Status);
public class CreateRequest
{
    [Required]
    public int? CustomerId
    {
        get; set;
    }

    [Required]
    public int? PlateId
    {
        get; set;
    }

    [Required]
    public int? ChocoTemplateId
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
    public string? OrderCode
    {
        get; set;
    }
    public int? CustomerId
    {
        get; set;
    }
    public int? PlateId
    {
        get; set;
    }
    public int? ChocoTemplateId
    {
        get; set;
    }
    public decimal? TotalAmount
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

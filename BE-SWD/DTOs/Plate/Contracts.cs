using System.ComponentModel.DataAnnotations;
using ChocoRobot.Common;

namespace ChocoRobot.DTOs.Plate;

public class CreateRequest
{
    [Required]
    public int? TypeId
    {
        get; set;
    }

    [Required]
    public int? ColorId
    {
        get; set;
    }

    [Required]
    [MaxLength(100)]
    public string? Sku
    {
        get; set;
    }

    [Required]
    [MaxLength(100)]
    public string? Material
    {
        get; set;
    }

    [Required]
    [MaxLength(50)]
    public string? Color
    {
        get; set;
    }

    [Required]
    [Range(0, ValidationRules.MaximumMoney)]
    public decimal? Price
    {
        get; set;
    }

    [Required]
    [Range(0, ValidationRules.MaximumMoney)]
    public int? StockQuantity
    {
        get; set;
    }
}

public class UpdateRequest : CreateRequest
{
}

public partial class ResponseDto
{
    public int Id
    {
        get; set;
    }
    public int? TypeId
    {
        get; set;
    }
    public int? ColorId
    {
        get; set;
    }
    public string? Sku
    {
        get; set;
    }
    public string? Material
    {
        get; set;
    }
    public string? Color
    {
        get; set;
    }
    public decimal? Price
    {
        get; set;
    }
    public int? StockQuantity
    {
        get; set;
    }
}

using System.ComponentModel.DataAnnotations;
using ChocoRobot.Common;

namespace ChocoRobot.DTOs.PlateColor;

public class CreateRequest
{
    [Required]
    [MaxLength(50)]
    public string? ColorName
    {
        get; set;
    }

    [Required]
    [MaxLength(20)]
    [RegularExpression(ValidationRules.HexColorPattern)]
    public string? ColorCode
    {
        get; set;
    }

    [Required]
    public bool? IsActive
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
    public string ColorName { get; set; } = null!;
    public string ColorCode { get; set; } = null!;
    public bool? IsActive
    {
        get; set;
    }
}

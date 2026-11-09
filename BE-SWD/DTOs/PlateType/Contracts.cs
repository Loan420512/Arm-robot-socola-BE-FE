using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.PlateType;

public class CreateRequest
{
    [Required]
    [MaxLength(50)]
    public string? Shape
    {
        get; set;
    }

    [Required]
    [MaxLength(100)]
    public string? TypeName
    {
        get; set;
    }

    [Required]
    [MaxLength(100)]
    public string? Dimensions
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
    public string? Shape
    {
        get; set;
    }
    public string? TypeName
    {
        get; set;
    }
    public string? Dimensions
    {
        get; set;
    }
}

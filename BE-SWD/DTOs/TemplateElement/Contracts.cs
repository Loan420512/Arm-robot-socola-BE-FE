using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.TemplateElement;

public class CreateRequest
{
    [Required]
    public int? TemplateId
    {
        get; set;
    }

    [Required]
    public int? StaffId
    {
        get; set;
    }

    [Required]
    [MaxLength(150)]
    public string? ElementName
    {
        get; set;
    }

    [Required]
    public int? PositionX
    {
        get; set;
    }

    [Required]
    public int? PositionY
    {
        get; set;
    }

    [Required]
    [Range(0.000001, 1000000)]
    public double? Scale
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
    public int TemplateId
    {
        get; set;
    }
    public int? StaffId
    {
        get; set;
    }
    public string? ElementName
    {
        get; set;
    }
    public int? PositionX
    {
        get; set;
    }
    public int? PositionY
    {
        get; set;
    }
    public double? Scale
    {
        get; set;
    }
}

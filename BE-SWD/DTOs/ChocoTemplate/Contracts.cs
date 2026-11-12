using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.ChocoTemplate;

public class CreateRequest
{
    [Required]
    public int? PlateTypeId
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
    public string? TemplateName
    {
        get; set;
    }

    [Required]
    [MaxLength(500)]
    public string? ImagePreviewUrl
    {
        get; set;
    }

    [Required]
    [MaxLength(500)]
    public string? GcodeFileUrl
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
    public int? PlateTypeId
    {
        get; set;
    }
    public int? StaffId
    {
        get; set;
    }
    public string? TemplateName
    {
        get; set;
    }
    public string? ImagePreviewUrl
    {
        get; set;
    }
    public string? GcodeFileUrl
    {
        get; set;
    }
    public bool? IsActive
    {
        get; set;
    }
    public DateTime? CreatedAt
    {
        get; set;
    }
}

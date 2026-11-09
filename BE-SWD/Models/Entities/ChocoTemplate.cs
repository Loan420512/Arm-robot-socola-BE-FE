namespace ChocoRobot.Models.Entities;

public class ChocoTemplate : IEntity
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

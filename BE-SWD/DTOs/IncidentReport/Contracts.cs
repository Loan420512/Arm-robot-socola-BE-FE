using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.IncidentReport;

public record StatusRequest([Required, AllowedBusinessValue(BusinessValueSet.IncidentStatuses)] string Status);
public class CreateRequest
{
    [Required]
    public int? StaffId
    {
        get; set;
    }

    [Required]
    [MaxLength(50)]
    public string? IncidentType
    {
        get; set;
    }

    [Required]
    public string? Description
    {
        get; set;
    }

    [Required, AllowedBusinessValue(BusinessValueSet.IncidentStatuses)]
    [MaxLength(30)]
    public string? Status
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
    public int? StaffId
    {
        get; set;
    }
    public string? IncidentType
    {
        get; set;
    }
    public string? Description
    {
        get; set;
    }
    public string? Status
    {
        get; set;
    }
    public DateTime? ReportedAt
    {
        get; set;
    }
}

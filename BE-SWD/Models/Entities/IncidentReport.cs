namespace ChocoRobot.Models.Entities;

public class IncidentReport : IEntity
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

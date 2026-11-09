namespace ChocoRobot.Models.Entities;

public class Staff : IEntity
{
    public int Id
    {
        get; set;
    }
    public int? AdminId
    {
        get; set;
    }
    public string? FullName
    {
        get; set;
    }
    public string? EmployeeCode
    {
        get; set;
    }
    public string? Phone
    {
        get; set;
    }
    public string? Position
    {
        get; set;
    }
    public bool? IsActive
    {
        get; set;
    }
}

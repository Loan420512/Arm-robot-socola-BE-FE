namespace ChocoRobot.Models.Entities;

public class Customer : IEntity
{
    public int Id
    {
        get; set;
    }
    public string? FullName
    {
        get; set;
    }
    public string? Phone
    {
        get; set;
    }
    public string? Email
    {
        get; set;
    }
    public DateTime? CreatedAt
    {
        get; set;
    }
}

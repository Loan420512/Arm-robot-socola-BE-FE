namespace ChocoRobot.Models.Entities;

public class PlateColor : IEntity
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

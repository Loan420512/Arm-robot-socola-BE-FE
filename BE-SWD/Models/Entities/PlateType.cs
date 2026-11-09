namespace ChocoRobot.Models.Entities;

public class PlateType : IEntity
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

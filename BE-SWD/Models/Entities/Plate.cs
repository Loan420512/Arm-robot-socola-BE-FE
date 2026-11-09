namespace ChocoRobot.Models.Entities;

public class Plate : IEntity
{
    public int Id
    {
        get; set;
    }
    public int? TypeId
    {
        get; set;
    }
    public int? ColorId
    {
        get; set;
    }
    public string? Sku
    {
        get; set;
    }
    public string? Material
    {
        get; set;
    }
    public string? Color
    {
        get; set;
    }
    public decimal? Price
    {
        get; set;
    }
    public int? StockQuantity
    {
        get; set;
    }
}

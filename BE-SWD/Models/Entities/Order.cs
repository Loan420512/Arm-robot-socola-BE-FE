namespace ChocoRobot.Models.Entities;

public class Order : IEntity
{
    public int Id
    {
        get; set;
    }
    public string? OrderCode
    {
        get; set;
    }
    public int? CustomerId
    {
        get; set;
    }
    public int? PlateId
    {
        get; set;
    }
    public int? ChocoTemplateId
    {
        get; set;
    }
    public decimal? TotalAmount
    {
        get; set;
    }
    public string? Status
    {
        get; set;
    }
    public DateTime? CreatedAt
    {
        get; set;
    }
}

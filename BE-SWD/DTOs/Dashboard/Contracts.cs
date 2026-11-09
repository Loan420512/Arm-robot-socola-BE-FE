namespace ChocoRobot.DTOs.Dashboard;

public record OverviewDto(
    int TotalCustomers,
    int TotalOrders,
    int CompletedOrders,
    int PendingOrders,
    decimal TotalRevenue,
    decimal TotalRefunds);
public record RevenueDto(DateTime Date, decimal Total);
public record OrderStatisticsDto(string? Status, int Count);
public record TopPlateDto(int? PlateId, int Count, decimal Total);
public record PaymentStatisticsDto(string? Method, string? Status, int Count, decimal Amount);

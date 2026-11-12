using ChocoRobot.Configuration;
using ChocoRobot.DTOs.Dashboard;
using ChocoRobot.Interfaces.Repositories;
using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ChocoRobot.Services;

public class DashboardService(IBusinessRepository repository, IOptions<ReportingOptions> reportingOptions)
{
    public async Task<OverviewDto> Overview()
    {
        var totalRefunds = await ConfirmedRefunds().SumAsync(refund => refund.RefundAmount) ?? 0;
        var grossRevenue = await repository.Set<Payment>()
            .AsNoTracking()
            .Where(payment => payment.PaymentStatus == StatusValues.Success
                || payment.PaymentStatus == StatusValues.Refunded)
            .SumAsync(payment => payment.Amount) ?? 0;

        var totalCustomers = await repository.Set<Customer>().CountAsync();
        var totalOrders = await repository.Set<Order>().CountAsync();
        var completedOrders = await repository.Set<Order>().CountAsync(order => order.Status == StatusValues.Completed);
        var pendingOrders = await repository.Set<Order>().CountAsync(order => order.Status == StatusValues.Pending);

        return new OverviewDto(
            totalCustomers,
            totalOrders,
            completedOrders,
            pendingOrders,
            grossRevenue - totalRefunds,
            totalRefunds);
    }

    public async Task<List<RevenueDto>> Revenue()
    {
        var payments = await repository.Set<Payment>()
            .AsNoTracking()
            .Where(payment => (payment.PaymentStatus == StatusValues.Success
                || payment.PaymentStatus == StatusValues.Refunded) && payment.PaidAt != null)
            .Select(payment => new
            {
                payment.Id,
                payment.PaidAt,
                payment.Amount,
                payment.PaymentStatus
            })
            .ToListAsync();

        var refunds = await ConfirmedRefunds()
            .ToDictionaryAsync(refund => refund.PaymentId, refund => refund.RefundAmount ?? 0);

        // Schema chưa có ngày hoàn tiền; giữ cách nhóm theo ngày thanh toán gốc.
        return payments
            .GroupBy(payment => payment.PaidAt!.Value.Date)
            .Select(group => new RevenueDto(
                group.Key,
                group.Sum(payment => NetAmount(payment.Id, payment.Amount, payment.PaymentStatus, refunds))))
            .OrderBy(revenue => revenue.Date)
            .ToList();
    }

    public Task<List<OrderStatisticsDto>> Orders()
    {
        return repository.Set<Order>()
            .AsNoTracking()
            .GroupBy(order => order.Status)
            .Select(group => new OrderStatisticsDto(group.Key, group.Count()))
            .ToListAsync();
    }

    public Task<List<TopPlateDto>> TopPlates()
    {
        return repository.Set<Order>()
            .AsNoTracking()
            .Where(order => order.Status == StatusValues.Completed)
            .GroupBy(order => order.PlateId)
            .Select(group => new
            {
                PlateId = group.Key,
                Count = group.Count(),
                Total = group.Sum(order => order.TotalAmount) ?? 0
            })
            .OrderByDescending(plate => plate.Count)
            .Take(reportingOptions.Value.TopPlatesLimit)
            .Select(plate => new TopPlateDto(plate.PlateId, plate.Count, plate.Total))
            .ToListAsync();
    }

    public Task<List<PaymentStatisticsDto>> Payments()
    {
        return repository.Set<Payment>()
            .AsNoTracking()
            .GroupBy(payment => new { payment.PaymentMethod, payment.PaymentStatus })
            .Select(group => new PaymentStatisticsDto(
                group.Key.PaymentMethod,
                group.Key.PaymentStatus,
                group.Count(),
                group.Sum(payment => payment.Amount) ?? 0))
            .ToListAsync();
    }

    private IQueryable<RefundTransaction> ConfirmedRefunds()
    {
        // Chỉ trừ khoản hoàn trả đã được xác nhận qua trạng thái Payment.
        return repository.Set<RefundTransaction>()
            .AsNoTracking()
            .Where(refund => repository.Set<Payment>().Any(payment =>
                payment.Id == refund.PaymentId && payment.PaymentStatus == StatusValues.Refunded));
    }

    private static decimal NetAmount(
        int paymentId,
        decimal? amount,
        string? status,
        IReadOnlyDictionary<int, decimal> refunds)
    {
        var refundedAmount = status == StatusValues.Refunded ? refunds.GetValueOrDefault(paymentId) : 0;
        return (amount ?? 0) - refundedAmount;
    }
}

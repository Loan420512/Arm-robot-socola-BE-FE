using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.Dashboard;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChocoRobot.Controllers;

[ApiController, Route(ApiRoutes.Dashboard), Authorize(Roles = SystemRoles.Admin)]
public class DashboardController(
    DashboardService service) : ControllerBase
{
    /// <summary>Get dashboard overview</summary>
    /// <remarks>
    /// Calculates customer and order counts, completed and pending orders, net revenue and confirmed refund totals from
    /// SQL Server. Failed payments are excluded; refund approval alone is not treated as money returned. Requires an
    /// authenticated Admin.
    /// </remarks>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.Overview)]
    public async Task<ApiResponse<OverviewDto>> Overview()
    {
        return new ApiResponse<OverviewDto>(
            true,
            "Dashboard data retrieved successfully",
            await service.Overview());
    }

    /// <summary>Get revenue by payment date</summary>
    /// <remarks>
    /// Groups net revenue by the original payment date using successful or refunded payments and confirmed refund amounts.
    /// All values are calculated from stored transactions; the schema does not record the actual refund execution date.
    /// Requires an authenticated Admin.
    /// </remarks>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.Revenue)]
    public async Task<ApiResponse<List<RevenueDto>>> Revenue()
    {
        return new ApiResponse<List<RevenueDto>>(
            true,
            ApiMessages.Retrieved,
            await service.Revenue());
    }

    /// <summary>Get order statistics</summary>
    /// <remarks>
    /// Groups stored orders by their current status and returns the count for each status present in SQL Server. Requires
    /// an authenticated Admin.
    /// </remarks>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.OrderStatistics)]
    public async Task<ApiResponse<List<OrderStatisticsDto>>> Orders()
    {
        return new ApiResponse<List<OrderStatisticsDto>>(
            true,
            ApiMessages.Retrieved,
            await service.Orders());
    }

    /// <summary>Get top-selling plates</summary>
    /// <remarks>
    /// Ranks plate identifiers by the number of completed orders and returns counts and order totals. The result limit
    /// comes from Reporting configuration. Each order represents one plate. Requires an authenticated Admin.
    /// </remarks>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.TopPlates)]
    public async Task<ApiResponse<List<TopPlateDto>>> TopPlates()
    {
        return new ApiResponse<List<TopPlateDto>>(
            true,
            ApiMessages.Retrieved,
            await service.TopPlates());
    }

    /// <summary>Get payment statistics</summary>
    /// <remarks>
    /// Groups stored payments by payment method and status, returning transaction counts and amounts. Failed and refunded
    /// entries remain separate categories rather than being counted as successful revenue. Requires an authenticated
    /// Admin.
    /// </remarks>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.PaymentStatistics)]
    public async Task<ApiResponse<List<PaymentStatisticsDto>>> Payments()
    {
        return new ApiResponse<List<PaymentStatisticsDto>>(
            true,
            ApiMessages.Retrieved,
            await service.Payments());
    }
}


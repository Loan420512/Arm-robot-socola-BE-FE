using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.Payment;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChocoRobot.Controllers;

[SwaggerGroup(SwaggerGroups.Payments)]
[ApiController, Route(ApiRoutes.Payments), Authorize(Roles = SystemRoles.Admin)]
public class PaymentController(
    ICrudService<Payment, CreateRequest, UpdateRequest, ResponseDto> service,
    PaymentService payments) : ControllerBase
{
    /// <summary>Get all payments</summary>
    /// <remarks>
    /// Returns a paginated list of payments read from SQL Server. Supports pageNumber, pageSize, search, sortBy and
    /// descending. Each order can have only one payment. Cancelled orders cannot be paid. Online providers are rejected
    /// until a verified provider integration exists. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="filter">Pagination, search, sorting and resource-specific query filters.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet]
    public async Task<ApiResponse<PagedResult<ResponseDto>>> List([FromQuery] FilterRequest filter)
    {
        return new ApiResponse<PagedResult<ResponseDto>>(
            true,
            ApiMessages.Retrieved,
            await service.List(filter));
    }

    /// <summary>Get payment by ID</summary>
    /// <remarks>
    /// Returns the stored payment identified by the route ID, or 404 when it does not exist. Each order can have only one
    /// payment. Cancelled orders cannot be paid. Online providers are rejected until a verified provider integration
    /// exists. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.ById)]
    public async Task<ApiResponse<ResponseDto>> Get(int id)
    {
        return new ApiResponse<ResponseDto>(
            true,
            ApiMessages.Retrieved,
            await service.Get(id));
    }

    /// <summary>Record confirmed cash payment</summary>
    /// <remarks>
    /// Records Cash only after the Admin explicitly supplies cashReceivedConfirmed=true. The amount must equal the
    /// non-cancelled order total and be positive. Duplicate payments are rejected. VNPay, Momo and ZaloPay cannot be
    /// marked successful without a verified integration. This endpoint does not simulate provider transactions. Requires
    /// an authenticated Admin.
    /// </remarks>
    /// <param name="request">Validated request fields accepted by this endpoint.</param>
    /// <response code="201">Record created; the Location header points to its GET endpoint.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="409">The operation conflicts with a business rule, existing record or database reference.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpPost, ProducesResponseType(typeof(ApiResponse<ResponseDto>), 201)]
    public async Task<IActionResult> Create(CreateRequest request)
    {
        var created = await service.Create(request);
        var response = new ApiResponse<ResponseDto>(true, ApiMessages.Created, created);
        return CreatedAtAction(nameof(Get), new
        {
            id = created.Id
        }, response);
    }

    /// <summary>Get payment by order</summary>
    /// <remarks>
    /// Returns the single payment recorded for the order identifier in the route, or 404 when no payment exists. The
    /// database allows only one payment per order. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.ByOrder)]
    public async Task<ApiResponse<ResponseDto>> ByOrder(int id)
    {
        return new ApiResponse<ResponseDto>(
            true,
            ApiMessages.Retrieved,
            await payments.ByOrder(id));
    }
}

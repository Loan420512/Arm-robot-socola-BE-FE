using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.CashFlowAudit;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChocoRobot.Controllers;

[ApiController, Route(ApiRoutes.CashFlowAudits), Authorize(Roles = SystemRoles.Admin)]
public class CashFlowAuditController(
    ICrudService<CashFlowAudit, CreateRequest, UpdateRequest, ResponseDto> service) : ControllerBase
{
    /// <summary>Get all cash flow audits</summary>
    /// <remarks>
    /// Returns a paginated list of cash flow audits read from SQL Server. Supports pageNumber, pageSize, search, sortBy
    /// and descending. Compares expectedRevenue and expectedRefund for auditDate with SQL-derived totals and assigns
    /// Matched or Discrepancy. Failed payments are excluded; only confirmed refunded payments contribute refunds. Because
    /// the schema has no refund execution date, refunds are attributed to the original payment date. Requires an
    /// authenticated Admin.
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

    /// <summary>Get cash flow audit by ID</summary>
    /// <remarks>
    /// Returns the stored cash flow audit identified by the route ID, or 404 when it does not exist. Compares
    /// expectedRevenue and expectedRefund for auditDate with SQL-derived totals and assigns Matched or Discrepancy. Failed
    /// payments are excluded; only confirmed refunded payments contribute refunds. Because the schema has no refund
    /// execution date, refunds are attributed to the original payment date. Requires an authenticated Admin.
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

    /// <summary>Create cash flow audit</summary>
    /// <remarks>
    /// Validates the request and referenced records, then saves a new cash flow audit to SQL Server. The server assigns
    /// the primary key. Compares expectedRevenue and expectedRefund for auditDate with SQL-derived totals and assigns
    /// Matched or Discrepancy. Failed payments are excluded; only confirmed refunded payments contribute refunds. Because
    /// the schema has no refund execution date, refunds are attributed to the original payment date. Requires an
    /// authenticated Admin.
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

    /// <summary>Update cash flow audit</summary>
    /// <remarks>
    /// Updates the cash flow audit identified by the route ID after validating the request and references. Server-managed
    /// fields cannot be overwritten. Compares expectedRevenue and expectedRefund for auditDate with SQL-derived totals and
    /// assigns Matched or Discrepancy. Failed payments are excluded; only confirmed refunded payments contribute refunds.
    /// Because the schema has no refund execution date, refunds are attributed to the original payment date. Requires an
    /// authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <param name="request">Validated request fields accepted by this endpoint.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="409">The operation conflicts with a business rule, existing record or database reference.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpPut(ApiRoutes.ById)]
    public async Task<ApiResponse<ResponseDto>> Update(int id, UpdateRequest request)
    {
        return new ApiResponse<ResponseDto>(
            true,
            ApiMessages.Updated,
            await service.Update(id, request));
    }
}


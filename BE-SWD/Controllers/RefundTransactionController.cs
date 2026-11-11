using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.RefundTransaction;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChocoRobot.Controllers;

[ApiController, Route(ApiRoutes.Refunds), Authorize(Roles = SystemRoles.Admin)]
public class RefundTransactionController(
    ICrudService<RefundTransaction, CreateRequest, UpdateRequest, ResponseDto> service,
    BusinessRules rules) : ControllerBase
{
    /// <summary>Get all refund requests</summary>
    /// <remarks>
    /// Returns a paginated list of refund requests read from SQL Server. Supports pageNumber, pageSize, search, sortBy and
    /// descending. Each payment can have only one refund request. Refund amounts must be positive and cannot exceed a
    /// successful payment. Approval is a review decision and does not execute or confirm a money transfer. Requires an
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

    /// <summary>Get refund request by ID</summary>
    /// <remarks>
    /// Returns the stored refund request identified by the route ID, or 404 when it does not exist. Each payment can have
    /// only one refund request. Refund amounts must be positive and cannot exceed a successful payment. Approval is a
    /// review decision and does not execute or confirm a money transfer. Requires an authenticated Admin.
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

    /// <summary>Create refund request</summary>
    /// <remarks>
    /// Validates the request and referenced records, then saves a new refund request to SQL Server. The server assigns the
    /// primary key. Each payment can have only one refund request. Refund amounts must be positive and cannot exceed a
    /// successful payment. Approval is a review decision and does not execute or confirm a money transfer. Requires an
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

    /// <summary>Approve refund request</summary>
    /// <remarks>
    /// Approves a Pending refund request for a successful payment. A request can be reviewed only once. This operation
    /// does not transfer funds and does not mark the payment as Refunded. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <response code="204">Operation completed successfully; no response body.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="409">The operation conflicts with a business rule, existing record or database reference.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpPatch(ApiRoutes.Approve)]
    public async Task<IActionResult> Approve(int id)
    {
        await rules.RefundDecision(id, true);
        return NoContent();
    }

    /// <summary>Reject refund request</summary>
    /// <remarks>
    /// Rejects a Pending refund request whose payment is still successful. Previously reviewed requests cannot be reviewed
    /// again. No funds are transferred. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <response code="204">Operation completed successfully; no response body.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="409">The operation conflicts with a business rule, existing record or database reference.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpPatch(ApiRoutes.Reject)]
    public async Task<IActionResult> Reject(int id)
    {
        await rules.RefundDecision(id, false);
        return NoContent();
    }
}


using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.Staff;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChocoRobot.Controllers;

[SwaggerGroup(SwaggerGroups.Staff)]
[ApiController, Route(ApiRoutes.Staff), Authorize(Roles = SystemRoles.Admin)]
public class StaffController(
    ICrudService<Staff, CreateRequest, UpdateRequest, ResponseDto> service,
    BusinessRules rules) : ControllerBase
{
    /// <summary>Get all staff members</summary>
    /// <remarks>
    /// Returns a paginated list of staff members read from SQL Server. Supports pageNumber, pageSize, search, sortBy and
    /// descending. Valid positions are Support, Operator and Designer. Staff records are informational and do not provide
    /// separate login accounts. Requires an authenticated Admin.
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

    /// <summary>Get staff member by ID</summary>
    /// <remarks>
    /// Returns the stored staff member identified by the route ID, or 404 when it does not exist. Valid positions are
    /// Support, Operator and Designer. Staff records are informational and do not provide separate login accounts.
    /// Requires an authenticated Admin.
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

    /// <summary>Create staff member</summary>
    /// <remarks>
    /// Validates the request and referenced records, then saves a new staff member to SQL Server. The server assigns the
    /// STAFF.id primary key. admin_id is left NULL; no Admin association is required. Valid positions are Support, Operator and Designer. Staff records are informational and do not provide
    /// separate login accounts. Requires an authenticated Admin.
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

    /// <summary>Update staff member</summary>
    /// <remarks>
    /// Updates the staff member identified by the route ID after validating the request and references. Server-managed
    /// fields cannot be overwritten. Valid positions are Support, Operator and Designer. Staff records are informational
    /// and do not provide separate login accounts. Requires an authenticated Admin.
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

    /// <summary>Delete staff member</summary>
    /// <remarks>
    /// Deletes the staff member identified by the route ID. A foreign key reference prevents deletion and returns a
    /// conflict. Valid positions are Support, Operator and Designer. Staff records are informational and do not provide
    /// separate login accounts. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <response code="204">Operation completed successfully; no response body.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="409">The operation conflicts with a business rule, existing record or database reference.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpDelete(ApiRoutes.ById)]
    public async Task<IActionResult> Delete(int id)
    {
        await service.Delete(id);
        return NoContent();
    }

    /// <summary>Update staff member active status</summary>
    /// <remarks>
    /// Sets isActive to the explicit true or false value supplied by the Admin without deleting the staff member. The
    /// isActive field is required. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <param name="request">Validated request fields accepted by this endpoint.</param>
    /// <response code="204">Operation completed successfully; no response body.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpPatch(ApiRoutes.Status)]
    public async Task<IActionResult> Active(int id, ActiveRequest request)
    {
        await rules.SetActive<Staff>(id, request.IsActive!.Value);
        return NoContent();
    }
}


using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.Plate;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChocoRobot.Controllers;

[ApiController, Route(ApiRoutes.Plates), Authorize(Roles = SystemRoles.Admin)]
public class PlateController(
    ICrudService<Plate, CreateRequest, UpdateRequest, ResponseDto> service) : ControllerBase
{
    /// <summary>Get all plates</summary>
    /// <remarks>
    /// Returns a paginated list of plates read from SQL Server. Supports pageNumber, pageSize, search, sortBy and
    /// descending. Responses include type, shape, dimensions, material, color name, HEX code, price and stock. Prices and
    /// stock must be non-negative; the color name is synchronized from colorId. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="filter">Pagination, search, sorting and resource-specific query filters.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ApiResponse<PagedResult<ResponseDto>>> List([FromQuery] FilterRequest filter)
    {
        return new ApiResponse<PagedResult<ResponseDto>>(
            true,
            ApiMessages.Retrieved,
            await service.List(filter));
    }

    /// <summary>Get plate by ID</summary>
    /// <remarks>
    /// Returns the stored plate identified by the route ID, or 404 when it does not exist. Responses include type, shape,
    /// dimensions, material, color name, HEX code, price and stock. Prices and stock must be non-negative; the color name
    /// is synchronized from colorId. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.ById)]
    [AllowAnonymous]
    public async Task<ApiResponse<ResponseDto>> Get(int id)
    {
        return new ApiResponse<ResponseDto>(
            true,
            ApiMessages.Retrieved,
            await service.Get(id));
    }

    /// <summary>Create new plate</summary>
    /// <remarks>
    /// Validates the request and referenced records, then saves a new plate to SQL Server. The server assigns the primary
    /// key. Responses include type, shape, dimensions, material, color name, HEX code, price and stock. Prices and stock
    /// must be non-negative; the color name is synchronized from colorId. Requires an authenticated Admin.
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

    /// <summary>Update plate information</summary>
    /// <remarks>
    /// Updates the plate identified by the route ID after validating the request and references. Server-managed fields
    /// cannot be overwritten. Responses include type, shape, dimensions, material, color name, HEX code, price and stock.
    /// Prices and stock must be non-negative; the color name is synchronized from colorId. Requires an authenticated
    /// Admin.
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

    /// <summary>Delete plate</summary>
    /// <remarks>
    /// Deletes the plate identified by the route ID. A foreign key reference prevents deletion and returns a conflict.
    /// Responses include type, shape, dimensions, material, color name, HEX code, price and stock. Prices and stock must
    /// be non-negative; the color name is synchronized from colorId. Requires an authenticated Admin.
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

    /// <summary>Get plates by color</summary>
    /// <remarks>
    /// Returns a paginated list of plates whose colorId matches the route ID. Other supported plate filters, search and
    /// sorting remain available. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <param name="filter">Pagination, search, sorting and resource-specific query filters.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.ByColor)]
    [AllowAnonymous]
    public Task<ApiResponse<PagedResult<ResponseDto>>> ByColorId(int id, [FromQuery] FilterRequest filter)
    {
        filter.ColorId = id;
        return List(filter);
    }

    /// <summary>Get plates by type</summary>
    /// <remarks>
    /// Returns a paginated list of plates whose typeId matches the route ID, including type details, color details, price
    /// and stock. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <param name="filter">Pagination, search, sorting and resource-specific query filters.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.ByType)]
    [AllowAnonymous]
    public Task<ApiResponse<PagedResult<ResponseDto>>> ByTypeId(int id, [FromQuery] FilterRequest filter)
    {
        filter.TypeId = id;
        return List(filter);
    }
}


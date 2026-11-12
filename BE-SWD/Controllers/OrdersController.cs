using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.Order;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChocoRobot.Controllers;

[ApiController, Route(ApiRoutes.Orders), Authorize(Roles = SystemRoles.Admin)]
public class OrderController(
    ICrudService<Order, CreateRequest, UpdateRequest, ResponseDto> service,
    BusinessRules rules) : ControllerBase
{
    /// <summary>Get all orders</summary>
    /// <remarks>
    /// Returns a paginated list of orders read from SQL Server. Supports pageNumber, pageSize, search, sortBy and
    /// descending. Each order contains one plate, with no quantity or order details. The server generates a unique order
    /// code and derives the amount from the plate price. Customer, plate and compatible active template must exist.
    /// Requires an authenticated Admin.
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

    /// <summary>Get order by ID</summary>
    /// <remarks>
    /// Returns the stored order identified by the route ID, or 404 when it does not exist. Each order contains one plate,
    /// with no quantity or order details. The server generates a unique order code and derives the amount from the plate
    /// price. Customer, plate and compatible active template must exist. Requires an authenticated Admin.
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

    /// <summary>Create new order</summary>
    /// <remarks>
    /// Validates the request and referenced records, then saves a new order to SQL Server. The server assigns the primary
    /// key. Each order contains one plate, with no quantity or order details. The server generates a unique order code and
    /// derives the amount from the plate price. Customer, plate and compatible active template must exist. New orders
    /// start as Pending; stock is checked but not reserved until Processing. Requires an authenticated Admin.
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

    /// <summary>Update pending order</summary>
    /// <remarks>
    /// Updates the order identified by the route ID after validating the request and references. Server-managed fields
    /// cannot be overwritten. Each order contains one plate, with no quantity or order details. The server generates a
    /// unique order code and derives the amount from the plate price. Customer, plate and compatible active template must
    /// exist. Only Pending orders can be edited, and the amount is recalculated from the selected plate. Requires an
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

    /// <summary>Update order status</summary>
    /// <remarks>
    /// Allows Pending to Processing or Cancelled, and Processing to Completed or Cancelled. Entering Processing deducts
    /// one unit of stock; cancellation from Processing returns it. Order and stock changes share a Serializable
    /// transaction. Completed and Cancelled are terminal states. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <param name="request">Validated request fields accepted by this endpoint.</param>
    /// <response code="204">Operation completed successfully; no response body.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="409">The operation conflicts with a business rule, existing record or database reference.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpPatch(ApiRoutes.Status)]
    public async Task<IActionResult> Status(int id, StatusRequest request)
    {
        await rules.OrderStatus(id, request.Status);
        return NoContent();
    }

    /// <summary>Get orders by customer</summary>
    /// <remarks>
    /// Returns a paginated list of stored orders belonging to the customer identifier in the route, with search and
    /// sorting support. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <param name="filter">Pagination, search, sorting and resource-specific query filters.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.ByCustomer)]
    public Task<ApiResponse<PagedResult<ResponseDto>>> ByCustomerId(int id, [FromQuery] FilterRequest filter)
    {
        filter.CustomerId = id;
        return List(filter);
    }
}


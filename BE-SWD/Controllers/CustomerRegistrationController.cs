using ChocoRobot.Common;
using ChocoRobot.Configuration;
using ChocoRobot.DTOs.Customer;
using ChocoRobot.Helpers;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChocoRobot.Controllers;

[ApiController, Route(ApiRoutes.Customers)]
public sealed class CustomerRegistrationController(
    ICrudService<Customer, CreateRequest, UpdateRequest, ResponseDto> service,
    CustomerRegistrationGuard guard) : ControllerBase
{
    /// <summary>Submit customer contact information for an order</summary>
    /// <remarks>Public endpoint; no JWT, account or password required. Accepts only fullName, phone and email. SQL Server generates id and created_at. Returns only the new customer ID for order correlation. Submission does not verify identity or ownership of the email/phone, and the ID grants no access to customer records. Rate limits and duplicate cooldown apply; repeated attempts, including failed attempts, may return 429.</remarks>
    /// <param name="request">Customer contact details supplied for ordering.</param>
    /// <response code="201">Contact information saved. No personal details or credentials are returned.</response>
    /// <response code="400">Invalid contact details or unsupported request fields.</response>
    /// <response code="413">Request body is too large.</response>
    /// <response code="429">Too many submissions. Try again later.</response>
    [HttpPost, AllowAnonymous, EnableRateLimiting(CustomerRegistrationOptions.RatePolicy)]
    [RequestSizeLimit(4096), Consumes("application/json")]
    [ProducesResponseType(typeof(ApiResponse<RegistrationResponse>), 201)]
    public async Task<IActionResult> Register(CreateRequest request)
    {
        guard.Check(request);
        var created = await service.Create(request);
        Response.Headers.CacheControl = "no-store";
        return StatusCode(201, new ApiResponse<RegistrationResponse>(true, "Contact information saved", new(created.Id)));
    }
}


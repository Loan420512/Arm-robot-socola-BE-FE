using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.Auth;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChocoRobot.Controllers;

[ApiController, Route(ApiRoutes.Auth), Authorize(Roles = SystemRoles.Admin)]
public class AuthController(
    AuthService service) : ControllerBase
{
    /// <summary>Admin login</summary>
    /// <remarks>
    /// Verifies the username and BCrypt password against the ADMIN table and requires the Admin role. Returns a signed
    /// JWT, its configured lifetime and the Admin profile. This endpoint is anonymous and rate-limited; it never creates
    /// an account.
    /// </remarks>
    /// <param name="request">Validated request fields accepted by this endpoint.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">Invalid Admin credentials.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpPost(ApiRoutes.Login), AllowAnonymous, EnableRateLimiting(AuthDefinitions.LoginRatePolicy)]
    public async Task<ApiResponse<LoginResponse>> Login(LoginRequest request)
    {
        return new ApiResponse<LoginResponse>(
            true,
            "Login successful",
            await service.Login(request));
    }

    /// <summary>Get current admin profile</summary>
    /// <remarks>
    /// Returns the current Admin profile from SQL Server using the authenticated JWT user identifier. Password hashes are
    /// never included. Requires an authenticated Admin.
    /// </remarks>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.Me)]
    public async Task<ApiResponse<UserDto>> Me()
    {
        return new ApiResponse<UserDto>(
            true,
            ApiMessages.Retrieved,
            await service.Me());
    }

    /// <summary>Change admin password</summary>
    /// <remarks>
    /// Verifies currentPassword, validates newPassword and saves its BCrypt hash for the signed-in Admin. Returns no
    /// response body. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="request">Validated request fields accepted by this endpoint.</param>
    /// <response code="204">Operation completed successfully; no response body.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpPost(ApiRoutes.ChangePassword)]
    public async Task<IActionResult> Change(ChangePasswordRequest request)
    {
        await service.Change(request);
        return NoContent();
    }
}


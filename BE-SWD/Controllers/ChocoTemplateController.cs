using ChocoRobot.Helpers;
using ChocoRobot.Common;
using ChocoRobot.DTOs.ChocoTemplate;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChocoRobot.Controllers;

[ApiController, Route(ApiRoutes.ChocoTemplates), Authorize(Roles = SystemRoles.Admin)]
public class ChocoTemplateController(
    ICrudService<ChocoTemplate, CreateRequest, UpdateRequest, ResponseDto> service, TemplateImageService images) : ControllerBase
{
    /// <summary>Upload a chocolate template preview image</summary>
    /// <remarks>Admin only. Upload PNG/JPEG using multipart/form-data. The file is stored on Cloudinary and imagePreviewUrl is the public Cloudinary URL. Saving the template record is still a separate request.</remarks>
    /// <param name="request">Image selected from your computer.</param>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <response code="200">Image stored; use data.imagePreviewUrl when creating or updating a template.</response>
    /// <response code="400">Empty, oversized, unsupported or corrupt image.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">Only Admin may upload.</response>
    /// <response code="413">Multipart request exceeds the configured request limit.</response>
    [HttpPost("upload-image")]
    [Consumes("multipart/form-data")]
    public async Task<ApiResponse<UploadImageResponse>> UploadImage([FromForm] UploadImageRequest request, CancellationToken cancellationToken)
    {
        var url = await images.Upload(request.File, Request.PathBase, cancellationToken);
        return new(true, "Image uploaded", new UploadImageResponse(url));
    }
    /// <summary>Get all chocolate templates</summary>
    /// <remarks>
    /// Returns a paginated list of chocolate templates read from SQL Server. Supports pageNumber, pageSize, search, sortBy
    /// and descending. Stores the compatible plate type, designer reference, preview image URL and G-code file URL. This
    /// API does not generate G-code or control a robot. Requires an authenticated Admin.
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

    /// <summary>Get chocolate template by ID</summary>
    /// <remarks>
    /// Returns the stored chocolate template identified by the route ID, or 404 when it does not exist. Stores the
    /// compatible plate type, designer reference, preview image URL and G-code file URL. This API does not generate G-code
    /// or control a robot. Requires an authenticated Admin.
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

    /// <summary>Create chocolate template</summary>
    /// <remarks>
    /// Validates the request and referenced records, then saves a new chocolate template to SQL Server. The server assigns
    /// the primary key. Stores the compatible plate type, designer reference, preview image URL and G-code file URL. This
    /// API does not generate G-code or control a robot. Requires an authenticated Admin.
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

    /// <summary>Update chocolate template</summary>
    /// <remarks>
    /// Updates the chocolate template identified by the route ID after validating the request and references.
    /// Server-managed fields cannot be overwritten. Stores the compatible plate type, designer reference, preview image
    /// URL and G-code file URL. This API does not generate G-code or control a robot. Requires an authenticated Admin.
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

    /// <summary>Delete chocolate template</summary>
    /// <remarks>
    /// Deletes the chocolate template identified by the route ID. A foreign key reference prevents deletion and returns a
    /// conflict. Stores the compatible plate type, designer reference, preview image URL and G-code file URL. This API
    /// does not generate G-code or control a robot. Requires an authenticated Admin.
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

    /// <summary>Get chocolate templates by plate type</summary>
    /// <remarks>
    /// Returns a paginated list of chocolate templates assigned to the plate type in the route, including their preview
    /// and G-code file URLs. Requires an authenticated Admin.
    /// </remarks>
    /// <param name="id">Identifier of the record or referenced entity specified by this route.</param>
    /// <param name="filter">Pagination, search, sorting and resource-specific query filters.</param>
    /// <response code="200">Requested data returned in the standard success envelope.</response>
    /// <response code="400">The request failed input validation.</response>
    /// <response code="401">A valid JWT is required.</response>
    /// <response code="403">The authenticated user does not have the Admin role.</response>
    /// <response code="404">The requested record was not found.</response>
    /// <response code="500">An internal or database error prevented the operation.</response>
    [HttpGet(ApiRoutes.ByPlateType)]
    [AllowAnonymous]
    public Task<ApiResponse<PagedResult<ResponseDto>>> ByPlateTypeId(int id, [FromQuery] FilterRequest filter)
    {
        filter.PlateTypeId = id;
        return List(filter);
    }
}



using System.Text.Json;
using ChocoRobot.Common;
using ChocoRobot.Configuration;
using ChocoRobot.DTOs.Order;
using ChocoRobot.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChocoRobot.Controllers;

[ApiController]
public sealed class PayOsCheckoutController(PayOsService payOs) : ControllerBase
{
    /// <summary>Create an order and a PayOS payment link</summary>
    /// <remarks>Public endpoint; no JWT required. Saves customer contact, creates a Pending order from the plate price and returns a PayOS checkoutUrl for that order. Rate limits apply. This endpoint intentionally does not use the customer-registration duplicate guard so a checkout right after saving contact info is not rejected with 429.</remarks>
    /// <param name="request">Customer contact plus plate and template selection.</param>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <response code="201">Order created; open checkoutUrl to pay with PayOS.</response>
    /// <response code="400">Invalid contact, plate or template.</response>
    /// <response code="409">Plate is out of stock.</response>
    /// <response code="429">Too many submissions. Try again later.</response>
    /// <response code="502">PayOS did not return a payment link.</response>
    [HttpPost(ApiRoutes.PayOsCheckout), AllowAnonymous, EnableRateLimiting(PayOsOptions.RatePolicy)]
    [RequestSizeLimit(4096), Consumes("application/json")]
    [ProducesResponseType(typeof(ApiResponse<CheckoutResponse>), 201)]
    public async Task<IActionResult> Checkout(CheckoutRequest request, CancellationToken cancellationToken)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        if (Request.Headers.TryGetValue("Origin", out var origin)
            && Uri.TryCreate(origin.ToString(), UriKind.Absolute, out var originUri)
            && (originUri.Scheme == Uri.UriSchemeHttp || originUri.Scheme == Uri.UriSchemeHttps))
        {
            baseUrl = originUri.GetLeftPart(UriPartial.Authority);
        }
        var created = await payOs.CreateCheckout(request, baseUrl, cancellationToken);
        Response.Headers.CacheControl = "no-store";
        return StatusCode(201, new ApiResponse<CheckoutResponse>(true, ApiMessages.Created, created));
    }

    /// <summary>Retry a failed PayOS payment reusing the existing order</summary>
    /// <remarks>Public endpoint; no JWT required. Creates a fresh PayOS payment link for an existing Pending order that has no successful payment yet. Refuses when the plate price no longer equals the order total, so a price change must start a new invoice. Rate limits apply.</remarks>
    /// <param name="request">Existing order id.</param>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <response code="200">New PayOS link created for the existing order.</response>
    /// <response code="404">Order not found.</response>
    /// <response code="409">Order is already paid or no longer pending.</response>
    /// <response code="502">PayOS did not return a payment link.</response>
    [HttpPost(ApiRoutes.PayOsRetry), AllowAnonymous, EnableRateLimiting(PayOsOptions.RatePolicy)]
    [RequestSizeLimit(1024), Consumes("application/json")]
    [ProducesResponseType(typeof(ApiResponse<CheckoutResponse>), 200)]
    public async Task<IActionResult> Retry(RetryCheckoutRequest request, CancellationToken cancellationToken)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        if (Request.Headers.TryGetValue("Origin", out var origin)
            && Uri.TryCreate(origin.ToString(), UriKind.Absolute, out var originUri)
            && (originUri.Scheme == Uri.UriSchemeHttp || originUri.Scheme == Uri.UriSchemeHttps))
        {
            baseUrl = originUri.GetLeftPart(UriPartial.Authority);
        }
        var created = await payOs.RetryCheckout(request.OrderId!.Value, baseUrl, cancellationToken);
        Response.Headers.CacheControl = "no-store";
        return Ok(new ApiResponse<CheckoutResponse>(true, ApiMessages.Created, created));
    }

    /// <summary>Check whether a PayOS payment has been received</summary>
    /// <remarks>Public endpoint. Asks PayOS for the latest link of this order and marks the payment Success when PayOS reports PAID. Used because a bank-app scan does not redirect the browser.</remarks>
    /// <param name="orderId">Existing order id returned by checkout.</param>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <response code="200">Current payment status.</response>
    /// <response code="404">Order not found.</response>
    [HttpGet(ApiRoutes.PayOsStatus), AllowAnonymous]
    public async Task<IActionResult> Status(int orderId, CancellationToken cancellationToken)
    {
        var status = await payOs.GetStatus(orderId, cancellationToken);
        Response.Headers.CacheControl = "no-store";
        return Ok(new ApiResponse<PaymentStatusResponse>(true, ApiMessages.Retrieved, status));
    }

    /// <summary>PayOS payment webhook</summary>
    /// <remarks>Called by PayOS after payment. Verifies the HMAC signature with the checksum key, then marks the matching payment Success or Failed. Always returns 200 for unknown transactions so PayOS stops retrying.</remarks>
    /// <param name="payload">Raw PayOS webhook body.</param>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <response code="200">Webhook acknowledged.</response>
    [HttpPost(ApiRoutes.PayOsWebhook), AllowAnonymous]
    [Consumes("application/json")]
    public async Task<IActionResult> Webhook([FromBody] JsonElement payload, CancellationToken cancellationToken)
    {
        await payOs.HandleWebhook(payload, cancellationToken);
        return Ok(new { success = true });
    }
}

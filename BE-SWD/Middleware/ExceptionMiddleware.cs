using System.ComponentModel.DataAnnotations;
using Microsoft.Data.SqlClient;

namespace ChocoRobot.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            var sqlException = exception as SqlException ?? exception.InnerException as SqlException;
            var statusCode = ResolveStatusCode(exception, sqlException);
            var message = ResolveMessage(exception, statusCode);

            // Không ghi nội dung SQL, connection string hoặc dữ liệu nhạy cảm vào log.
            logger.LogError(
                "Request failed. Trace {TraceId}, type {ErrorType}, SQL code {Code}",
                context.TraceIdentifier,
                exception.GetType().Name,
                sqlException?.Number);

            context.Response.StatusCode = statusCode;
            var response = new ApiResponse<object>(
                false,
                message,
                null,
                new
                {
                    traceId = context.TraceIdentifier
                });
            await context.Response.WriteAsJsonAsync(response);
        }
    }

    private static int ResolveStatusCode(Exception exception, SqlException? sqlException)
    {
        if (exception is ApiException apiException)
        {
            return apiException.Status;
        }

        if (exception is BadHttpRequestException requestException)
            return requestException.StatusCode;

        if (sqlException?.Number is 2601 or 2627 or 547 or 1205)
        {
            return StatusCodes.Status409Conflict;
        }

        return exception is ValidationException
            ? StatusCodes.Status400BadRequest
            : StatusCodes.Status500InternalServerError;
    }

    private static string ResolveMessage(Exception exception, int statusCode)
    {
        if (exception is ApiException)
        {
            return exception.Message;
        }

        return statusCode switch
        {
            StatusCodes.Status413PayloadTooLarge => "Request body is too large",
            StatusCodes.Status409Conflict => "Data conflicts with an existing record or reference",
            StatusCodes.Status400BadRequest => ApiMessages.ValidationFailed,
            _ => "Unable to process the request"
        };
    }
}


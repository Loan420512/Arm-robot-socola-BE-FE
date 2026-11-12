using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ChocoRobot.Helpers;

public class SwaggerResponses : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var errorResponses = new (string Code, string Description)[]
        {
            ("400", ApiMessages.ValidationFailed),
            ("401", ApiMessages.AuthenticationRequired),
            ("403", "Admin access required"),
            ("404", ApiMessages.NotFound),
            ("409", "Business rule or database constraint conflict"),
            ("500", "Internal server error")
        };

        foreach (var error in errorResponses)
        {
            var schema = context.SchemaGenerator.GenerateSchema(
                typeof(ApiResponse<object>),
                context.SchemaRepository);
            var response = new OpenApiResponse
            {
                Description = error.Description,
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/json"] = new OpenApiMediaType
                    {
                        Schema = schema,
                        Example = new OpenApiObject
                        {
                            ["success"] = new OpenApiBoolean(false),
                            ["message"] = new OpenApiString(error.Description),
                            ["data"] = new OpenApiNull(),
                            ["errors"] = new OpenApiNull()
                        }
                    }
                }
            };

            operation.Responses.TryAdd(error.Code, response);
        }

        var returnsActionResult = context.MethodInfo.ReturnType == typeof(Task<IActionResult>);
        var isNoContentMethod = context.ApiDescription.HttpMethod is "DELETE" or "PATCH"
            || context.MethodInfo.DeclaringType == typeof(Controllers.AuthController)
                && context.MethodInfo.Name == nameof(Controllers.AuthController.Change);
        if (returnsActionResult && isNoContentMethod)
        {
            operation.Responses.Remove("200");
            operation.Responses.TryAdd("204", new OpenApiResponse { Description = "No content" });
        }
    }
}

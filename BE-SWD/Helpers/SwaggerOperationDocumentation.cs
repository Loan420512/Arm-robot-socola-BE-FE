using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ChocoRobot.Helpers;

public sealed class SwaggerOperationDocumentation : IOperationFilter
{
    private static readonly IReadOnlyDictionary<string, string> ParameterDescriptions =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["id"] = "Identifier of the record or referenced entity in this route.",
            ["pageNumber"] = "One-based page number. Defaults to 1.",
            ["pageSize"] = "Number of records per page, from 1 to 100. Defaults to 10.",
            ["search"] = "Search the text fields of this resource. Customer search covers name, phone and email.",
            ["sortBy"] = "Property name used for sorting. Defaults to Id; password hashes cannot be used.",
            ["descending"] = "Set to true for descending sort order. Defaults to false.",
            ["colorId"] = "Filter plates by the identifier of an existing plate color.",
            ["typeId"] = "Filter plates by the identifier of an existing plate type.",
            ["plateTypeId"] = "Filter chocolate templates by their plate type.",
            ["templateId"] = "Filter design elements by their chocolate template.",
            ["customerId"] = "Filter orders by customer identifier.",
            ["isActive"] = "Filter records by active status where this resource supports it.",
            ["inStock"] = "For plates, true selects positive stock; false selects zero stock.",
            ["minPrice"] = "Minimum plate price, inclusive. Must be non-negative.",
            ["maxPrice"] = "Maximum plate price, inclusive. Must not be less than minPrice."
        };

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var group = context.MethodInfo.DeclaringType?.GetCustomAttribute<SwaggerGroupAttribute>()
            ?? throw new InvalidOperationException("Every API controller must declare a Swagger documentation group.");
        operation.Tags = new List<OpenApiTag> { new() { Name = group.Name } };

        // XML comments là nguồn mô tả; không tạo API giả để bổ sung tài liệu.
        if (string.IsNullOrWhiteSpace(operation.Summary) || string.IsNullOrWhiteSpace(operation.Description))
        {
            throw new InvalidOperationException($"Missing XML summary or remarks for {context.MethodInfo.Name}.");
        }

        foreach (var parameter in operation.Parameters)
        {
            if (string.IsNullOrWhiteSpace(parameter.Description)
                && ParameterDescriptions.TryGetValue(parameter.Name, out var description))
            {
                parameter.Description = description;
            }
        }

        if (operation.RequestBody is not null && string.IsNullOrWhiteSpace(operation.RequestBody.Description))
        {
            operation.RequestBody.Description = "Request fields defined by this endpoint's DTO. Server-managed fields are not writable.";
        }

        if (context.MethodInfo.IsDefined(typeof(AllowAnonymousAttribute), true))
        {
            operation.Security = new List<OpenApiSecurityRequirement>();
            return;
        }

        operation.Security = new List<OpenApiSecurityRequirement>
        {
            new()
            {
                [new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = AuthDefinitions.BearerScheme
                    }
                }] = Array.Empty<string>()
            }
        };
    }
}

using System.Reflection;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ChocoRobot.Helpers;

// Swagger và validation luôn dùng cùng catalogue giá trị hợp lệ.
public class BusinessValueSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        var attribute = FindAllowedValues(context.MemberInfo);
        if (attribute is not null)
        {
            schema.Enum = BusinessValues.For(attribute.Set)
                .Select(value => (IOpenApiAny)new OpenApiString(value))
                .ToList();
        }

        if (context.MemberInfo?.IsDefined(typeof(MustBeTrueAttribute), true) == true)
        {
            schema.Enum = new List<IOpenApiAny> { new OpenApiBoolean(true) };
            schema.Description = "Explicit confirmation by the Admin that the cash payment has actually been received.";
        }
    }

    private static AllowedBusinessValueAttribute? FindAllowedValues(MemberInfo? member)
    {
        var propertyAttribute = member?.GetCustomAttributes(typeof(AllowedBusinessValueAttribute), true)
            .Cast<AllowedBusinessValueAttribute>()
            .SingleOrDefault();

        if (propertyAttribute is not null || member?.DeclaringType is null)
        {
            return propertyAttribute;
        }

        // Record có thể đặt validation trên tham số constructor thay vì property.
        return member.DeclaringType.GetConstructors()
            .SelectMany(constructor => constructor.GetParameters())
            .Where(parameter => string.Equals(parameter.Name, member.Name, StringComparison.OrdinalIgnoreCase))
            .SelectMany(parameter => parameter.GetCustomAttributes(typeof(AllowedBusinessValueAttribute), true))
            .Cast<AllowedBusinessValueAttribute>()
            .FirstOrDefault();
    }
}

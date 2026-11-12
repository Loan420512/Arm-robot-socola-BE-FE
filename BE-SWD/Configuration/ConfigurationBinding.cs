using System.ComponentModel.DataAnnotations;
using System.Text;
using Microsoft.Extensions.Options;

namespace ChocoRobot.Configuration;

public static class ConfigurationBinding
{
    public static T BindValidatedOptions<T>(this WebApplicationBuilder builder, string section)
        where T : class, new()
    {
        var options = builder.Configuration.GetSection(section).Get<T>() ?? new T();
        var validationResults = new List<ValidationResult>();
        Validator.TryValidateObject(
            options,
            new ValidationContext(options),
            validationResults,
            validateAllProperties: true);

        var failures = new List<string>();
        foreach (var result in validationResults)
        {
            foreach (var member in result.MemberNames.DefaultIfEmpty(string.Empty))
            {
                var configurationKey = string.IsNullOrEmpty(member) ? section : $"{section}:{member}";
                failures.Add($"{configurationKey}: {result.ErrorMessage}");
            }
        }

        if (options is JwtOptions jwt && !string.IsNullOrWhiteSpace(jwt.Secret))
        {
            var secretLength = Encoding.UTF8.GetByteCount(jwt.Secret);
            if (secretLength < ValidationRules.MinimumJwtSecretBytes)
            {
                failures.Add(
                    $"{JwtOptions.Section}:{nameof(JwtOptions.Secret)} must contain at least "
                    + $"{ValidationRules.MinimumJwtSecretBytes} bytes");
            }
        }

        if (failures.Count > 0)
        {
            // Chỉ hướng dẫn cấu hình key, không ghi giá trị secret vào thông báo lỗi.
            if (options is JwtOptions)
            {
                failures.Add(
                    "Supply Jwt:Secret with .NET User Secrets in Development or Jwt__Secret as an environment variable. "
                    + "Run scripts/Initialize-DevelopmentSecrets.ps1; see STARTUP.md. Never commit the secret. "
                    + "User Secrets load automatically only in Development; an empty environment variable overrides the stored secret.");
            }

            throw new OptionsValidationException(section, typeof(T), failures);
        }

        builder.Services.AddSingleton<IOptions<T>>(Options.Create(options));
        return options;
    }
}

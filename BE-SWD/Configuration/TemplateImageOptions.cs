using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.Configuration;

public sealed class TemplateImageOptions : IValidatableObject
{
    public const string Section = "TemplateImages";
    [Required] public string StoragePath { get; set; } = "App_Data/template-images";
    [Required] public string RequestPath { get; set; } = "/uploads/choco-templates";
    [Range(1, 20 * 1024 * 1024)] public int MaxFileBytes { get; set; } = 5 * 1024 * 1024;
    [Range(1, 40000000)] public int MaxPixels { get; set; } = 16000000;
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (!RequestPath.StartsWith('/') || RequestPath.StartsWith("//") || RequestPath.Contains("..")
            || RequestPath.Any(c => !(char.IsAsciiLetterOrDigit(c) || c is '/' or '-' or '_')) || RequestPath.EndsWith('/'))
            yield return new ValidationResult("Use an absolute URL path without a trailing slash.", [nameof(RequestPath)]);
    }
}

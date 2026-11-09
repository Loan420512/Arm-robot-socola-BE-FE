using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.ChocoTemplate;

public sealed class UploadImageRequest
{
    /// <summary>PNG or JPEG image file.</summary>
    [Required] public IFormFile File { get; set; } = null!;
}

public sealed record UploadImageResponse(string ImagePreviewUrl);

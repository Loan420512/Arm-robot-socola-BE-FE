namespace ChocoRobot.Configuration;

public sealed class CloudinaryOptions
{
    public const string Section = "Cloudinary";
    public string CloudName { get; set; } = string.Empty;
    public string UploadPreset { get; set; } = string.Empty;
}

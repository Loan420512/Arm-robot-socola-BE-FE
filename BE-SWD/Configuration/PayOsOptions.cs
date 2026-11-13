using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.Configuration;

public sealed class PayOsOptions
{
    public const string Section = "PayOs";
    public const string RatePolicy = "payos-checkout";

    [Required, MinLength(8)]
    public string ClientId { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string ApiKey { get; set; } = string.Empty;

    [Required, MinLength(16)]
    public string ChecksumKey { get; set; } = string.Empty;

    [Range(1, 100)] public int PermitLimit { get; set; } = 10;
    [Range(1, 3600)] public int WindowSeconds { get; set; } = 60;
}

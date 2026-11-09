using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.Configuration;

public sealed class JwtOptions
{
    public const string Section = "Jwt";
    [Required]
    public string Issuer { get; set; } = string.Empty;

    [Required]
    public string Audience { get; set; } = string.Empty;

    [Required]
    public string Secret { get; set; } = string.Empty;

    [Range(60, 86400)]
    public int LifetimeSeconds { get; set; } = 3600;

    [Range(0, 300)]
    public int ClockSkewSeconds { get; set; } = 15;
}

public sealed class SecurityOptions
{
    public const string Section = "Security";
    [Range(10, 16)]
    public int BcryptWorkFactor { get; set; } = 12;

    [Range(1, 1000)]
    public int LoginPermitLimit { get; set; } = 10;

    [Range(1, 3600)]
    public int LoginWindowSeconds { get; set; } = 60;
}

public sealed class ReportingOptions
{
    public const string Section = "Reporting";
    [Range(1, 100)]
    public int TopPlatesLimit { get; set; } = 10;
}

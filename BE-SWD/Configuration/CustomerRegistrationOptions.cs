using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.Configuration;

public sealed class CustomerRegistrationOptions
{
    public const string Section = "CustomerRegistration";
    public const string RatePolicy = "customer-registration";
    [Range(1, 100)] public int PermitLimit { get; set; } = 5;
    [Range(1, 3600)] public int WindowSeconds { get; set; } = 60;
    [Range(1, 10000)] public int GlobalPermitLimit { get; set; } = 100;
    [Range(1, 3600)] public int DuplicateCooldownSeconds { get; set; } = 60;
}

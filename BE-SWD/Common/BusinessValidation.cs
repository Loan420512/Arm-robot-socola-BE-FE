using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.Common;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class AllowedBusinessValueAttribute(BusinessValueSet set) : ValidationAttribute
{
    public BusinessValueSet Set { get; } = set;

    public override bool IsValid(object? value)
    {
        if (value is null)
        {
            return true;
        }

        return value is string text && BusinessValues.For(Set).Contains(text, StringComparer.Ordinal);
    }

    public override string FormatErrorMessage(string name)
    {
        var validValues = string.Join(", ", BusinessValues.For(Set));
        return $"{name} must be one of: {validValues}";
    }
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MustBeTrueAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) => value is true;
    public override string FormatErrorMessage(string name) => $"{name} must explicitly confirm that cash was actually received";
}

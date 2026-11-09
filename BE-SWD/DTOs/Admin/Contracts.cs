using System.ComponentModel.DataAnnotations;
using ChocoRobot.Common;

namespace ChocoRobot.DTOs.Admin;

public class CreateRequest
{
    [Required]
    [MaxLength(100)]
    public string? Username
    {
        get; set;
    }

    [Required]
    [MaxLength(100)]
    [EmailAddress]
    public string? Email
    {
        get; set;
    }

    [Required, MinLength(ValidationRules.MinimumPasswordLength), MaxLength(ValidationRules.MaximumPasswordBytes)]
    public string Password { get; set; } = null!;
}

public class UpdateRequest : CreateRequest
{
}

public class ResponseDto
{
    public int Id
    {
        get; set;
    }
    public string? Username
    {
        get; set;
    }
    public string? Email
    {
        get; set;
    }
    public string? Role
    {
        get; set;
    }
}

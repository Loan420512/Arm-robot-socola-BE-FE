using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.Customer;

[System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
public class CreateRequest
{
    [Required]
    [MaxLength(100)]
    public string? FullName
    {
        get; set;
    }

    [Required]
    [MaxLength(20)]
    [Phone]
    [RegularExpression(@"\+?[0-9]{8,15}", ErrorMessage = "Phone must contain 8 to 15 digits with an optional leading +.")]
    public string? Phone
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
    public string? FullName
    {
        get; set;
    }
    public string? Phone
    {
        get; set;
    }
    public string? Email
    {
        get; set;
    }
    public DateTime? CreatedAt
    {
        get; set;
    }
}

public sealed record RegistrationResponse(int CustomerId);


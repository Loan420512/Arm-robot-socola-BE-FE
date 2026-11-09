using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.Customer;

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

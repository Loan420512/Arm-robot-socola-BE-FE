using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.DTOs.Staff;

public class CreateRequest
{
    [Required]
    [MaxLength(100)]
    public string? FullName
    {
        get; set;
    }

    [Required]
    [MaxLength(50)]
    public string? EmployeeCode
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

    [Required, AllowedBusinessValue(BusinessValueSet.StaffPositions)]
    [MaxLength(30)]
    public string? Position
    {
        get; set;
    }

    [Required]
    public bool? IsActive
    {
        get; set;
    }
}

public class UpdateRequest : CreateRequest
{
    // Preserve the existing update contract for optional Admin associations.
    [Required]
    public int? AdminId { get; set; }
}

public class ResponseDto
{
    public int Id
    {
        get; set;
    }
    public int? AdminId
    {
        get; set;
    }
    public string? FullName
    {
        get; set;
    }
    public string? EmployeeCode
    {
        get; set;
    }
    public string? Phone
    {
        get; set;
    }
    public string? Position
    {
        get; set;
    }
    public bool? IsActive
    {
        get; set;
    }
}


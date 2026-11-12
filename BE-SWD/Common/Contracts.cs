using System.ComponentModel.DataAnnotations;

namespace ChocoRobot.Common;

public record ApiResponse<T>(bool Success, string Message, T? Data, object? Errors = null);
public record PagedResult<T>(IReadOnlyList<T> Items, int PageNumber, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

public class FilterRequest
{
    [Range(1, int.MaxValue)]
    public int PageNumber { get; set; } = 1;

    [Range(1, ValidationRules.MaximumPageSize)]
    public int PageSize { get; set; } = ValidationRules.DefaultPageSize;

    [MaxLength(ValidationRules.MaximumSearchLength)]
    public string? Search
    {
        get; set;
    }
    public string? SortBy
    {
        get; set;
    }
    public bool Descending
    {
        get; set;
    }
    public int? ColorId
    {
        get; set;
    }
    public int? TypeId
    {
        get; set;
    }
    public int? PlateTypeId
    {
        get; set;
    }
    public int? TemplateId
    {
        get; set;
    }
    public int? CustomerId
    {
        get; set;
    }
    public bool? IsActive
    {
        get; set;
    }
    public bool? InStock
    {
        get; set;
    }

    [Range(0, double.MaxValue)]
    public decimal? MinPrice
    {
        get; set;
    }

    [Range(0, double.MaxValue)]
    public decimal? MaxPrice
    {
        get; set;
    }
}

public class ApiException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

public record ActiveRequest([Required] bool? IsActive);

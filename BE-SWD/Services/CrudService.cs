using System.Text.Json;
using ChocoRobot.Interfaces.Repositories;
using ChocoRobot.Interfaces.Services;
using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChocoRobot.Services;

public class CrudService<TEntity, TCreateRequest, TUpdateRequest, TResponse>(
    IRepository<TEntity> repository,
    BusinessRules businessRules)
    : ICrudService<TEntity, TCreateRequest, TUpdateRequest, TResponse>
    where TEntity : class, IEntity, new()
    where TResponse : class, new()
{
    public static TResponse Map(TEntity entity)
    {
        var json = JsonSerializer.Serialize(entity);
        return JsonSerializer.Deserialize<TResponse>(json)!;
    }

    public async Task<PagedResult<TResponse>> List(FilterRequest filter)
    {
        var page = await repository.GetPage(filter);
        var responses = new List<TResponse>();

        foreach (var entity in page.Items)
        {
            responses.Add(await EnrichResponse(entity));
        }

        return new PagedResult<TResponse>(responses, page.PageNumber, page.PageSize, page.TotalCount);
    }

    public async Task<TResponse> Get(int id)
    {
        var entity = await repository.Query().SingleOrDefaultAsync(item => item.Id == id)
            ?? throw new ApiException(StatusCodes.Status404NotFound, ApiMessages.NotFound);

        return await EnrichResponse(entity);
    }

    public async Task<TResponse> Create(TCreateRequest request)
    {
        await using var transaction = await repository.Begin();
        var entity = new TEntity();
        CopyRequestProperties(request!, entity);

        await businessRules.Before(entity, true, request!);
        repository.Add(entity);
        await repository.Save();
        await transaction.CommitAsync();

        return await EnrichResponse(entity);
    }

    public async Task<TResponse> Update(int id, TUpdateRequest request)
    {
        await using var transaction = await repository.Begin();
        var entity = await repository.Find(id)
            ?? throw new ApiException(StatusCodes.Status404NotFound, ApiMessages.NotFound);

        ValidateUpdate(entity, request);
        CopyRequestProperties(request!, entity);

        await businessRules.Before(entity, false, request!);
        await repository.Save();
        await transaction.CommitAsync();

        return await EnrichResponse(entity);
    }

    public async Task Delete(int id)
    {
        await using var transaction = await repository.Begin();
        var entity = await repository.Find(id)
            ?? throw new ApiException(StatusCodes.Status404NotFound, ApiMessages.NotFound);

        await businessRules.BeforeDelete(entity);
        repository.Remove(entity);
        await repository.Save();
        await transaction.CommitAsync();
    }

    private static void CopyRequestProperties(object request, TEntity entity)
    {
        // Chỉ sao chép các thuộc tính có mặt trong DTO ghi dữ liệu.
        foreach (var sourceProperty in request.GetType().GetProperties())
        {
            var targetProperty = typeof(TEntity).GetProperty(sourceProperty.Name);

            if (targetProperty?.CanWrite == true)
            {
                targetProperty.SetValue(entity, sourceProperty.GetValue(request));
            }
        }
    }

    private static void ValidateUpdate(TEntity entity, TUpdateRequest request)
    {
        if (entity is Order order && order.Status != StatusValues.Pending)
        {
            throw new ApiException(StatusCodes.Status409Conflict, "Only Pending orders can be edited");
        }

        if (entity is not IncidentReport incident || request is not DTOs.IncidentReport.UpdateRequest update)
        {
            return;
        }

        var isStatusChanged = incident.Status != update.Status;
        if (isStatusChanged && !Workflow.CanTransitionIncident(incident.Status, update.Status!))
        {
            throw new ApiException(StatusCodes.Status409Conflict, "Invalid incident status transition");
        }
    }

    private async Task<TResponse> EnrichResponse(TEntity entity)
    {
        var response = Map(entity);
        if (entity is not Plate plate || response is not DTOs.Plate.ResponseDto plateResponse)
        {
            return response;
        }

        var details = await businessRules.PlateDetails(plate);
        plateResponse.TypeName = details.TypeName;
        plateResponse.Shape = details.Shape;
        plateResponse.Dimensions = details.Dimensions;
        plateResponse.ColorName = details.ColorName;
        plateResponse.ColorCode = details.ColorCode;

        return response;
    }
}

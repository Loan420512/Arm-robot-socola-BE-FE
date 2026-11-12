using ChocoRobot.Common;

namespace ChocoRobot.Interfaces.Services;

public interface ICrudService<TEntity, TCreateRequest, TUpdateRequest, TResponse>
{
    Task<PagedResult<TResponse>> List(FilterRequest filter);
    Task<TResponse> Get(int id);
    Task<TResponse> Create(TCreateRequest request);
    Task<TResponse> Update(int id, TUpdateRequest request);
    Task Delete(int id);
}

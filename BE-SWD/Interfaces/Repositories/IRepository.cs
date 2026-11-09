using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore.Storage;

namespace ChocoRobot.Interfaces.Repositories;

public interface IRepository<TEntity>
    where TEntity : class, IEntity
{
    IQueryable<TEntity> Query(bool tracking = false);
    Task<PagedResult<TEntity>> GetPage(FilterRequest filter);
    Task<TEntity?> Find(int id);
    void Add(TEntity entity);
    void Remove(TEntity entity);
    Task Save();
    Task<IDbContextTransaction> Begin();
}

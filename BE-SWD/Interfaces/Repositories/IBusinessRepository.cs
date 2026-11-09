using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;

namespace ChocoRobot.Interfaces.Repositories;
// Dùng chung một DbContext cho nghiệp vụ cần cập nhật nhiều bảng trong một transaction.
public interface IBusinessRepository
{
    DbSet<TEntity> Set<TEntity>() where TEntity : class;
    ValueTask<object?> FindAsync(Type entityType, object[] keys);
    Task<int> SaveChangesAsync();
    DatabaseFacade Database
    {
        get;
    }

    IModel Model
    {
        get;
    }
}

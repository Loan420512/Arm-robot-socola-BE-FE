using ChocoRobot.Data;
using ChocoRobot.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;

namespace ChocoRobot.Repositories;

public class BusinessRepository(ChocoRobotDbContext dbContext) : IBusinessRepository
{
    public DbSet<TEntity> Set<TEntity>() where TEntity : class
    {
        return dbContext.Set<TEntity>();
    }

    public ValueTask<object?> FindAsync(Type entityType, object[] keys)
    {
        return dbContext.FindAsync(entityType, keys);
    }

    public Task<int> SaveChangesAsync()
    {
        return dbContext.SaveChangesAsync();
    }

    public DatabaseFacade Database => dbContext.Database;
    public IModel Model => dbContext.Model;
}

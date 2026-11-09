using System.Data;
using System.Linq.Expressions;
using System.Reflection;
using ChocoRobot.Data;
using ChocoRobot.Interfaces.Repositories;
using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace ChocoRobot.Repositories;

public class Repository<TEntity>(ChocoRobotDbContext dbContext) : IRepository<TEntity>
    where TEntity : class, IEntity
{
    public IQueryable<TEntity> Query(bool tracking = false)
    {
        var query = dbContext.Set<TEntity>();
        return tracking ? query : query.AsNoTracking();
    }

    public Task<TEntity?> Find(int id)
    {
        return dbContext.Set<TEntity>().SingleOrDefaultAsync(entity => entity.Id == id);
    }

    public void Add(TEntity entity)
    {
        dbContext.Add(entity);
    }

    public void Remove(TEntity entity)
    {
        dbContext.Remove(entity);
    }

    public Task Save()
    {
        return dbContext.SaveChangesAsync();
    }

    public Task<IDbContextTransaction> Begin()
    {
        // Các thao tác cập nhật nghiệp vụ dùng chung transaction với DbContext scoped.
        return dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
    }

    public async Task<PagedResult<TEntity>> GetPage(FilterRequest filter)
    {
        if (filter.MinPrice > filter.MaxPrice)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "minPrice must not exceed maxPrice");
        }

        var query = ApplyReferenceFilters(Query(), filter);
        query = ApplyPlateFilters(query, filter);
        query = ApplySearch(query, filter.Search);
        query = ApplySorting(query, filter);

        var totalCount = await query.CountAsync();
        var skip = (long)(filter.PageNumber - 1) * filter.PageSize;
        var items = new List<TEntity>();

        if (skip <= int.MaxValue)
        {
            items = await query.Skip((int)skip).Take(filter.PageSize).ToListAsync();
        }

        return new PagedResult<TEntity>(items, filter.PageNumber, filter.PageSize, totalCount);
    }

    private static IQueryable<TEntity> ApplyReferenceFilters(IQueryable<TEntity> query, FilterRequest filter)
    {
        var referenceFilters = new (string PropertyName, object? Value)[]
        {
            (nameof(filter.ColorId), filter.ColorId),
            (nameof(filter.TypeId), filter.TypeId),
            (nameof(filter.PlateTypeId), filter.PlateTypeId),
            (nameof(filter.TemplateId), filter.TemplateId),
            (nameof(filter.CustomerId), filter.CustomerId),
            (nameof(filter.IsActive), filter.IsActive)
        };

        foreach (var referenceFilter in referenceFilters)
        {
            var property = typeof(TEntity).GetProperty(referenceFilter.PropertyName);
            if (referenceFilter.Value is null || property is null)
            {
                continue;
            }

            var parameter = Expression.Parameter(typeof(TEntity), "entity");
            var propertyAccess = Expression.Property(parameter, property);
            var expectedValue = Expression.Convert(Expression.Constant(referenceFilter.Value), property.PropertyType);
            var equality = Expression.Equal(propertyAccess, expectedValue);
            var predicate = Expression.Lambda<Func<TEntity, bool>>(equality, parameter);
            query = query.Where(predicate);
        }

        return query;
    }

    private static IQueryable<TEntity> ApplyPlateFilters(IQueryable<TEntity> query, FilterRequest filter)
    {
        if (typeof(TEntity) != typeof(Plate))
        {
            return query;
        }

        var plates = (IQueryable<Plate>)(object)query;
        if (filter.MinPrice.HasValue)
        {
            plates = plates.Where(plate => plate.Price >= filter.MinPrice);
        }

        if (filter.MaxPrice.HasValue)
        {
            plates = plates.Where(plate => plate.Price <= filter.MaxPrice);
        }

        if (filter.InStock.HasValue)
        {
            plates = filter.InStock.Value
                ? plates.Where(plate => plate.StockQuantity > 0)
                : plates.Where(plate => plate.StockQuantity == 0);
        }

        return (IQueryable<TEntity>)(object)plates;
    }

    private static IQueryable<TEntity> ApplySearch(IQueryable<TEntity> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var parameter = Expression.Parameter(typeof(TEntity), "entity");
        Expression matchesAnyProperty = Expression.Constant(false);
        var searchableProperties = typeof(TEntity).GetProperties()
            .Where(property => property.PropertyType == typeof(string)
                && property.Name != nameof(Admin.PasswordHash));

        foreach (var property in searchableProperties)
        {
            var propertyAccess = Expression.Property(parameter, property);
            var isNotNull = Expression.NotEqual(propertyAccess, Expression.Constant(null, typeof(string)));
            var containsSearch = Expression.Call(
                propertyAccess,
                nameof(string.Contains),
                null,
                Expression.Constant(search));

            matchesAnyProperty = Expression.OrElse(
                matchesAnyProperty,
                Expression.AndAlso(isNotNull, containsSearch));
        }

        return query.Where(Expression.Lambda<Func<TEntity, bool>>(matchesAnyProperty, parameter));
    }

    private static IQueryable<TEntity> ApplySorting(IQueryable<TEntity> query, FilterRequest filter)
    {
        var sortBy = string.IsNullOrWhiteSpace(filter.SortBy) ? nameof(IEntity.Id) : filter.SortBy;
        var property = typeof(TEntity).GetProperty(
            sortBy,
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

        if (property is null || property.Name == nameof(Admin.PasswordHash))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid sortBy");
        }

        var parameter = Expression.Parameter(typeof(TEntity));
        var selector = Expression.Lambda(Expression.Property(parameter, property), parameter);
        var method = filter.Descending ? nameof(Queryable.OrderByDescending) : nameof(Queryable.OrderBy);
        var orderExpression = Expression.Call(
            typeof(Queryable),
            method,
            new[] { typeof(TEntity), property.PropertyType },
            query.Expression,
            Expression.Quote(selector));

        return query.Provider.CreateQuery<TEntity>(orderExpression);
    }
}

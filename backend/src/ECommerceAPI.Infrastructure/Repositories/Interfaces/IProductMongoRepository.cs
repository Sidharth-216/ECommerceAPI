using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface IProductMongoRepository
    {
        Task<IEnumerable<ProductMongo>> GetAllAsync();
        Task<ProductMongo> GetByIdAsync(string id);

        Task<IEnumerable<ProductMongo>> SearchAsync(
            string query,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            string brand);

        Task<ProductMongo> AddAsync(ProductMongo product);
        Task<bool> UpdateAsync(string id, ProductMongo product);
        Task<bool> DeleteAsync(string id);
        Task<IEnumerable<ProductMongo>> GetSuggestionsAsync(string query);
    }
}

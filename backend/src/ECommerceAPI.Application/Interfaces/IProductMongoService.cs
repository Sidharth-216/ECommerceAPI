using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Products;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IProductMongoService
    {
        Task<IEnumerable<ProductMongo>> GetAllAsync();
        Task<ProductMongo> GetByIdAsync(string id);
        Task<ProductMongo> CreateAsync(ProductCreateDto dto);
        Task<bool> UpdateAsync(string id, ProductCreateDto dto);
        Task<bool> DeleteAsync(string id);
        Task<IEnumerable<ProductMongo>> SearchAsync(ProductSearchDto dto);
        Task<IEnumerable<ProductMongo>> SuggestAsync(string query);
    }
}

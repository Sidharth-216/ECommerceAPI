using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Products;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Product service interface
    /// Follows Interface Segregation Principle - specific interface for product operations
    /// </summary>
    public interface IProductService
    {
        Task<IEnumerable<ProductDto>> GetAllProductsAsync();
        Task<ProductDto> GetProductByIdAsync(int id);
        Task<IEnumerable<ProductDto>> SearchProductsAsync(ProductSearchDto searchDto);
        Task<ProductDto> CreateProductAsync(ProductCreateDto createDto);
        Task<ProductDto> UpdateProductAsync(int id, ProductCreateDto updateDto);
        Task<bool> DeleteProductAsync(int id);
        Task<bool> CheckStockAvailabilityAsync(int productId, int quantity);
    }
}
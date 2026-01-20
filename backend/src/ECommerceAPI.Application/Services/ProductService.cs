using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Products;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities;
//using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Product service implementation
    /// Follows Single Responsibility Principle - handles only product-related business logic
    /// Follows Dependency Inversion Principle - depends on IProductRepository abstraction
    /// </summary>
    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;

        public ProductService(IProductRepository productRepository)
        {
            _productRepository = productRepository;
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync()
        {
            var products = await _productRepository.GetAllAsync();
            return products.Select(MapToDto);
        }

        public async Task<ProductDto> GetProductByIdAsync(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                throw new KeyNotFoundException($"Product with ID {id} not found");
            
            return MapToDto(product);
        }

        public async Task<IEnumerable<ProductDto>> SearchProductsAsync(ProductSearchDto searchDto)
        {
            var products = await _productRepository.SearchAsync(
                searchDto.Query,
                searchDto.CategoryId,
                searchDto.MinPrice,
                searchDto.MaxPrice,
                searchDto.Brand
            );
            
            return products.Select(MapToDto);
        }

        public async Task<ProductDto> CreateProductAsync(ProductCreateDto createDto)
        {
            var product = new Product
            {
                Name = createDto.Name,
                Description = createDto.Description,
                Price = createDto.Price,
                CategoryId = createDto.CategoryId,
                ImageUrl = createDto.ImageUrl,
                StockQuantity = createDto.StockQuantity,
                Brand = createDto.Brand,
                Specifications = createDto.Specifications,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _productRepository.AddAsync(product);
            return MapToDto(created);
        }

        public async Task<ProductDto> UpdateProductAsync(int id, ProductCreateDto updateDto)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                throw new KeyNotFoundException($"Product with ID {id} not found");

            product.Name = updateDto.Name;
            product.Description = updateDto.Description;
            product.Price = updateDto.Price;
            product.CategoryId = updateDto.CategoryId;
            product.ImageUrl = updateDto.ImageUrl;
            product.StockQuantity = updateDto.StockQuantity;
            product.Brand = updateDto.Brand;
            product.Specifications = updateDto.Specifications;
            product.UpdatedAt = DateTime.UtcNow;

            await _productRepository.UpdateAsync(product);
            return MapToDto(product);
        }

        public async Task<bool> DeleteProductAsync(int id)
        {
            return await _productRepository.DeleteAsync(id);
        }

        public async Task<bool> CheckStockAvailabilityAsync(int productId, int quantity)
        {
            var product = await _productRepository.GetByIdAsync(productId);
            return product != null && product.StockQuantity >= quantity;
        }

        private ProductDto MapToDto(Product product)
        {
            return new ProductDto
            {
                Id = product.Id,
                Name = product.Name,
                Description = product.Description,
                Price = product.Price,
                CategoryId = product.CategoryId,
                CategoryName = product.Category?.Name,
                ImageUrl = product.ImageUrl,
                StockQuantity = product.StockQuantity,
                Brand = product.Brand,
                Rating = product.Rating,
                ReviewCount = product.ReviewCount,
                Specifications = product.Specifications,
                IsAvailable = product.IsActive && product.StockQuantity > 0
            };
        }
    }
}

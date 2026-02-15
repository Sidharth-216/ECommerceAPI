using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Infrastructure.Data;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// Product repository implementation
    /// </summary>
    public class ProductRepository : IProductRepository
    {
        private readonly ApplicationDbContext _context;

        public ProductRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Product>> GetAllAsync()
        {
            return await _context.Products
                .Include(p => p.Category)
                .Where(p => p.IsActive)
                .ToListAsync();
        }

        public async Task<Product> GetByIdAsync(int id)
        {
            return await _context.Products
                .Include(p => p.Category)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<Product>> GetByIdsAsync(IEnumerable<int> ids)
        {
            return await _context.Products
                .Include(p => p.Category)
                .Where(p => ids.Contains(p.Id))
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> SearchAsync(
            string query, 
            int? categoryId, 
            decimal? minPrice, 
            decimal? maxPrice, 
            string brand)
        {
            var productsQuery = _context.Products
                .Include(p => p.Category)
                .Where(p => p.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(query))
            {
                productsQuery = productsQuery.Where(p => 
                    p.Name.Contains(query) || 
                    p.Description.Contains(query) ||
                    p.Brand.Contains(query));
            }

            if (categoryId.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.CategoryId == categoryId.Value);
            }

            if (minPrice.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.Price >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.Price <= maxPrice.Value);
            }

            if (!string.IsNullOrEmpty(brand))
            {
                productsQuery = productsQuery.Where(p => p.Brand == brand);
            }

            return await productsQuery.ToListAsync();
        }

        public async Task<Product> AddAsync(Product product)
        {
            await _context.Products.AddAsync(product);
            await _context.SaveChangesAsync();
            return product;
        }

        public async Task UpdateAsync(Product product)
        {
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return false;

            product.IsActive = false; // Soft delete
            await _context.SaveChangesAsync();
            return true;
        }
    }
}



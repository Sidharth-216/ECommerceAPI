using System.Collections.Generic;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Application.DTOs.Products
{
    public class PagedProductsResponseDto
    {
        public IReadOnlyList<ProductMongo> Items { get; set; } = new List<ProductMongo>();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public long TotalCount { get; set; }
        public int TotalPages { get; set; }
    }
}

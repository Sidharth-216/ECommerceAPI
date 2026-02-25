// ─────────────────────────────────────────────────────────────────
// FILE: ECommerceAPI.Application/DTOs/Products/ProductDTOs.cs
// CHANGES: Added CategoryName to ProductCreateDto so admin can pass
//          a plain string category name (e.g. "Electronics") without
//          needing a numeric CategoryId.
// Customer-facing code is NOT affected — CategoryId still works.
// ─────────────────────────────────────────────────────────────────

namespace ECommerceAPI.Application.DTOs.Products
{
    public class ProductDto
    {
        public string MongoId { get; set; }
        public int? Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public string CategoryName { get; set; }
        public string ImageUrl { get; set; }
        public int StockQuantity { get; set; }
        public string Brand { get; set; }
        public decimal Rating { get; set; }
        public int ReviewCount { get; set; }
        public string Specifications { get; set; }
        public bool IsAvailable { get; set; }
    }

    public class ProductSearchDto
    {
        public string Query { get; set; }
        public int? CategoryId { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string Brand { get; set; }
    }

    /// <summary>
    /// Used for both admin Create/Update and customer-facing operations.
    /// Admin passes CategoryName as a plain string.
    /// CategoryId remains for backward compat (defaults to 0 if unused).
    /// </summary>
    public class ProductCreateDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }

        // Numeric category ID — still supported, defaults to 0
        public int CategoryId { get; set; }

        // ✅ NEW: Plain string category name sent by admin UI
        // e.g. "Electronics", "Mobiles", "Appliances"
        public string CategoryName { get; set; }

        public string ImageUrl { get; set; }
        public int StockQuantity { get; set; }
        public string Brand { get; set; }

        // Kept for backward compatibility (was the old category-name hack)
        public string Specifications { get; set; }
    }

    public class ProductSuggestionDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Brand { get; set; }
        public string Category { get; set; }
        public decimal Price { get; set; }
    }
}
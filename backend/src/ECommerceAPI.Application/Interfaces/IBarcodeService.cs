using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Products;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Service for barcode operations with caching to minimize DB load
    /// </summary>
    public interface IBarcodeService
    {
        /// <summary>
        /// Lookup product by barcode (with 1-hour cache)
        /// </summary>
        Task<ProductSuggestionDto> LookupBarcodeAsync(string barcode);

        /// <summary>
        /// Lookup multiple barcodes (batched for efficiency)
        /// </summary>
        Task<IEnumerable<ProductSuggestionDto>> LookupMultipleBarcodesAsync(IEnumerable<string> barcodes);

        /// <summary>
        /// Create/import barcode data
        /// </summary>
        Task<bool> CreateBarcodeAsync(string barcode, string productId, string name, string brand, string description, string category, decimal price, string imageUrl);

        /// <summary>
        /// Clear cache for testing/admin purposes
        /// </summary>
        void ClearCache(string barcode = null);
    }
}

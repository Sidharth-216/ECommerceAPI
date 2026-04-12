using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Products
{
    /// <summary>
    /// DTO for barcode lookup request
    /// </summary>
    public class BarcodeLookupDto
    {
        public string Barcode { get; set; }
    }

    /// <summary>
    /// DTO for batch barcode lookup request
    /// </summary>
    public class BatchBarcodeLookupDto
    {
        public IEnumerable<string> Barcodes { get; set; } = new List<string>();
    }

    /// <summary>
    /// DTO for adding a scanned product with quantity
    /// </summary>
    public class ScannedProductDto
    {
        public string Barcode { get; set; }
        public string ProductId { get; set; }
        public string Name { get; set; }
        public string Brand { get; set; }
        public string Category { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string ImageUrl { get; set; }
        public int Quantity { get; set; }
    }

    /// <summary>
    /// DTO for bulk adding scanned products
    /// </summary>
    public class BulkAddScannedProductsDto
    {
        public IEnumerable<ScannedProductDto> Products { get; set; } = new List<ScannedProductDto>();
    }

    /// <summary>
    /// DTO for barcode creation/import
    /// </summary>
    public class CreateBarcodeDto
    {
        public string Barcode { get; set; }
        public string ProductId { get; set; }
        public string Name { get; set; }
        public string Brand { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public decimal Price { get; set; }
        public string ImageUrl { get; set; }
    }

    /// <summary>
    /// DTO for bulk barcode creation/import
    /// </summary>
    public class BulkCreateBarcodesDto
    {
        public IEnumerable<CreateBarcodeDto> Barcodes { get; set; } = new List<CreateBarcodeDto>();
    }
}

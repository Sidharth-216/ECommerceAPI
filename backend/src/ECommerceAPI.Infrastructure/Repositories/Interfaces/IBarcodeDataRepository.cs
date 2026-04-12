using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface IBarcodeDataRepository
    {
        Task<BarcodeDataMongo> GetByBarcodeAsync(string barcode);
        Task<BarcodeDataMongo> GetByIdAsync(string id);
        Task<IEnumerable<BarcodeDataMongo>> GetByBarcodesAsync(IEnumerable<string> barcodes);
        Task<BarcodeDataMongo> AddAsync(BarcodeDataMongo barcodeData);
        Task<bool> UpdateAsync(string id, BarcodeDataMongo barcodeData);
        Task<bool> DeleteAsync(string id);
        Task<bool> ExistsByBarcodeAsync(string barcode);
    }
}

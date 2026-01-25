namespace ECommerceAPI.Infrastructure.Configuration
{
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } // <-- Add this
        public string DatabaseName { get; set; }
        public string ProductsCollectionName { get; set; }
        public string CartsCollectionName { get; set; }
    }
}

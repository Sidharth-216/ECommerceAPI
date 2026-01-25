
using MongoDB.Driver;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Data
{
	public class MongoDbContext
	{
		private readonly IMongoDatabase _database;

		public MongoDbContext(string connectionString, string databaseName)
		{
			var client = new MongoClient(connectionString);
			_database = client.GetDatabase(databaseName);
		}

		public IMongoCollection<MongoUser> Users => _database.GetCollection<MongoUser>("Users");

		public IMongoCollection<MongoCart> Carts => _database.GetCollection<MongoCart>("Carts");

		public IMongoCollection<T> GetCollection<T>(string collectionName)
		{
			return _database.GetCollection<T>(collectionName);
		}
	}
}

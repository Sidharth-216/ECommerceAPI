using ECommerceAPI.Domain.Entities.MongoDB;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;
using BCrypt.Net;

public static class MongoAdminSeeder
{
    public static async Task SeedAdminAsync(IMongoDatabase database)
    {
        var users = database.GetCollection<MongoUser>("users");

        var existingAdmin = await users.Find(u => u.Role == "Admin").FirstOrDefaultAsync();
        if (existingAdmin != null) return;

        var admin = new MongoUser
        {
            Email = "admin@mongo.com",
            FullName = "Mongo Admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = "Admin",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await users.InsertOneAsync(admin);
        Console.WriteLine("👑 Mongo Admin user seeded");
    }
}

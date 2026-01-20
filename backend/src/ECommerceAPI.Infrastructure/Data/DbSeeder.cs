using System;
using System.Linq;
using BCrypt.Net;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Enums;

namespace ECommerceAPI.Infrastructure.Data
{
    public static class DbSeeder
    {
        public static void SeedData(ApplicationDbContext context)
        {
            // Ensure database is created
            context.Database.EnsureCreated();

            // Check if already seeded
            if (context.Users.Any())
            {
                Console.WriteLine("Database already seeded.");
                return;
            }

            Console.WriteLine("Seeding database...");

            // Seed Categories
            var categories = new[]
            {
                new Category { Name = "Electronics", Description = "Electronic devices and gadgets", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Fashion", Description = "Clothing and accessories", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Home & Kitchen", Description = "Home appliances and kitchen items", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Sports", Description = "Sports and fitness equipment", CreatedAt = DateTime.UtcNow }
            };
            context.Categories.AddRange(categories);
            context.SaveChanges();
            Console.WriteLine("✓ Categories seeded");

            // Seed Admin User (password: admin123)
            var adminUser = new User
            {
                Email = "admin@ecommerce.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FullName = "Admin User",
                Mobile = "+91 99999 99999",
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminUser);
            Console.WriteLine("✓ Admin user created: admin@ecommerce.com / admin123");

            // Seed Customer User (password: customer123)
            var customerUser = new User
            {
                Email = "customer@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("customer123"),
                FullName = "John Doe",
                Mobile = "+91 98765 43210",
                Role = UserRole.Customer,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(customerUser);
            context.SaveChanges();
            Console.WriteLine("✓ Customer user created: customer@test.com / customer123");

            // Seed Products
            var products = new[]
            {
                new Product
                {
                    Name = "Premium Smartphone X1",
                    Description = "Powerful processor, stunning camera, all-day battery",
                    Price = 9999,
                    CategoryId = 1,
                    Brand = "TechBrand",
                    StockQuantity = 50,
                    Rating = 4.5m,
                    ReviewCount = 1250,
                    IsActive = true,
                    Specifications = "{\"RAM\":\"6GB\",\"Storage\":\"128GB\",\"Camera\":\"48MP\"}",
                    CreatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Name = "Wireless Earbuds Pro",
                    Description = "Active noise cancellation, 30hr battery life",
                    Price = 2999,
                    CategoryId = 1,
                    Brand = "AudioMax",
                    StockQuantity = 100,
                    Rating = 4.7m,
                    ReviewCount = 890,
                    IsActive = true,
                    Specifications = "{\"Battery\":\"30hrs\",\"Bluetooth\":\"5.2\"}",
                    CreatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Name = "Smart Watch Ultra",
                    Description = "Health tracking, GPS, always-on display",
                    Price = 4999,
                    CategoryId = 1,
                    Brand = "FitTech",
                    StockQuantity = 75,
                    Rating = 4.3m,
                    ReviewCount = 567,
                    IsActive = true,
                    Specifications = "{\"Display\":\"AMOLED\",\"Battery\":\"7 days\"}",
                    CreatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Name = "Gaming Laptop Z9",
                    Description = "High-performance gaming, RGB keyboard",
                    Price = 59999,
                    CategoryId = 1,
                    Brand = "GameForce",
                    StockQuantity = 25,
                    Rating = 4.8m,
                    ReviewCount = 432,
                    IsActive = true,
                    Specifications = "{\"GPU\":\"RTX 3060\",\"RAM\":\"16GB\",\"Storage\":\"512GB SSD\"}",
                    CreatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Name = "Camera DSLR Pro",
                    Description = "Professional photography, 4K video",
                    Price = 45999,
                    CategoryId = 1,
                    Brand = "PhotoMax",
                    StockQuantity = 30,
                    Rating = 4.6m,
                    ReviewCount = 289,
                    IsActive = true,
                    Specifications = "{\"Sensor\":\"24MP\",\"Video\":\"4K\"}",
                    CreatedAt = DateTime.UtcNow
                },
                new Product
                {
                    Name = "Tablet Pro 11",
                    Description = "Stunning display, all-day battery, perfect for work",
                    Price = 34999,
                    CategoryId = 1,
                    Brand = "TechBrand",
                    StockQuantity = 40,
                    Rating = 4.4m,
                    ReviewCount = 678,
                    IsActive = true,
                    Specifications = "{\"Display\":\"11 inch\",\"Storage\":\"128GB\"}",
                    CreatedAt = DateTime.UtcNow
                }
            };
            context.Products.AddRange(products);
            context.SaveChanges();
            Console.WriteLine($"✓ {products.Length} products seeded");

            // Seed Address for customer
            var address = new Address
            {
                UserId = customerUser.Id,
                AddressLine1 = "123 Main Street",
                AddressLine2 = "Apartment 4B",
                City = "Chennai",
                State = "Tamil Nadu",
                PostalCode = "600001",
                Country = "India",
                IsDefault = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Addresses.Add(address);
            context.SaveChanges();
            Console.WriteLine("✓ Sample address added");

            Console.WriteLine("✅ Database seeding completed successfully!");
            Console.WriteLine("═══════════════════════════════════════");
            Console.WriteLine("Test Credentials:");
            Console.WriteLine("  Admin: admin@ecommerce.com / admin123");
            Console.WriteLine("  Customer: customer@test.com / customer123");
            Console.WriteLine("═══════════════════════════════════════");
        }
    }
}

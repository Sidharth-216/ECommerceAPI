/*using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Infrastructure.Data;
using System;
using System.IdentityModel.Tokens.Jwt;

namespace ECommerceAPI.API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // 🔥 IMPORTANT: Disable default inbound claim mapping
            JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

            var host = CreateHostBuilder(args).Build();

            // Seed database
            using (var scope = host.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                try
                {
                    var context = services.GetRequiredService<ApplicationDbContext>();
                    DbSeeder.SeedData(context);
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "An error occurred while seeding the database.");
                }
            }

            host.Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                })
                .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();
                    logging.AddDebug();
                });
    }
}
*/
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Infrastructure.Data;
using System;
using System.IdentityModel.Tokens.Jwt;

// ✅ ADD THESE (MongoDB)
using MongoDB.Driver;
using MongoDB.Bson;

namespace ECommerceAPI.API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // 🔥 IMPORTANT: Disable default inbound claim mapping
            JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

            var host = CreateHostBuilder(args).Build();

            // Seed database
            using (var scope = host.Services.CreateScope())
            {
                var services = scope.ServiceProvider;

                try
                {
                    var context = services.GetRequiredService<ApplicationDbContext>();
                    DbSeeder.SeedData(context);
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "An error occurred while seeding the database.");
                }

                // =====================================================
                // ✅ MongoDB Atlas Connection Test (PING)
                // =====================================================
                try
                {
                    var mongoClient = services.GetRequiredService<IMongoClient>();

                    var result = mongoClient
                        .GetDatabase("admin")
                        .RunCommand<BsonDocument>(new BsonDocument("ping", 1));

                    Console.WriteLine("✅ MongoDB Atlas Connected Successfully!");
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "❌ MongoDB Connection Failed!");
                    Console.WriteLine("❌ MongoDB Connection Failed: " + ex.Message);
                }
            }

            host.Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                })
                .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();
                    logging.AddDebug();
                });
    }
}

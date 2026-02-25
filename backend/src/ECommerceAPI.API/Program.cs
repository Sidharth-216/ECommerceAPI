using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.IdentityModel.Tokens.Jwt;
using MongoDB.Driver;
using MongoDB.Bson;

namespace ECommerceAPI.API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            // ✅ REMOVED: JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear()
            // Clearing the map broke role-based authorization because ClaimTypes.Role
            // (long URI) written by JwtHelper was no longer mapped to short "role" on
            // the way in. Leave the default map intact so ASP.NET handles it correctly.

            var host = CreateHostBuilder(args).Build();

            // Seed database and test connections
            using (var scope = host.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var logger   = services.GetRequiredService<ILogger<Program>>();

                // =====================================================
                // MongoDB Atlas Connection Test (PING)
                // =====================================================
                try
                {
                    var mongoClient = services.GetRequiredService<IMongoClient>();
                    var result = mongoClient
                        .GetDatabase("admin")
                        .RunCommand<BsonDocument>(new BsonDocument("ping", 1));

                    Console.WriteLine("✅ MongoDB Atlas Connected Successfully!");
                    Console.WriteLine($"   Ping Response: {result.ToJson()}");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "❌ MongoDB Connection Failed!");
                    Console.WriteLine("❌ MongoDB Connection Failed: " + ex.Message);
                    Console.WriteLine("   Please check your MongoDB connection string in appsettings.json");
                }
            }

            Console.WriteLine("\n🚀 Application Started Successfully!");
            Console.WriteLine("📍 Available Endpoints:");
            Console.WriteLine("   - MongoDB Orders: POST /api/mongo/order/confirm");
            Console.WriteLine("   - Swagger:       /swagger\n");

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
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using MongoDB.Driver;
using MongoDB.Bson;

namespace ECommerceAPI.API
{
    public class Program
    {
        /// <summary>
        /// Generated ONCE when this process starts. Changes on every restart.
        /// Frontend stores this at login and compares on every page refresh.
        /// Mismatch = server restarted = clear session = go to home page.
        /// </summary>
        public static readonly string ServerBootId = Guid.NewGuid().ToString();

        public static async Task Main(string[] args)
        {
            var host = CreateHostBuilder(args).Build();

            using (var scope = host.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var logger   = services.GetRequiredService<ILogger<Program>>();
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
                    logger.LogError(ex, "❌ MongoDB Connection Failed!");
                    Console.WriteLine("❌ MongoDB Connection Failed: " + ex.Message);
                }
            }

            Console.WriteLine($"\n🚀 Started! Boot ID: {ServerBootId}");
            host.Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder => { webBuilder.UseStartup<Startup>(); })
                .ConfigureLogging(logging => { logging.ClearProviders(); logging.AddConsole(); logging.AddDebug(); });
    }
}
using Microsoft.Extensions.DependencyInjection;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.Services;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using ECommerceAPI.Infrastructure.Repositories.Implementations;

namespace ECommerceAPI.API.Configuration
{
    public static class HybridOrderServiceConfiguration
    {
        /// <summary>
        /// Register Hybrid Order services and repositories
        /// Add this to your Startup.cs or Program.cs
        /// </summary>
        public static IServiceCollection AddHybridOrderServices(this IServiceCollection services)
        {
            // Register SQL Order Repository
            services.AddScoped<IOrderRepository, OrderRepository>();
            
            // Register MongoDB Order Repository
            services.AddScoped<IMongoOrderRepository, MongoOrderRepository>();
            
            // Register Hybrid Order Service
            // This replaces the existing IOrderService registration
            services.AddScoped<IOrderService, HybridOrderService>();
            services.AddScoped<HybridOrderService>();

            return services;
        }
    }
}
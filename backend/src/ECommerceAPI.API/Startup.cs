using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using MongoDB.Driver;
using System;

using ECommerceAPI.Application.Helpers;
using ECommerceAPI.Application.Services;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Infrastructure.Configuration;
using ECommerceAPI.API.Middleware;
using ECommerceAPI.Infrastructure.Repositories;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using ECommerceAPI.Infrastructure.Repositories.Implementations;


namespace ECommerceAPI.API
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();

            // ================= JWT =================
            services.AddScoped<JwtHelper>();

            var jwtKey = Configuration["Jwt:SecretKey"];
            if (string.IsNullOrWhiteSpace(jwtKey))
                throw new Exception("JWT SecretKey missing");

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = Configuration["Jwt:Issuer"],
                        ValidAudience = Configuration["Jwt:Audience"],
                        IssuerSigningKey =
                            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                        NameClaimType = ClaimTypes.NameIdentifier,
                        RoleClaimType = ClaimTypes.Role
                    };
                });

            // ================= CORS =================
            services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", builder =>
                    builder.AllowAnyOrigin()
                           .AllowAnyHeader()
                           .AllowAnyMethod());
            });

            // ================= MongoDB =================
            services.Configure<MongoDbSettings>(
                Configuration.GetSection("MongoDbSettings"));

            var mongoSettings = Configuration
                .GetSection("MongoDbSettings")
                .Get<MongoDbSettings>();

            services.AddSingleton<IMongoClient>(
                _ => new MongoClient(mongoSettings.ConnectionString));

            services.AddScoped<IMongoDatabase>(sp =>
            {
                var client = sp.GetRequiredService<IMongoClient>();
                return client.GetDatabase(mongoSettings.DatabaseName);
            });

            // ================= MongoDB Repositories =================
            services.AddScoped<IMongoUserRepository, MongoUserRepository>();
            services.AddScoped<IMongoOtpRepository, MongoOtpRepository>();
            services.AddScoped<IMongoEmailOtpRepository, MongoEmailOtpRepository>();
            services.AddScoped<IProductMongoRepository, ProductMongoRepository>();
            
            // ✅ CART REPOSITORY - ADD THIS
            services.AddScoped<ICartMongoRepository, CartMongoRepository>();
            
            // ✅ ORDER REPOSITORY - ADD THIS (if you have MongoOrderController)
            services.AddScoped<IMongoOrderRepository, MongoOrderRepository>();
            
            // ✅ ADDRESS REPOSITORY - ADD THIS (if you have MongoAddressController)
            services.AddScoped<IAddressMongoRepository, AddressMongoRepository>();

            // ================= MongoDB Services =================
            services.AddScoped<MongoAuthService>();
            services.AddScoped<IMongoOtpService, MongoOtpService>();
            services.AddScoped<IMongoEmailOtpService, MongoEmailOtpService>();
            services.AddScoped<IMongoEmailOtpRepository, MongoEmailOtpRepository>();
            services.AddScoped<IMongoEmailOtpService, MongoEmailOtpService>();

            services.AddScoped<IProductMongoService, ProductMongoService>();
            // ✅ ADDRESS SERVICE - ADD THIS
            services.AddScoped<IMongoAddressService, MongoAddressService>();

            // ✅ CART SERVICE - ADD THIS
            services.AddScoped<IMongoCartService, MongoCartService>();
            
            // ✅ ORDER SERVICE - ADD THIS (if you have MongoOrderController)
            services.AddScoped<IMongoOrderService, MongoOrderService>();
            
            // ✅ ADMIN SERVICE - ADD THIS (if you have MongoAdminController)
            services.AddScoped<IMongoAdminService, MongoAdminService>();

            // ================= Swagger =================
            services.AddSwaggerGen();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseMiddleware<ErrorHandlerMiddleware>();

            app.UseHttpsRedirection();
            app.UseRouting();
            app.UseCors("AllowAll");
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
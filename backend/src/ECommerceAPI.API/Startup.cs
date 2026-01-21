using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using ECommerceAPI.Infrastructure.Data;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.Services;
using ECommerceAPI.Application.Helpers;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using ECommerceAPI.Infrastructure.Repositories.Implementations;
using ECommerceAPI.Infrastructure.Repositories;
using ECommerceAPI.Infrastructure.Services;
using ECommerceAPI.API.Middleware;
using MongoDB.Driver;

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
            // Database Configuration
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(
                    Configuration.GetConnectionString("DefaultConnection")));

            // Register JwtHelper
            services.AddScoped<JwtHelper>();

            // JWT Authentication
            var jwtKey = Configuration["Jwt:Key"];

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

                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(jwtKey)),

                        // 🔥 CRITICAL FIXES
                        NameClaimType = ClaimTypes.NameIdentifier,
                        RoleClaimType = ClaimTypes.Role
                    };
                });

            // CORS Configuration
            services.AddCors(options =>
            {
                // Primary CORS policy for React App
                options.AddPolicy("AllowReactApp",
                    builder => builder
                        .WithOrigins("http://localhost:3000")
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());

                // Secondary CORS policy (AllowAll) - kept for compatibility
                options.AddPolicy("AllowAll",
                    builder => builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
            });

            // ============================================================
            // ============================================================
            // HTTP Client Factory (Required for PaymentService)
            // ============================================================
            services.AddHttpClient();

            // ============================================================
            // Dependency Injection - Repositories
            // ============================================================
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IProductRepository, ProductRepository>();
            services.AddScoped<ICartRepository, CartRepository>();
            services.AddScoped<IOrderRepository, OrderRepository>();
            services.AddScoped<IPaymentRepository, PaymentRepository>();
            services.AddScoped<IAddressRepository, AddressRepository>(); // Added for address management
             services.AddScoped<IOtpRepository, OtpRepository>();
            services.AddScoped<IEmailOtpRepository, EmailOtpRepository>();

            // ============================================================
            // HTTP Client Factory (for Razorpay HTTP version)
            // ============================================================
            services.AddHttpClient();

            // Dependency Injection - Services
            // ============================================================
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IProductService, ProductService>();
            services.AddScoped<ICartService, CartService>();
            services.AddScoped<IOrderService, OrderService>();
            services.AddScoped<IRecommendationService, RecommendationService>();
            services.AddScoped<IPaymentService, PaymentService>(); // ✅ Payment Service (with Razorpay)
            services.AddScoped<IAdminService, AdminService>();
            services.AddScoped<IOtpService, OtpService>();
            services.AddScoped<IEmailOtpService, EmailOtpService>();
            services.AddScoped<IEmailService, EmailService>();
            // Program.cs or Startup.cs
            services.Configure<MongoDbSettings>(
                Configuration.GetSection("MongoDbSettings"));

            services.AddSingleton<IMongoClient>(sp =>
                new MongoClient(Configuration.GetConnectionString("MongoDB")));

            // Register both repositories
            services.AddScoped<IProductRepository, ProductRepository>();
            services.AddScoped<IProductMongoRepository, ProductMongoRepository>();

            // Use hybrid service
            services.AddScoped<IProductService, ProductServiceHybrid>();
            // ============================================================
            // Razorpay Configuration
            // ============================================================
            // Note: Razorpay credentials are loaded from appsettings.json
            // Ensure you have the following in your appsettings.json:
            // "Razorpay": {
            //   "KeyId": "your_razorpay_key_id",
            //   "KeySecret": "your_razorpay_key_secret",
            //   "WebhookSecret": "your_webhook_secret"
            // }

            // Validate Razorpay configuration at startup
            var razorpayKeyId = Configuration["Razorpay:KeyId"];
            var razorpayKeySecret = Configuration["Razorpay:KeySecret"];
            
            if (string.IsNullOrEmpty(razorpayKeyId) || string.IsNullOrEmpty(razorpayKeySecret))
            {
                throw new InvalidOperationException(
                    "Razorpay configuration is missing. Please add 'Razorpay:KeyId' and 'Razorpay:KeySecret' to appsettings.json");
            }

            services.AddControllers();
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title = "E-Commerce API",
                    Version = "v1",
                    Description = "E-Commerce API with Razorpay Payment Integration"
                });

                // Add JWT Authentication to Swagger
                c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
                    Name = "Authorization",
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });

                c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference
                            {
                                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new string[] {}
                    }
                });
            });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "E-Commerce API V1");
                    c.RoutePrefix = string.Empty; // Swagger UI at root
                });
            }

            // Custom Error Handler Middleware
            app.UseMiddleware<ErrorHandlerMiddleware>();

            app.UseHttpsRedirection();
            app.UseRouting();

            // Use CORS - Apply the AllowAll policy (you can switch to AllowReactApp if needed)
            app.UseCors("AllowAll");

            // Authentication & Authorization
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }

    // Simple POCO for MongoDB configuration bound from appsettings.json
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; }
        public string DatabaseName { get; set; }
    }
}
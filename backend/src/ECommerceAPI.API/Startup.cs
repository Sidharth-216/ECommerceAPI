/*
// ==================== Startup.cs ====================
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ECommerceAPI.Infrastructure.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.Services;
using ECommerceAPI.Application.Helpers;
using ECommerceAPI.API.Middleware;
using MongoDB.Driver;
using System;

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
            services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                });

            // ========================= Database Configuration =========================
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(
                    Configuration.GetConnectionString("DefaultConnection")));
            // ==========================================================================

            // ========================= JWT Configuration =========================
            // Register JwtHelper
            services.AddScoped<JwtHelper>();

            // JWT Authentication
            var jwtKey = Configuration["Jwt:SecretKey"]; // Changed from "Jwt:Key" to "Jwt:SecretKey"

            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new InvalidOperationException(
                    "JWT configuration is missing. Please add 'Jwt:SecretKey', 'Jwt:Issuer', and 'Jwt:Audience' to appsettings.json");
            }

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
            // =====================================================================

            // ========================= CORS Configuration =========================
            services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp",
                    builder => builder
                        .WithOrigins("http://localhost:3000")
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());

                options.AddPolicy("AllowAll",
                    builder => builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
            });
            // ======================================================================

            // HTTP Client Factory
            services.AddHttpClient();

            // ========================= MongoDB Configuration =========================
            // ✅ CRITICAL: Configure MongoDB serialization FIRST before any MongoDB usage
            MongoDbConfiguration.Configure();

            // Bind MongoDB settings from appsettings.json
            services.Configure<MongoDbSettings>(
                Configuration.GetSection("MongoDbSettings"));

            var mongoSettings = Configuration
                .GetSection("MongoDbSettings")
                .Get<MongoDbSettings>();

            // Validate MongoDB settings
            if (mongoSettings == null)
                throw new Exception("MongoDbSettings binding failed. Check appsettings.json");

            if (string.IsNullOrWhiteSpace(mongoSettings.ConnectionString))
                throw new Exception("MongoDB ConnectionString is missing in appsettings.json");

            if (string.IsNullOrWhiteSpace(mongoSettings.DatabaseName))
                throw new Exception("MongoDB DatabaseName is missing in appsettings.json");

            if (string.IsNullOrWhiteSpace(mongoSettings.ProductsCollectionName))
                throw new Exception("MongoDB ProductsCollectionName is missing in appsettings.json");

            if (string.IsNullOrWhiteSpace(mongoSettings.CartsCollectionName))
                throw new Exception("MongoDB CartsCollectionName is missing in appsettings.json");

            // Register MongoDB client as singleton
            services.AddSingleton<IMongoClient>(sp =>
            {
                try
                {
                    return new MongoClient(mongoSettings.ConnectionString);
                }
                catch (Exception ex)
                {
                    throw new Exception($"Failed to create MongoDB client: {ex.Message}", ex);
                }
            });
            // =========================================================================

            // ========================= SQL Repositories =========================
            // User Repository (SQL)
            services.AddScoped<IUserRepository, UserRepository>();
            
            // Product Repository (SQL)
            services.AddScoped<IProductRepository, ProductRepository>();
            
            // MongoDB Product Repository (for hybrid service)
            services.AddScoped<IProductMongoRepository, ProductMongoRepository>();
            
            // Cart Repository (SQL)
            services.AddScoped<ICartRepository, CartRepository>();
            
            // Order Repository (SQL)
            services.AddScoped<IOrderRepository, OrderRepository>();
            
            // Payment Repository (SQL)
            services.AddScoped<IPaymentRepository, PaymentRepository>();
            
            // Address Repository (SQL)
            services.AddScoped<IAddressRepository, AddressRepository>();
            
            // OTP Repository (SQL)
            services.AddScoped<IOtpRepository, OtpRepository>();
            
            // Email OTP Repository (SQL)
            services.AddScoped<IEmailOtpRepository, EmailOtpRepository>();
            // ====================================================================

            // ========================= MongoDB Repositories =========================
            // Product Repository (MongoDB)
            services.AddScoped<IProductMongoRepository, ProductMongoRepository>();
            
            // Cart Repository (MongoDB)
            services.AddScoped<ICartMongoRepository, CartMongoRepository>();
            
            // Order Repository (MongoDB)
            services.AddScoped<IMongoOrderRepository, MongoOrderRepository>();
            
            // ✅ NEW: User Repository (MongoDB)
            services.AddScoped<IMongoUserRepository, MongoUserRepository>();
            
            // ✅ NEW: OTP Repository (MongoDB)
            services.AddScoped<IMongoOtpRepository, MongoOtpRepository>();
            
            // ✅ NEW: Email OTP Repository (MongoDB)
            services.AddScoped<IMongoEmailOtpRepository, MongoEmailOtpRepository>();
            
            // ✅ NEW: Address Repository (MongoDB)
            services.AddScoped<IAddressMongoRepository, AddressMongoRepository>();
            // ========================================================================
            // ========================= SQL Services =========================
            // Auth Service (SQL)
            services.AddScoped<IAuthService, AuthService>();
            
            // OTP Service (SQL)
            services.AddScoped<IOtpService, OtpService>();
            
            // Email OTP Service (SQL)
            services.AddScoped<IEmailOtpService, EmailOtpService>();
            // ================================================================
            services.AddScoped<IOrderService, OrderService>();
            services.AddScoped<IMongoOrderRepository, MongoOrderRepository>();
            // ========================= MongoDB Services =========================
            // ✅ NEW: MongoDB OTP Service
            services.AddScoped<IMongoOtpService, MongoOtpService>();
            
            // ✅ NEW: MongoDB Email OTP Service
            services.AddScoped<IMongoEmailOtpService, MongoEmailOtpService>();
            
            // ✅ NEW: MongoDB Auth Service
            services.AddScoped<MongoAuthService>();

            services.AddScoped<IMongoDatabase>(sp =>
            {
                var client = sp.GetRequiredService<IMongoClient>();
                return client.GetDatabase(mongoSettings.DatabaseName);
            });

            
           
            // =========================================================================
            // ✅ NEW: User Migration Service
            services.AddScoped<UserMigrationService>();
            // ====================================================================

            // ========================= Hybrid Services =========================
            // Use hybrid product service (handles both SQL and MongoDB)
            services.AddScoped<IProductService, ProductServiceHybrid>();
            
            // Use hybrid cart service (handles both SQL and MongoDB)
            services.AddScoped<ICartService, CartServiceHybrid>();
            // ===================================================================

            // ========================= Other Services =========================
           
            services.AddScoped<IRecommendationService, RecommendationService>();
            services.AddScoped<IPaymentService, PaymentService>();
            services.AddScoped<IAdminService, AdminService>();
            services.AddScoped<IEmailService, EmailService>();
            services.AddScoped<IAddressServiceHybrid, AddressServiceHybrid>();
            // ==================================================================

            // ========================= Razorpay Validation =========================
            var razorpayKeyId = Configuration["Razorpay:KeyId"];
            var razorpayKeySecret = Configuration["Razorpay:KeySecret"];
            if (string.IsNullOrEmpty(razorpayKeyId) || string.IsNullOrEmpty(razorpayKeySecret))
            {
                throw new InvalidOperationException(
                    "Razorpay configuration is missing. Please add 'Razorpay:KeyId' and 'Razorpay:KeySecret' to appsettings.json");
            }
            // =======================================================================

            // ========================= Controllers & Swagger =========================
            services.AddControllers();
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title = "E-Commerce API",
                    Version = "v1",
                    Description = "E-Commerce API with SQL + MongoDB Hybrid Support, Razorpay Integration, and MongoDB User Authentication"
                });

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
            // =========================================================================
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
                    c.RoutePrefix = string.Empty;
                });
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
*/
/*
// ==================== Startup.cs ====================
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ECommerceAPI.Infrastructure.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.Services;
using ECommerceAPI.Application.Helpers;
using ECommerceAPI.API.Middleware;
using MongoDB.Driver;
using System;

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
            services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                });

            // ========================= Database Configuration =========================
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(
                    Configuration.GetConnectionString("DefaultConnection")));
            // ==========================================================================

            // ========================= JWT Configuration =========================
            // Register JwtHelper
            services.AddScoped<JwtHelper>();

            // JWT Authentication
            var jwtKey = Configuration["Jwt:SecretKey"]; // Changed from "Jwt:Key" to "Jwt:SecretKey"

            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new InvalidOperationException(
                    "JWT configuration is missing. Please add 'Jwt:SecretKey', 'Jwt:Issuer', and 'Jwt:Audience' to appsettings.json");
            }

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
            // =====================================================================

            // ========================= CORS Configuration =========================
            services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp",
                    builder => builder
                        .WithOrigins("http://localhost:3000")
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());

                options.AddPolicy("AllowAll",
                    builder => builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
            });
            // ======================================================================

            // HTTP Client Factory
            services.AddHttpClient();

            // ========================= MongoDB Configuration =========================
            // ✅ CRITICAL: Configure MongoDB serialization FIRST before any MongoDB usage
            MongoDbConfiguration.Configure();

            // Bind MongoDB settings from appsettings.json
            services.Configure<MongoDbSettings>(
                Configuration.GetSection("MongoDbSettings"));

            var mongoSettings = Configuration
                .GetSection("MongoDbSettings")
                .Get<MongoDbSettings>();

            // Validate MongoDB settings
            if (mongoSettings == null)
                throw new Exception("MongoDbSettings binding failed. Check appsettings.json");

            if (string.IsNullOrWhiteSpace(mongoSettings.ConnectionString))
                throw new Exception("MongoDB ConnectionString is missing in appsettings.json");

            if (string.IsNullOrWhiteSpace(mongoSettings.DatabaseName))
                throw new Exception("MongoDB DatabaseName is missing in appsettings.json");

            if (string.IsNullOrWhiteSpace(mongoSettings.ProductsCollectionName))
                throw new Exception("MongoDB ProductsCollectionName is missing in appsettings.json");

            if (string.IsNullOrWhiteSpace(mongoSettings.CartsCollectionName))
                throw new Exception("MongoDB CartsCollectionName is missing in appsettings.json");

            // Register MongoDB client as singleton
            services.AddSingleton<IMongoClient>(sp =>
            {
                try
                {
                    return new MongoClient(mongoSettings.ConnectionString);
                }
                catch (Exception ex)
                {
                    throw new Exception($"Failed to create MongoDB client: {ex.Message}", ex);
                }
            });

            // Register MongoDB database
            services.AddScoped<IMongoDatabase>(sp =>
            {
                var client = sp.GetRequiredService<IMongoClient>();
                return client.GetDatabase(mongoSettings.DatabaseName);
            });
            // =========================================================================

            // ========================= Email Settings Configuration =========================
            // ✅ CRITICAL: Configure Email Settings for OTP emails
            services.Configure<EmailSettings>(Configuration.GetSection("EmailSettings"));
            // ================================================================================

            // ========================= SQL Repositories =========================
            // User Repository (SQL)
            services.AddScoped<IUserRepository, UserRepository>();
            
            // Product Repository (SQL)
            services.AddScoped<IProductRepository, ProductRepository>();
            
            // Cart Repository (SQL)
            services.AddScoped<ICartRepository, CartRepository>();
            
            // Order Repository (SQL)
            services.AddScoped<IOrderRepository, OrderRepository>();
            
            // Payment Repository (SQL)
            services.AddScoped<IPaymentRepository, PaymentRepository>();
            
            // Address Repository (SQL)
            services.AddScoped<IAddressRepository, AddressRepository>();
            
            // OTP Repository (SQL)
            services.AddScoped<IOtpRepository, OtpRepository>();
            
            // Email OTP Repository (SQL)
            services.AddScoped<IEmailOtpRepository, EmailOtpRepository>();
            // ====================================================================

            // ========================= MongoDB Repositories =========================
            // Product Repository (MongoDB)
            services.AddScoped<IProductMongoRepository, ProductMongoRepository>();
            
            // Cart Repository (MongoDB)
            services.AddScoped<ICartMongoRepository, CartMongoRepository>();
            
            // ✅ NEW: Order Repository (MongoDB) - Dedicated for MongoDB orders
            services.AddScoped<IMongoOrderRepository, MongoOrderRepository>();
            
            // User Repository (MongoDB)
            services.AddScoped<IMongoUserRepository, MongoUserRepository>();
            
            // OTP Repository (MongoDB)
            services.AddScoped<IMongoOtpRepository, MongoOtpRepository>();
            
            // Email OTP Repository (MongoDB)
            services.AddScoped<IMongoEmailOtpRepository, MongoEmailOtpRepository>();
            
            // Address Repository (MongoDB)
            services.AddScoped<IAddressMongoRepository, AddressMongoRepository>();
            // ========================================================================

            // ========================= SQL Services =========================
            // Auth Service (SQL)
            services.AddScoped<IAuthService, AuthService>();
            
            // OTP Service (SQL)
            services.AddScoped<IOtpService, OtpService>();
            
            // Email OTP Service (SQL)
            services.AddScoped<IEmailOtpService, EmailOtpService>();
            
            // ✅ Order Service (SQL) - Keep for legacy/SQL orders
            services.AddScoped<IOrderService, OrderService>();
            // ================================================================

            // ========================= MongoDB Services =========================
            // ✅ MongoDB OTP Service - Use fully qualified namespace to avoid ambiguity
            services.AddScoped<Application.Interfaces.IMongoOtpService, MongoOtpService>();
            
            // ✅ MongoDB Email OTP Service - Use fully qualified namespace to avoid ambiguity
            services.AddScoped<Application.Interfaces.IMongoEmailOtpService, MongoEmailOtpService>();
            
            // MongoDB Auth Service
            services.AddScoped<MongoAuthService>();

            // ✅ NEW: MongoDB Order Service - Dedicated for MongoDB orders
            services.AddScoped<IMongoOrderService, MongoOrderService>();
            services.AddScoped<IMongoOrderService, MongoOrderService>();
            // ====================================================================

            // ========================= Hybrid Services =========================
            // Use hybrid product service (handles both SQL and MongoDB)
            services.AddScoped<IProductService, ProductServiceHybrid>();
            
            // Use hybrid cart service (handles both SQL and MongoDB)
            services.AddScoped<ICartService, CartServiceHybrid>();

            // Address Service (Hybrid)
            services.AddScoped<IAddressServiceHybrid, AddressServiceHybrid>();
            // ===================================================================

            // ========================= Migration Services =========================
            // User Migration Service
            services.AddScoped<UserMigrationService>();
            // ======================================================================

            // ========================= Other Services =========================
            services.AddScoped<IRecommendationService, RecommendationService>();
            services.AddScoped<IPaymentService, PaymentService>();
            services.AddScoped<IAdminService, AdminService>();
            
            // ✅ Email Service - CRITICAL for sending OTP emails
            services.AddScoped<IEmailService, EmailService>();
            // ==================================================================

            // ========================= Razorpay Validation =========================
            var razorpayKeyId = Configuration["Razorpay:KeyId"];
            var razorpayKeySecret = Configuration["Razorpay:KeySecret"];
            if (string.IsNullOrEmpty(razorpayKeyId) || string.IsNullOrEmpty(razorpayKeySecret))
            {
                throw new InvalidOperationException(
                    "Razorpay configuration is missing. Please add 'Razorpay:KeyId' and 'Razorpay:KeySecret' to appsettings.json");
            }
            // =======================================================================

            // ========================= Controllers & Swagger =========================
            services.AddControllers();
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title = "E-Commerce API",
                    Version = "v1",
                    Description = "E-Commerce API with SQL + MongoDB Hybrid Support, Razorpay Integration, MongoDB User Authentication, and MongoDB Order System"
                });

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
            // =========================================================================
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
                    c.RoutePrefix = string.Empty;
                });
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
*/
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
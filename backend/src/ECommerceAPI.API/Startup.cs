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
        public Startup(IConfiguration configuration) { Configuration = configuration; }
        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();
            services.AddScoped<JwtHelper>();

            var jwtKey = Configuration["Jwt:SecretKey"];
            if (string.IsNullOrWhiteSpace(jwtKey)) throw new Exception("JWT SecretKey missing");

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer           = true,
                        ValidateAudience         = true,
                        ValidateLifetime         = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer              = Configuration["Jwt:Issuer"],
                        ValidAudience            = Configuration["Jwt:Audience"],
                        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                        NameClaimType            = ClaimTypes.NameIdentifier,
                        RoleClaimType            = ClaimTypes.Role
                    };
                });

            services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", builder =>
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .WithExposedHeaders("X-Server-Boot-Id"));
            });

            services.Configure<MongoDbSettings>(Configuration.GetSection("MongoDbSettings"));
            var mongoSettings = Configuration.GetSection("MongoDbSettings").Get<MongoDbSettings>();
            services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoSettings.ConnectionString));
            services.AddScoped<IMongoDatabase>(sp => {
                var client = sp.GetRequiredService<IMongoClient>();
                return client.GetDatabase(mongoSettings.DatabaseName);
            });

            // ── Repositories ──────────────────────────────────────────────────
            services.AddScoped<IMongoUserRepository,      MongoUserRepository>();
            services.AddScoped<IMongoOtpRepository,       MongoOtpRepository>();
            services.AddScoped<IMongoEmailOtpRepository,  MongoEmailOtpRepository>();
            services.AddScoped<IProductMongoRepository,   ProductMongoRepository>();
            services.AddScoped<ICartMongoRepository,      CartMongoRepository>();
            services.AddScoped<IMongoOrderRepository,     MongoOrderRepository>();
            services.AddScoped<IAddressMongoRepository,   AddressMongoRepository>();
            services.AddScoped<IQRPaymentRepository,      QRPaymentRepository>();
            // ── Services ──────────────────────────────────────────────────────
            services.AddScoped<MongoAuthService>();
            services.AddScoped<IMongoOtpService,          MongoOtpService>();
            services.AddScoped<IMongoEmailOtpService,     MongoEmailOtpService>();
            services.AddScoped<IProductMongoService,      ProductMongoService>();
            services.AddScoped<IMongoAddressService,      MongoAddressService>();
            services.AddScoped<IMongoCartService,         MongoCartService>();
            services.AddScoped<IMongoOrderService,        MongoOrderService>();
            services.AddScoped<IMongoAdminService,        MongoAdminService>();
            services.AddScoped<IMongoOrderEmailService,   MongoOrderEmailService>(); // ← ADDED
            services.AddScoped<IQRPaymentService,         QRPaymentService>();
            services.AddHttpClient<ISemanticSearchService, SemanticSearchService>(client => {
                client.Timeout = TimeSpan.FromSeconds(30);
            });

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
            app.UseStaticFiles();
            app.UseRouting();
            app.UseCors("AllowAll");
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints => { endpoints.MapControllers(); });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // Optional: Background hosted service (paste into a new file if you want it)
        // ─────────────────────────────────────────────────────────────────────────────

        /*
        using Microsoft.Extensions.DependencyInjection;
        using Microsoft.Extensions.Hosting;
        using Microsoft.Extensions.Logging;
        using System;
        using System.Threading;
        using System.Threading.Tasks;
        using ECommerceAPI.Application.Interfaces;

        public class QRPaymentExpiryJob : BackgroundService
        {
            private readonly IServiceScopeFactory _scopeFactory;
            private readonly ILogger<QRPaymentExpiryJob> _logger;
            private static readonly TimeSpan _interval = TimeSpan.FromMinutes(5);

            public QRPaymentExpiryJob(IServiceScopeFactory scopeFactory, ILogger<QRPaymentExpiryJob> logger)
            {
                _scopeFactory = scopeFactory;
                _logger = logger;
            }

            protected override async Task ExecuteAsync(CancellationToken stoppingToken)
            {
                _logger.LogInformation("⏰ QRPaymentExpiryJob started.");

                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var svc = scope.ServiceProvider.GetRequiredService<IQRPaymentService>();
                        var expired = await svc.MarkExpiredSessionsAsync();
                        if (expired > 0)
                            _logger.LogInformation("⏰ Expired {Count} QR sessions.", expired);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "❌ QRPaymentExpiryJob error");
                    }

                    await Task.Delay(_interval, stoppingToken);
                }
            }
        }
        */

    }
}
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using MongoDB.Driver;
using System;
using System.IO.Compression;
using System.Linq;
using System.Threading.RateLimiting;

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
            var environment = Configuration["ASPNETCORE_ENVIRONMENT"] ?? Configuration["DOTNET_ENVIRONMENT"] ?? Environments.Production;
            var isDevelopment = string.Equals(environment, Environments.Development, StringComparison.OrdinalIgnoreCase);

            services.AddControllers().AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                options.JsonSerializerOptions.WriteIndented = isDevelopment;
            });
            services.AddScoped<JwtHelper>();
            services.AddMemoryCache();

            services.AddResponseCompression(options =>
            {
                options.EnableForHttps = true;
                options.Providers.Add<GzipCompressionProvider>();
            });
            services.Configure<GzipCompressionProviderOptions>(options =>
            {
                options.Level = CompressionLevel.Fastest;
            });

            services.AddResponseCaching();

            var jwtKey = Configuration["Jwt:SecretKey"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET");
            }

            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                if (isDevelopment)
                {
                    // Dev-only fallback so local runs don't crash when secrets are not configured yet.
                    jwtKey = "dev-only-jwt-secret-change-me-at-least-32-chars";
                }
                else
                {
                    throw new Exception("JWT SecretKey missing. Set Jwt:SecretKey or JWT_SECRET.");
                }
            }

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
                options.AddPolicy("AllowFrontend", builder =>
                {
                    var configOrigins = Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
                    var envOriginsRaw = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
                    var envOrigins = string.IsNullOrWhiteSpace(envOriginsRaw)
                        ? Array.Empty<string>()
                        : envOriginsRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                    var allowedOrigins = configOrigins
                        .Concat(envOrigins)
                        .Where(o => !string.IsNullOrWhiteSpace(o))
                        .Where(o => !o.Contains("your-frontend-domain.com", StringComparison.OrdinalIgnoreCase))
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToArray();

                    if (allowedOrigins.Length > 0)
                    {
                        builder
                            .WithOrigins(allowedOrigins)
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .WithExposedHeaders("X-Server-Boot-Id");
                    }
                    else
                    {
                        builder
                            .AllowAnyOrigin()
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .WithExposedHeaders("X-Server-Boot-Id");
                    }
                });
            });

            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                var globalPermitLimit = ReadEnvInt("RATE_LIMIT_GLOBAL_RPM", 300);
                var authPermitLimit = ReadEnvInt("RATE_LIMIT_AUTH_RPM", 12);
                var searchPermitLimit = ReadEnvInt("RATE_LIMIT_SEARCH_RPM", 120);

                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: BuildRateLimitPartitionKey(httpContext, "global"),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = globalPermitLimit,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));

                options.AddPolicy("AuthOtpPolicy", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: BuildRateLimitPartitionKey(httpContext, "auth"),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = authPermitLimit,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));

                options.AddPolicy("SearchPolicy", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: BuildRateLimitPartitionKey(httpContext, "search"),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = searchPermitLimit,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));

                int ReadEnvInt(string key, int fallback)
                {
                    var raw = Environment.GetEnvironmentVariable(key);
                    return int.TryParse(raw, out var parsed) && parsed > 0 ? parsed : fallback;
                }

                string BuildRateLimitPartitionKey(HttpContext context, string scope)
                {
                    var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                 ?? context.User?.FindFirst("sub")?.Value;
                    if (!string.IsNullOrWhiteSpace(userId))
                    {
                        return $"{scope}:user:{userId}";
                    }

                    var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
                    var clientIp = forwarded?.Split(',').FirstOrDefault()?.Trim();
                    if (string.IsNullOrWhiteSpace(clientIp))
                    {
                        clientIp = context.Connection.RemoteIpAddress?.ToString();
                    }

                    return $"{scope}:ip:{clientIp ?? "unknown"}";
                }
            });

            services.Configure<MongoDbSettings>(Configuration.GetSection("MongoDbSettings"));
            var mongoSettings = Configuration.GetSection("MongoDbSettings").Get<MongoDbSettings>()
                ?? throw new Exception("MongoDbSettings section is missing");

            if (string.IsNullOrWhiteSpace(mongoSettings.ConnectionString))
            {
                mongoSettings.ConnectionString = Environment.GetEnvironmentVariable("MONGO_CONNECTION_STRING");
            }

            if (string.IsNullOrWhiteSpace(mongoSettings.DatabaseName))
            {
                mongoSettings.DatabaseName = Environment.GetEnvironmentVariable("MONGO_DB_NAME") ?? "ECommerceDB";
            }

            if (string.IsNullOrWhiteSpace(mongoSettings.ConnectionString))
            {
                if (isDevelopment)
                {
                    // Dev-only default for local MongoDB.
                    mongoSettings.ConnectionString = "mongodb://localhost:27017";
                }
                else
                {
                    throw new Exception("MongoDbSettings:ConnectionString is missing. Set MongoDbSettings:ConnectionString or MONGO_CONNECTION_STRING.");
                }
            }

            if (string.IsNullOrWhiteSpace(mongoSettings.DatabaseName))
                throw new Exception("MongoDbSettings:DatabaseName is missing");

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
            else
            {
                app.UseHsts();
            }

            app.Use(async (context, next) =>
            {
                context.Response.Headers["X-Content-Type-Options"] = "nosniff";
                context.Response.Headers["X-Frame-Options"] = "DENY";
                context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
                context.Response.Headers["X-XSS-Protection"] = "0";
                await next();
            });

            app.UseMiddleware<ErrorHandlerMiddleware>();
            app.UseHttpsRedirection();
            app.UseResponseCompression();
            app.UseStaticFiles();
            app.UseRouting();
            app.UseCors("AllowFrontend");
            app.UseRateLimiter();
            app.UseResponseCaching();
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
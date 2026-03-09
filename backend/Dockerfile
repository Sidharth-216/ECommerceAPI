# ─────────────────────────────────────────────────────────────────────────────
# ShopAI .NET 8 Backend — Multi-stage Dockerfile
#
# FILE LOCATION: backend/Dockerfile
# (same folder as ECommerceAPI.sln)
#
# Project structure this is built for:
#   backend/
#   ├── ECommerceAPI.sln          ← solution file
#   ├── Dockerfile                ← this file
#   ├── .dockerignore
#   └── src/
#       ├── ECommerceAPI.API/
#       ├── ECommerceAPI.Application/
#       ├── ECommerceAPI.Domain/
#       └── ECommerceAPI.Infrastructure/
#
# NOTE: appsettings.json is in .gitignore and NOT pushed to GitHub.
#       A minimal empty appsettings.json is created inline during build
#       so compilation succeeds. All real values are injected at runtime
#       via Render environment variables (env vars override appsettings in .NET 8).
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: BUILD ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copy solution file first
COPY ECommerceAPI.sln ./

# Copy all .csproj files (Docker caches this layer — only re-runs restore if .csproj changes)
COPY src/ECommerceAPI.API/ECommerceAPI.API.csproj                             src/ECommerceAPI.API/
COPY src/ECommerceAPI.Application/ECommerceAPI.Application.csproj             src/ECommerceAPI.Application/
COPY src/ECommerceAPI.Domain/ECommerceAPI.Domain.csproj                       src/ECommerceAPI.Domain/
COPY src/ECommerceAPI.Infrastructure/ECommerceAPI.Infrastructure.csproj       src/ECommerceAPI.Infrastructure/

# Restore all NuGet packages using the solution file
RUN dotnet restore ECommerceAPI.sln

# Copy ALL remaining source files
COPY . .

# appsettings.json is in .gitignore so it is never pushed to GitHub.
# Create a minimal one here so dotnet publish does not fail.
# All empty values below are overridden at runtime by Render environment variables.
RUN printf '{\n\
  "Logging": {\n\
    "LogLevel": {\n\
      "Default": "Information",\n\
      "Microsoft.AspNetCore": "Warning"\n\
    }\n\
  },\n\
  "AllowedHosts": "*",\n\
  "MongoDbSettings": {\n\
    "ConnectionString": "",\n\
    "DatabaseName": ""\n\
  },\n\
  "JwtSettings": {\n\
    "SecretKey": "",\n\
    "Issuer": "ShopAI",\n\
    "Audience": "ShopAI",\n\
    "ExpiryMinutes": 60\n\
  },\n\
  "AIService": {\n\
    "BaseUrl": ""\n\
  },\n\
  "AIAgent": {\n\
    "ServiceUrl": "",\n\
    "ApiKey": ""\n\
  },\n\
  "EmailSettings": {\n\
    "SmtpHost": "",\n\
    "SmtpPort": 587,\n\
    "SenderEmail": "",\n\
    "SenderPassword": ""\n\
  }\n\
}\n' > src/ECommerceAPI.API/appsettings.json

# Publish the API project in Release mode
RUN dotnet publish src/ECommerceAPI.API/ECommerceAPI.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ── Stage 2: RUNTIME ──────────────────────────────────────────────────────────
# Smaller ASP.NET 8 runtime image — no SDK needed at runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

# Copy only the published output from build stage
COPY --from=build /app/publish .

# Render automatically injects $PORT as an environment variable
# ASPNETCORE_URLS tells ASP.NET Core which port to bind to
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "ECommerceAPI.API.dll"]
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

# Railway and Render automatically inject $PORT as an environment variable
# ASPNETCORE_URLS tells ASP.NET Core which port to bind to
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "ECommerceAPI.API.dll"]
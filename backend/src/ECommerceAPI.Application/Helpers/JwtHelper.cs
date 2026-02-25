using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ECommerceAPI.Domain.Entities;

namespace ECommerceAPI.Application.Helpers
{
    /// <summary>
    /// JWT Helper for generating and validating tokens.
    /// Uses ClaimTypes.* (long URI constants) when writing claims.
    /// The default inbound claim type map (NOT cleared) maps them back
    /// to short names automatically, so [Authorize(Roles = "Admin")] works.
    /// </summary>
    public class JwtHelper
    {
        private readonly IConfiguration _configuration;
        private readonly string _secretKey;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _expiryInHours;

        public JwtHelper(IConfiguration configuration)
        {
            _configuration = configuration;
            _secretKey     = _configuration["Jwt:SecretKey"]
                             ?? _configuration["Jwt:Key"]
                             ?? throw new InvalidOperationException("Jwt:SecretKey or Jwt:Key configuration is missing");
            _issuer        = _configuration["Jwt:Issuer"]
                             ?? throw new InvalidOperationException("Jwt:Issuer configuration is missing");
            _audience      = _configuration["Jwt:Audience"]
                             ?? throw new InvalidOperationException("Jwt:Audience configuration is missing");

            var expiryConfig = _configuration["Jwt:ExpiryInHours"]
                               ?? _configuration["Jwt:ExpiryInMinutes"];
            if (expiryConfig == null)
                throw new InvalidOperationException("Jwt:ExpiryInHours or Jwt:ExpiryInMinutes configuration is missing");
            _expiryInHours = int.Parse(expiryConfig);
        }

        /// <summary>
        /// Generate token for SQL-based User (with int Id).
        /// </summary>
        public string GenerateToken(dynamic user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key          = Encoding.ASCII.GetBytes(_secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim("userId",                  user.Id.ToString()),
                    new Claim(ClaimTypes.Email,          user.Email),
                    new Claim(ClaimTypes.Name,           user.FullName),
                    new Claim(ClaimTypes.Role,           user.Role.ToString()),
                    new Claim("UserType",                "SQL")
                }),
                Expires            = DateTime.UtcNow.AddHours(_expiryInHours),
                Issuer             = _issuer,
                Audience           = _audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        /// <summary>
        /// Generate token for MongoDB User (with ObjectId string).
        /// </summary>
        public string GenerateTokenForMongo(string userId, string email, string fullName, string role)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key          = Encoding.ASCII.GetBytes(_secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId),
                    new Claim("userId",                  userId),
                    new Claim(ClaimTypes.Email,          email),
                    new Claim(ClaimTypes.Name,           fullName),
                    new Claim(ClaimTypes.Role,           role),   // ✅ long URI — mapped back by default claim map
                    new Claim("UserType",                "MongoDB")
                }),
                Expires            = DateTime.UtcNow.AddHours(_expiryInHours),
                Issuer             = _issuer,
                Audience           = _audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        /// <summary>
        /// Validate token and extract claims.
        /// </summary>
        public ClaimsPrincipal ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key          = Encoding.ASCII.GetBytes(_secretKey);

            try
            {
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey         = new SymmetricSecurityKey(key),
                    ValidateIssuer           = true,
                    ValidIssuer              = _issuer,
                    ValidateAudience         = true,
                    ValidAudience            = _audience,
                    ValidateLifetime         = true,
                    ClockSkew                = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return principal;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Extract user ID from token (works for both SQL int and MongoDB ObjectId).
        /// </summary>
        public string GetUserIdFromToken(string token)
        {
            var principal = ValidateToken(token);
            return principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        /// <summary>Check if user is MongoDB-based.</summary>
        public bool IsMongoDbUser(string token)
        {
            var principal = ValidateToken(token);
            return principal?.FindFirst("UserType")?.Value == "MongoDB";
        }

        /// <summary>Check if user is SQL-based.</summary>
        public bool IsSqlUser(string token)
        {
            var principal = ValidateToken(token);
            return principal?.FindFirst("UserType")?.Value == "SQL";
        }
    }
}
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Service to migrate users from SQL to MongoDB
    /// Run this once to copy existing SQL users to MongoDB
    /// </summary>
    public class UserMigrationService
    {
        private readonly IUserRepository _sqlUserRepository;
        private readonly IMongoUserRepository _mongoUserRepository;
        private readonly ILogger<UserMigrationService> _logger;

        public UserMigrationService(
            IUserRepository sqlUserRepository,
            IMongoUserRepository mongoUserRepository,
            ILogger<UserMigrationService> logger)
        {
            _sqlUserRepository = sqlUserRepository;
            _mongoUserRepository = mongoUserRepository;
            _logger = logger;
        }

        /// <summary>
        /// Migrate all SQL users to MongoDB
        /// </summary>
        public async Task<MigrationResult> MigrateAllUsersAsync()
        {
            var result = new MigrationResult();

            try
            {
                _logger.LogInformation("Starting user migration from SQL to MongoDB...");

                // Get all SQL users
                var sqlUsers = await _sqlUserRepository.GetAllAsync();
                result.TotalUsers = sqlUsers.Count();

                foreach (var sqlUser in sqlUsers)
                {
                    try
                    {
                        // Check if user already exists in MongoDB
                        var existingMongoUser = await _mongoUserRepository.GetByEmailAsync(sqlUser.Email);
                        
                        if (existingMongoUser != null)
                        {
                            _logger.LogWarning($"User {sqlUser.Email} already exists in MongoDB. Skipping.");
                            result.SkippedUsers++;
                            continue;
                        }

                        // Create MongoDB user
                        var mongoUser = new MongoUser
                        {
                            Email = sqlUser.Email,
                            PasswordHash = sqlUser.PasswordHash,
                            FullName = sqlUser.FullName,
                            Mobile = sqlUser.Mobile,
                            Role = sqlUser.Role.ToString(),
                            IsActive = sqlUser.IsActive,
                            CreatedAt = sqlUser.CreatedAt,
                            LastLoginAt = sqlUser.LastLoginAt,
                            SqlUserId = sqlUser.Id // Store SQL ID for reference
                        };

                        await _mongoUserRepository.AddAsync(mongoUser);
                        result.MigratedUsers++;

                        _logger.LogInformation($"Migrated user: {sqlUser.Email} (SQL ID: {sqlUser.Id} -> MongoDB ID: {mongoUser.Id})");
                    }
                    catch (Exception ex)
                    {
                        result.FailedUsers++;
                        result.Errors.Add($"Failed to migrate {sqlUser.Email}: {ex.Message}");
                        _logger.LogError(ex, $"Failed to migrate user {sqlUser.Email}");
                    }
                }

                _logger.LogInformation($"Migration completed. Total: {result.TotalUsers}, Migrated: {result.MigratedUsers}, Skipped: {result.SkippedUsers}, Failed: {result.FailedUsers}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Migration failed with critical error");
                result.Errors.Add($"Critical error: {ex.Message}");
            }

            return result;
        }

        /// <summary>
        /// Migrate a single user by SQL ID
        /// </summary>
        public async Task<bool> MigrateSingleUserAsync(int sqlUserId)
        {
            try
            {
                var sqlUser = await _sqlUserRepository.GetByIdAsync(sqlUserId);
                
                if (sqlUser == null)
                {
                    _logger.LogWarning($"SQL user with ID {sqlUserId} not found");
                    return false;
                }

                // Check if already migrated
                var existingMongoUser = await _mongoUserRepository.GetBySqlUserIdAsync(sqlUserId);
                if (existingMongoUser != null)
                {
                    _logger.LogWarning($"User {sqlUser.Email} already migrated");
                    return false;
                }

                var mongoUser = new MongoUser
                {
                    Email = sqlUser.Email,
                    PasswordHash = sqlUser.PasswordHash,
                    FullName = sqlUser.FullName,
                    Mobile = sqlUser.Mobile,
                    Role = sqlUser.Role.ToString(),
                    IsActive = sqlUser.IsActive,
                    CreatedAt = sqlUser.CreatedAt,
                    LastLoginAt = sqlUser.LastLoginAt,
                    SqlUserId = sqlUser.Id
                };

                await _mongoUserRepository.AddAsync(mongoUser);
                _logger.LogInformation($"Successfully migrated user: {sqlUser.Email}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to migrate user with SQL ID {sqlUserId}");
                return false;
            }
        }

        /// <summary>
        /// Verify migration integrity
        /// </summary>
        public async Task<VerificationResult> VerifyMigrationAsync()
        {
            var result = new VerificationResult();

            try
            {
                var sqlUsers = await _sqlUserRepository.GetAllAsync();
                var mongoUsers = await _mongoUserRepository.GetAllAsync();

                result.SqlUserCount = sqlUsers.Count();
                result.MongoUserCount = mongoUsers.Count();

                // Check if all SQL users have MongoDB counterparts
                foreach (var sqlUser in sqlUsers)
                {
                    var mongoUser = await _mongoUserRepository.GetByEmailAsync(sqlUser.Email);
                    if (mongoUser == null)
                    {
                        result.MissingUsers.Add(sqlUser.Email);
                    }
                    else if (mongoUser.SqlUserId != sqlUser.Id)
                    {
                        result.Mismatches.Add($"User {sqlUser.Email}: SQL ID mismatch");
                    }
                }

                result.IsSuccessful = result.MissingUsers.Count == 0 && result.Mismatches.Count == 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Verification failed");
                result.IsSuccessful = false;
            }

            return result;
        }
    }

    public class MigrationResult
    {
        public int TotalUsers { get; set; }
        public int MigratedUsers { get; set; }
        public int SkippedUsers { get; set; }
        public int FailedUsers { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }

    public class VerificationResult
    {
        public int SqlUserCount { get; set; }
        public int MongoUserCount { get; set; }
        public bool IsSuccessful { get; set; }
        public List<string> MissingUsers { get; set; } = new List<string>();
        public List<string> Mismatches { get; set; } = new List<string>();
    }
}
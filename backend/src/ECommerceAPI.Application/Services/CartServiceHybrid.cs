using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.DTOs.Cart;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    public class CartServiceHybrid : ICartService
    {
        private readonly ICartRepository _sqlRepository;
        private readonly ICartMongoRepository _mongoRepository;
        private readonly IProductRepository _sqlProductRepository;
        private readonly IProductMongoRepository _mongoProductRepository;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CartServiceHybrid> _logger;

        private readonly bool _useMongo;
        private readonly bool _dualWrite;

        public CartServiceHybrid(
            ICartRepository sqlRepository,
            ICartMongoRepository mongoRepository,
            IProductRepository sqlProductRepository,
            IProductMongoRepository mongoProductRepository,
            IConfiguration configuration,
            ILogger<CartServiceHybrid> logger)
        {
            _sqlRepository = sqlRepository;
            _mongoRepository = mongoRepository;
            _sqlProductRepository = sqlProductRepository;
            _mongoProductRepository = mongoProductRepository;
            _configuration = configuration;
            _logger = logger;

            _useMongo = _configuration.GetValue<bool>("FeatureFlags:UseMongoForCarts");
            _dualWrite = _configuration.GetValue<bool>("FeatureFlags:DualWriteCarts");

            _logger.LogInformation($"CartServiceHybrid initialized: UseMongo={_useMongo}, DualWrite={_dualWrite}");
        }

        // ========================================================================
        // NEW METHODS - String UserId (MongoDB ObjectId support)
        // ========================================================================

        public async Task<CartDto> GetCartByUserIdStringAsync(string userId)
        {
            // Try MongoDB first (handles both MongoDB ObjectId and SQL integer as string)
            if (_useMongo || !int.TryParse(userId, out _))
            {
                var mongoCart = await _mongoRepository.GetByUserIdStringAsync(userId)
                                ?? await CreateEmptyMongoCart(userId);
                return MapMongoToDto(mongoCart);
            }

            // SQL mode
            int sqlUserId = int.Parse(userId);
            var sqlCart = await _sqlRepository.GetByUserIdAsync(sqlUserId)
                          ?? await CreateEmptySqlCart(sqlUserId);

            if (_dualWrite)
                await SyncCartToMongo(sqlCart);

            return MapSqlToDto(sqlCart);
        }

        public async Task<CartDto> AddToCartByUserIdStringAsync(string userId, string productId, int quantity)
        {
            if (quantity <= 0) quantity = 1;

            // Determine if userId is Mongo ObjectId or SQL int
            bool isMongoUser = _useMongo || !int.TryParse(userId, out _);

            if (isMongoUser)
            {
                var product = await _mongoProductRepository.GetByIdAsync(productId);
                if (product == null)
                    throw new KeyNotFoundException($"Product not found or inactive: {productId}");
                
                if (!product.IsActive)
                    throw new InvalidOperationException($"Product is inactive: {productId}");

                var cart = await _mongoRepository.GetByUserIdStringAsync(userId)
                        ?? new CartMongo { UserId = userId, CreatedAt = DateTime.UtcNow, Items = new List<CartItemMongo>() };

                var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
                if (item != null)
                {
                    item.Quantity += quantity;
                }
                else
                {
                    cart.Items.Add(new CartItemMongo
                    {
                        ProductId = productId,
                        ProductName = product.Name,
                        Price = product.Price,
                        Quantity = quantity,
                        ImageUrl = product.ImageUrl ?? "",
                        Brand = product.Brand ?? "",
                        StockQuantity = product.StockQuantity,
                        AddedAt = DateTime.UtcNow
                    });
                }

                cart.UpdatedAt = DateTime.UtcNow;

                if (string.IsNullOrEmpty(cart.Id))
                    await _mongoRepository.AddAsync(cart);
                else
                    await _mongoRepository.UpdateAsync(cart.Id, cart);

                return MapMongoToDto(cart);
            }

            // SQL fallback
            if (!int.TryParse(userId, out int sqlUserId))
                throw new InvalidOperationException("SQL cart requires numeric userId");

            if (!int.TryParse(productId, out int sqlProductId))
                throw new InvalidOperationException("SQL cart requires numeric productId");

            var sqlCart = await _sqlRepository.GetByUserIdAsync(sqlUserId)
                        ?? await CreateEmptySqlCart(sqlUserId);

            var sqlProduct = await _sqlProductRepository.GetByIdAsync(sqlProductId)
                            ?? throw new KeyNotFoundException($"Product not found: {productId}");

            var existingItem = sqlCart.CartItems.FirstOrDefault(x => x.ProductId == sqlProductId);
            if (existingItem != null) 
                existingItem.Quantity += quantity;
            else
            {
                sqlCart.CartItems.Add(new ECommerceAPI.Domain.Entities.CartItem
                {
                    ProductId = sqlProductId,
                    Quantity = quantity,
                    AddedAt = DateTime.UtcNow
                });
            }

            sqlCart.UpdatedAt = DateTime.UtcNow;
            await _sqlRepository.UpdateAsync(sqlCart);

            if (_dualWrite)
                await SyncCartToMongo(sqlCart);

            return MapSqlToDto(sqlCart);
        }

        public async Task<CartDto> UpdateQuantityByUserIdStringAsync(string userId, string productId, int quantity)
        {
            // Try MongoDB first
            if (_useMongo || !int.TryParse(userId, out _))
            {
                var cart = await _mongoRepository.GetByUserIdStringAsync(userId)
                           ?? throw new KeyNotFoundException("Cart not found");

                var item = cart.Items.FirstOrDefault(i => i.ProductId == productId)
                           ?? throw new KeyNotFoundException("Item not found in cart");

                if (quantity <= 0) 
                    cart.Items.Remove(item);
                else 
                    item.Quantity = quantity;

                cart.UpdatedAt = DateTime.UtcNow;
                await _mongoRepository.UpdateAsync(cart.Id, cart);

                return MapMongoToDto(cart);
            }

            // SQL mode
            if (!int.TryParse(userId, out int sqlUserId))
                throw new InvalidOperationException("SQL cart requires numeric userId");

            if (!int.TryParse(productId, out int sqlProductId))
                throw new InvalidOperationException("SQL cart requires numeric productId");

            var sqlCart = await _sqlRepository.GetByUserIdAsync(sqlUserId)
                          ?? throw new KeyNotFoundException("Cart not found");

            var sqlItem = sqlCart.CartItems.FirstOrDefault(i => i.ProductId == sqlProductId)
                          ?? throw new KeyNotFoundException("Item not found in cart");

            if (quantity <= 0) 
                sqlCart.CartItems.Remove(sqlItem);
            else 
                sqlItem.Quantity = quantity;

            sqlCart.UpdatedAt = DateTime.UtcNow;
            await _sqlRepository.UpdateAsync(sqlCart);

            if (_dualWrite)
                await SyncCartToMongo(sqlCart);

            return MapSqlToDto(sqlCart);
        }

        public async Task RemoveFromCartByUserIdStringAsync(string userId, string productId)
        {
            // Try MongoDB first
            if (_useMongo || !int.TryParse(userId, out _))
            {
                var cart = await _mongoRepository.GetByUserIdStringAsync(userId)
                           ?? throw new KeyNotFoundException("Cart not found");

                var item = cart.Items.FirstOrDefault(i => i.ProductId == productId)
                           ?? throw new KeyNotFoundException("Item not found in cart");

                cart.Items.Remove(item);
                cart.UpdatedAt = DateTime.UtcNow;
                await _mongoRepository.UpdateAsync(cart.Id, cart);
                return;
            }

            // SQL mode
            if (!int.TryParse(userId, out int sqlUserId))
                throw new InvalidOperationException("SQL cart requires numeric userId");

            if (!int.TryParse(productId, out int sqlProductId))
                throw new InvalidOperationException("SQL cart requires numeric productId");

            var sqlCart = await _sqlRepository.GetByUserIdAsync(sqlUserId)
                          ?? throw new KeyNotFoundException("Cart not found");

            var sqlItem = sqlCart.CartItems.FirstOrDefault(i => i.ProductId == sqlProductId);
            if (sqlItem != null)
            {
                sqlCart.CartItems.Remove(sqlItem);
                sqlCart.UpdatedAt = DateTime.UtcNow;
                await _sqlRepository.UpdateAsync(sqlCart);

                if (_dualWrite) 
                    await SyncCartToMongo(sqlCart);
            }
        }

        public async Task ClearCartByUserIdStringAsync(string userId)
        {
            // Try MongoDB first
            if (_useMongo || !int.TryParse(userId, out _))
            {
                var cart = await _mongoRepository.GetByUserIdStringAsync(userId);
                if (cart == null) return;

                cart.Items.Clear();
                cart.UpdatedAt = DateTime.UtcNow;
                await _mongoRepository.UpdateAsync(cart.Id, cart);
                return;
            }

            // SQL mode
            if (!int.TryParse(userId, out int sqlUserId))
                throw new InvalidOperationException("SQL cart requires numeric userId");

            var sqlCart = await _sqlRepository.GetByUserIdAsync(sqlUserId);
            if (sqlCart == null) return;

            sqlCart.CartItems.Clear();
            sqlCart.UpdatedAt = DateTime.UtcNow;
            await _sqlRepository.UpdateAsync(sqlCart);

            if (_dualWrite) 
                await SyncCartToMongo(sqlCart);
        }

        // ========================================================================
        // LEGACY METHODS - int UserId (backward compatibility)
        // ========================================================================

        public async Task<CartDto> GetCartAsync(int userId)
        {
            return await GetCartByUserIdStringAsync(userId.ToString());
        }

        public async Task<CartDto> AddToCartAsync(int userId, string productId, int quantity)
        {
            return await AddToCartByUserIdStringAsync(userId.ToString(), productId, quantity);
        }

        public async Task<CartDto> UpdateQuantityAsync(int userId, string productId, int quantity)
        {
            return await UpdateQuantityByUserIdStringAsync(userId.ToString(), productId, quantity);
        }

        public async Task RemoveFromCartAsync(int userId, string productId)
        {
            await RemoveFromCartByUserIdStringAsync(userId.ToString(), productId);
        }

        public async Task ClearCartAsync(int userId)
        {
            await ClearCartByUserIdStringAsync(userId.ToString());
        }

        // ========================================================================
        // HELPER METHODS
        // ========================================================================

        private async Task<CartMongo> CreateEmptyMongoCart(string userId)
        {
            var cart = new CartMongo
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            await _mongoRepository.AddAsync(cart);
            return cart;
        }

        private async Task<Cart> CreateEmptySqlCart(int userId)
        {
            var cart = new Cart
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                CartItems = new List<ECommerceAPI.Domain.Entities.CartItem>()
            };

            await _sqlRepository.AddAsync(cart);
            return cart;
        }

        private async Task<CartMongo> SyncCartToMongo(Cart sqlCart)
        {
            var mongoCart = await _mongoRepository.GetByUserIdAsync(sqlCart.UserId)
                            ?? new CartMongo
                            {
                                SqlId = sqlCart.Id,
                                UserId = sqlCart.UserId.ToString(),
                                CreatedAt = sqlCart.CreatedAt
                            };

            mongoCart.Items.Clear();

            foreach (var item in sqlCart.CartItems ?? new List<ECommerceAPI.Domain.Entities.CartItem>())
            {
                var product = await _sqlProductRepository.GetByIdAsync(item.ProductId);
                if (product == null) continue;

                mongoCart.Items.Add(new CartItemMongo
                {
                    SqlItemId = item.Id,
                    ProductId = item.ProductId.ToString(),
                    ProductName = product.Name,
                    Price = product.Price,
                    Quantity = item.Quantity,
                    ImageUrl = product.ImageUrl ?? "",
                    Brand = product.Brand ?? "",
                    StockQuantity = product.StockQuantity,
                    AddedAt = item.AddedAt
                });
            }

            mongoCart.UpdatedAt = DateTime.UtcNow;

            if (string.IsNullOrEmpty(mongoCart.Id))
                await _mongoRepository.AddAsync(mongoCart);
            else
                await _mongoRepository.UpdateAsync(mongoCart.Id, mongoCart);

            return mongoCart;
        }

        private CartDto MapMongoToDto(CartMongo cart)
        {
            var items = cart.Items?.Select(i => new CartItemDto
            {
                ProductId = int.TryParse(i.ProductId, out int productId) ? productId : 0,
                ProductIdString = i.ProductId, // NEW: Keep original string ID
                ProductName = i.ProductName,
                Price = i.Price,
                Quantity = i.Quantity,
                ImageUrl = i.ImageUrl,
                Brand = i.Brand,
                Subtotal = i.Subtotal
            }).ToList() ?? new List<CartItemDto>();

            return new CartDto
            {
                CartId = (cart.SqlId ?? 0).ToString(),
                MongoCartId = cart.Id,
                Items = items,
                TotalAmount = items.Sum(i => i.Subtotal),
                TotalItems = items.Sum(i => i.Quantity)
            };
        }

        private CartDto MapSqlToDto(Cart cart)
        {
            var items = cart.CartItems?.Select(ci => new CartItemDto
            {
                ProductId = ci.ProductId,
                ProductIdString = ci.ProductId.ToString(),
                ProductName = ci.Product?.Name ?? "",
                Price = ci.Product?.Price ?? 0,
                Quantity = ci.Quantity,
                ImageUrl = ci.Product?.ImageUrl ?? "",
                Brand = ci.Product?.Brand ?? "",
                Subtotal = (ci.Product?.Price ?? 0) * ci.Quantity
            }).ToList() ?? new List<CartItemDto>();

            return new CartDto
            {
                CartId = cart.Id.ToString(),
                Items = items,
                TotalAmount = items.Sum(i => i.Subtotal),
                TotalItems = items.Sum(i => i.Quantity)
            };
        }
    }
}
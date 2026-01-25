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

        public async Task<CartDto> GetCartAsync(int userId)
        {
            if (_useMongo)
            {
                var mongoCart = await _mongoRepository.GetByUserIdAsync(userId)
                                ?? await CreateEmptyCart(userId);
                return MapMongoToDto(mongoCart);
            }

            var sqlCart = await _sqlRepository.GetByUserIdAsync(userId)
                          ?? await CreateEmptySqlCart(userId);

            if (_dualWrite)
                await SyncCartToMongo(sqlCart);

            return MapSqlToDto(sqlCart);
        }

        public async Task<CartDto> AddToCartAsync(int userId, string productId, int quantity)
        {
            if (quantity <= 0) quantity = 1;

            if (_useMongo)
            {
                var product = await _mongoProductRepository.GetByIdAsync(productId)
                              ?? throw new KeyNotFoundException("Product not found in MongoDB");

                var cart = await _mongoRepository.GetByUserIdAsync(userId)
                          ?? new CartMongo { UserId = userId.ToString(), CreatedAt = DateTime.UtcNow };

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

            // SQL mode
            if (!int.TryParse(productId, out int sqlProductId))
                throw new InvalidOperationException("SQL cart expects numeric productId");

            var sqlCart = await _sqlRepository.GetByUserIdAsync(userId)
                          ?? await CreateEmptySqlCart(userId);

            var sqlProduct = await _sqlProductRepository.GetByIdAsync(sqlProductId)
                             ?? throw new KeyNotFoundException("Product not found in SQL");

            var existingItem = sqlCart.CartItems.FirstOrDefault(x => x.ProductId == sqlProductId);
            if (existingItem != null) existingItem.Quantity += quantity;
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

        public async Task<CartDto> UpdateQuantityAsync(int userId, string productId, int quantity)
        {
            if (_useMongo)
            {
                var cart = await _mongoRepository.GetByUserIdAsync(userId)
                           ?? throw new KeyNotFoundException("Cart not found");

                var item = cart.Items.FirstOrDefault(i => i.ProductId == productId)
                           ?? throw new KeyNotFoundException("Item not found in cart");

                if (quantity <= 0) cart.Items.Remove(item);
                else item.Quantity = quantity;

                cart.UpdatedAt = DateTime.UtcNow;
                await _mongoRepository.UpdateAsync(cart.Id, cart);

                return MapMongoToDto(cart);
            }

            // SQL mode
            if (!int.TryParse(productId, out int sqlProductId))
                throw new InvalidOperationException("SQL cart expects numeric productId");

            var sqlCart = await _sqlRepository.GetByUserIdAsync(userId)
                          ?? throw new KeyNotFoundException("Cart not found");

            var sqlItem = sqlCart.CartItems.FirstOrDefault(i => i.ProductId == sqlProductId)
                          ?? throw new KeyNotFoundException("Item not found in cart");

            if (quantity <= 0) sqlCart.CartItems.Remove(sqlItem);
            else sqlItem.Quantity = quantity;

            sqlCart.UpdatedAt = DateTime.UtcNow;
            await _sqlRepository.UpdateAsync(sqlCart);

            if (_dualWrite)
                await SyncCartToMongo(sqlCart);

            return MapSqlToDto(sqlCart);
        }

        public async Task RemoveFromCartAsync(int userId, string productId)
        {
            if (_useMongo)
            {
                var cart = await _mongoRepository.GetByUserIdAsync(userId)
                           ?? throw new KeyNotFoundException("Cart not found");

                var item = cart.Items.FirstOrDefault(i => i.ProductId == productId)
                           ?? throw new KeyNotFoundException("Item not found in cart");

                cart.Items.Remove(item);
                cart.UpdatedAt = DateTime.UtcNow;
                await _mongoRepository.UpdateAsync(cart.Id, cart);
                return;
            }

            // SQL mode
            if (!int.TryParse(productId, out int sqlProductId))
                throw new InvalidOperationException("SQL cart expects numeric productId");

            var sqlCart = await _sqlRepository.GetByUserIdAsync(userId)
                          ?? throw new KeyNotFoundException("Cart not found");

            var sqlItem = sqlCart.CartItems.FirstOrDefault(i => i.ProductId == sqlProductId);
            if (sqlItem != null)
            {
                sqlCart.CartItems.Remove(sqlItem);
                sqlCart.UpdatedAt = DateTime.UtcNow;
                await _sqlRepository.UpdateAsync(sqlCart);

                if (_dualWrite) await SyncCartToMongo(sqlCart);
            }
        }

        public async Task ClearCartAsync(int userId)
        {
            if (_useMongo)
            {
                var cart = await _mongoRepository.GetByUserIdAsync(userId);
                if (cart == null) return;

                cart.Items.Clear();
                cart.UpdatedAt = DateTime.UtcNow;
                await _mongoRepository.UpdateAsync(cart.Id, cart);
                return;
            }

            var sqlCart = await _sqlRepository.GetByUserIdAsync(userId);
            if (sqlCart == null) return;

            sqlCart.CartItems.Clear();
            sqlCart.UpdatedAt = DateTime.UtcNow;
            await _sqlRepository.UpdateAsync(sqlCart);

            if (_dualWrite) await SyncCartToMongo(sqlCart);
        }

        // ---------------- Helper Methods ----------------

        private async Task<CartMongo> CreateEmptyCart(int userId)
        {
            var cart = new CartMongo
            {
                UserId = userId.ToString(),
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

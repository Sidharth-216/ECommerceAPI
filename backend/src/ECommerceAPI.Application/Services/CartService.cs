using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Cart Service - Manages shopping cart operations
    /// Follows Single Responsibility Principle
    /// </summary>
    public class CartService : ICartService
    {
        private readonly ICartRepository _cartRepository;
        private readonly IProductRepository _productRepository;
        private readonly ICartRepository _mongoRepository;
        private readonly IProductRepository _mongoProductRepository;
        private readonly ILogger<CartService> _logger;
        private readonly bool _useMongo = true;

        public CartService(
            ICartRepository cartRepository,
            IProductRepository productRepository,
            ICartRepository mongoRepository,
            IProductRepository mongoProductRepository,
            ILogger<CartService> logger)
        {
            _cartRepository = cartRepository;
            _productRepository = productRepository;
            _mongoRepository = mongoRepository;
            _mongoProductRepository = mongoProductRepository;
            _logger = logger;
        }

        public async Task<CartDto> GetCartAsync(int userId)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId);
            
            if (cart == null)
            {
                // Create empty cart if doesn't exist
                cart = new Cart { UserId = userId, CreatedAt = DateTime.UtcNow };
                await _cartRepository.AddAsync(cart);
            }

            return MapToDto(cart);
        }


        public async Task<CartDto> AddToCartAsync(int userId, string productId, int quantity)
        {
            try
            {
                if (quantity <= 0) quantity = 1;

                // Only Mongo Cart is used now
                if (!_useMongo)
                    throw new InvalidOperationException("Mongo cart is disabled. Enable FeatureFlags:UseMongoForCarts = true");

                // Validate product exists in Mongo
                var product = await _mongoProductRepository.GetByIdAsync(int.Parse(productId));
                if (product == null)
                    throw new KeyNotFoundException("Product not found");

                // Get cart
                var cart = await _mongoRepository.GetByUserIdAsync(userId);

                if (cart == null)
                {
                    cart = new Cart
                    {
                        UserId = userId,
                        CartItems = new List<CartItem>(),
                        CreatedAt = DateTime.UtcNow
                    };
                }

                // Add / update item
                var existingItem = cart.CartItems.FirstOrDefault(x => x.ProductId == int.Parse(productId));

                if (existingItem != null)
                {
                    existingItem.Quantity += quantity;
                }
                else
                {
                    cart.CartItems.Add(new CartItem
                    {
                        ProductId = int.Parse(productId),
                        Quantity = quantity
                    });
                }

                cart.UpdatedAt = DateTime.UtcNow;

                // Save to Mongo (create if new, update if exists)
                if (cart.Id == 0)
                    await _mongoRepository.AddAsync(cart);
                else
                    await _mongoRepository.UpdateAsync(cart);

                return MapToDto(cart);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in AddToCartAsync user={userId} productId={productId}");
                throw;
            }
        }

        public async Task<CartDto> UpdateQuantityAsync(int userId, string productId, int quantity)
        {
            if (!_useMongo)
                throw new InvalidOperationException("Mongo cart is disabled.");

            var cart = await _mongoRepository.GetByUserIdAsync(userId);
            if (cart == null)
                throw new KeyNotFoundException("Cart not found");

            var item = cart.CartItems.FirstOrDefault(x => x.ProductId == int.Parse(productId));
            if (item == null)
                throw new KeyNotFoundException("Item not found in cart");

            if (quantity <= 0)
            {
                cart.CartItems.Remove(item);
            }
            else
            {
                // optional stock validation
                var product = await _mongoProductRepository.GetByIdAsync(int.Parse(productId));
                if (product == null)
                    throw new KeyNotFoundException("Product not found");

                if (product.StockQuantity < quantity)
                    throw new InvalidOperationException("Insufficient stock");

                item.Quantity = quantity;
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _mongoRepository.UpdateAsync(cart);

            return MapToDto(cart);
        }


        public async Task RemoveFromCartAsync(int userId, string productId)
        {
            if (!_useMongo)
                throw new InvalidOperationException("Mongo cart is disabled.");

            var cart = await _mongoRepository.GetByUserIdAsync(userId);
            if (cart == null)
                throw new KeyNotFoundException("Cart not found");

            var item = cart.CartItems.FirstOrDefault(x => x.ProductId == int.Parse(productId));
            if (item == null)
                return;

            cart.CartItems.Remove(item);
            cart.UpdatedAt = DateTime.UtcNow;

            await _mongoRepository.UpdateAsync(cart);
        }

        public async Task ClearCartAsync(int userId)
        {
            if (!_useMongo)
                throw new InvalidOperationException("Mongo cart is disabled.");

            var cart = await _mongoRepository.GetByUserIdAsync(userId);
            if (cart == null)
                return;

            cart.CartItems.Clear();
            cart.UpdatedAt = DateTime.UtcNow;

            await _mongoRepository.UpdateAsync(cart);
        }


        private CartDto MapToDto(Cart cart)
        {
            return new CartDto
            {
                CartId = cart.Id.ToString(),
                Items = cart.CartItems?.Select(ci => new CartItemDto
                {
                    ProductId = ci.ProductId,
                    ProductName = ci.Product?.Name,
                    Price = ci.Product?.Price ?? 0,
                    Quantity = ci.Quantity,
                    ImageUrl = ci.Product?.ImageUrl
                }).ToList() ?? new List<CartItemDto>(),
                TotalAmount = cart.CartItems?.Sum(ci => (ci.Product?.Price ?? 0) * ci.Quantity) ?? 0
            };
        }

        private CartDto MapMongoToDto(Cart cart)
        {
            return new CartDto
            {
                CartId = cart.Id.ToString(),
                Items = cart.CartItems?.Select(item => new CartItemDto
                {
                    ProductId = item.ProductId,
                    ProductName = item.Product?.Name,
                    Price = item.Product?.Price ?? 0,
                    Quantity = item.Quantity,
                    ImageUrl = item.Product?.ImageUrl
                }).ToList() ?? new List<CartItemDto>(),
                TotalAmount = cart.CartItems?.Sum(item => (item.Product?.Price ?? 0) * item.Quantity) ?? 0
            };
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.DTOs.Cart;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    public class CartService : ICartService
    {
        private readonly ICartMongoRepository _cartRepository;
        private readonly IProductMongoRepository _productRepository;
        private readonly ILogger<CartService> _logger;

        public CartService(
            ICartMongoRepository cartRepository,
            IProductMongoRepository productRepository,
            ILogger<CartService> logger)
        {
            _cartRepository = cartRepository;
            _productRepository = productRepository;
            _logger = logger;
        }

        // ===================== MONGO METHODS =====================

        public async Task<CartDto> GetCartByUserIdStringAsync(string userId)
        {
            var cart = await _cartRepository.GetByUserIdStringAsync(userId);

            if (cart == null)
            {
                cart = new CartMongo
                {
                    UserId = userId,
                    Items = new List<CartItemMongo>()
                };

                await _cartRepository.AddAsync(cart);
            }

            return MapMongoToDto(cart);
        }

        public async Task<CartDto> AddToCartByUserIdStringAsync(
            string userId,
            string productId,
            int quantity)
        {
            if (quantity <= 0) quantity = 1;

            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null || !product.IsActive)
                throw new KeyNotFoundException("Product not found");

            var cart = await _cartRepository.GetByUserIdStringAsync(userId);

            if (cart == null)
            {
                cart = new CartMongo
                {
                    UserId = userId,
                    Items = new List<CartItemMongo>()
                };

                await _cartRepository.AddAsync(cart);
            }

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
                    ImageUrl = product.ImageUrl
                });
            }

            await _cartRepository.UpdateAsync(cart.Id, cart);

            return MapMongoToDto(cart);
        }

        public async Task<CartDto> UpdateQuantityByUserIdStringAsync(
            string userId,
            string productId,
            int quantity)
        {
            var cart = await _cartRepository.GetByUserIdStringAsync(userId);
            if (cart == null)
                throw new KeyNotFoundException("Cart not found");

            var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
            if (item == null)
                throw new KeyNotFoundException("Item not found in cart");

            if (quantity <= 0)
            {
                cart.Items.Remove(item);
            }
            else
            {
                var product = await _productRepository.GetByIdAsync(productId);
                if (product == null)
                    throw new KeyNotFoundException("Product not found");

                if (product.StockQuantity < quantity)
                    throw new InvalidOperationException("Insufficient stock");

                item.Quantity = quantity;
            }

            await _cartRepository.UpdateAsync(cart.Id, cart);
            return MapMongoToDto(cart);
        }

        public async Task RemoveFromCartByUserIdStringAsync(string userId, string productId)
        {
            var cart = await _cartRepository.GetByUserIdStringAsync(userId);
            if (cart == null) return;

            var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
            if (item == null) return;

            cart.Items.Remove(item);
            await _cartRepository.UpdateAsync(cart.Id, cart);
        }

        public async Task ClearCartByUserIdStringAsync(string userId)
        {
            var cart = await _cartRepository.GetByUserIdStringAsync(userId);
            if (cart == null) return;

            cart.Items.Clear();
            await _cartRepository.UpdateAsync(cart.Id, cart);
        }

        // ===================== LEGACY SQL METHODS (BLOCKED) =====================

        public Task<CartDto> GetCartAsync(int userId)
            => throw new NotSupportedException("SQL carts are no longer supported.");

        public Task<CartDto> AddToCartAsync(int userId, string productId, int quantity)
            => throw new NotSupportedException("SQL carts are no longer supported.");

        public Task<CartDto> UpdateQuantityAsync(int userId, string productId, int quantity)
            => throw new NotSupportedException("SQL carts are no longer supported.");

        public Task RemoveFromCartAsync(int userId, string productId)
            => throw new NotSupportedException("SQL carts are no longer supported.");

        public Task ClearCartAsync(int userId)
            => throw new NotSupportedException("SQL carts are no longer supported.");

        // ===================== MAPPING =====================

        private CartDto MapMongoToDto(CartMongo cart)
        {
            return new CartDto
            {
                CartId = cart.SqlId?.ToString(),   // legacy (nullable)
                MongoCartId = cart.Id,             // real Mongo ID

                Items = cart.Items?.Select(i => new CartItemDto
                {
                    ProductId = 0,                     // legacy support
                    ProductIdString = i.ProductId,     // Mongo ObjectId

                    ProductName = i.ProductName,
                    Price = i.Price,
                    Quantity = i.Quantity,
                    ImageUrl = i.ImageUrl,
                    Brand = i.Brand,

                    // ✅ DTO computes subtotal (NOT entity)
                    Subtotal = i.Price * i.Quantity
                }).ToList() ?? new List<CartItemDto>(),

                TotalItems = cart.Items?.Sum(i => i.Quantity) ?? 0,
                TotalAmount = cart.Items?.Sum(i => i.Price * i.Quantity) ?? 0
            };
        }

    }
}

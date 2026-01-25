using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using ECommerceAPI.Application.DTOs.Cart;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces.Mongo;

namespace ECommerceAPI.Application.Services.Mongo
{
    public class MongoCartService : ICartService
    {
        private readonly IMongoCartRepository _cartRepository;

        public MongoCartService(IMongoCartRepository cartRepository)
        {
            _cartRepository = cartRepository;
        }

        public async Task<CartDto> GetCartAsync(int userId)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId.ToString()) 
                       ?? new MongoCart { UserId = userId.ToString() };

            return new CartDto
            {
                Items = cart.Items.Select(i => new CartItemDto
                {
                    ProductId = int.Parse(i.MongoProductId),
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList()
            };
        }

        public async Task<CartDto> AddToCartAsync(int userId, string productId, int quantity)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId.ToString()) 
                       ?? new MongoCart { UserId = userId.ToString() };

            var existingItem = cart.Items.FirstOrDefault(i => i.MongoProductId == productId);
            if (existingItem != null)
            {
                existingItem.Quantity += quantity;
            }
            else
            {
                cart.Items.Add(new CartItem
                {
                    MongoProductId = productId,
                    Quantity = quantity,
                    Price = 0
                });
            }

            cart.TotalPrice = cart.Items.Sum(i => i.Price * i.Quantity);
            cart.UpdatedAt = DateTime.UtcNow;

            var updatedCart = await _cartRepository.AddOrUpdateAsync(cart);

            return new CartDto
            {
                Items = updatedCart.Items.Select(i => new CartItemDto
                {
                    ProductId = int.Parse(i.MongoProductId),
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList()
            };
        }

        public async Task<CartDto> UpdateQuantityAsync(int userId, string productId, int quantity)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId.ToString());
            if (cart == null) throw new KeyNotFoundException("Cart not found");

            var item = cart.Items.FirstOrDefault(i => i.MongoProductId == productId);
            if (item == null) throw new KeyNotFoundException("Product not found in cart");

            item.Quantity = quantity;
            cart.TotalPrice = cart.Items.Sum(i => i.Price * i.Quantity);
            cart.UpdatedAt = DateTime.UtcNow;

            var updatedCart = await _cartRepository.AddOrUpdateAsync(cart);

            return new CartDto
            {
                Items = updatedCart.Items.Select(i => new CartItemDto
                {
                    ProductId = int.Parse(i.MongoProductId),
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList()
            };
        }

        public async Task RemoveFromCartAsync(int userId, string productId)
        {
            await _cartRepository.RemoveItemAsync(userId.ToString(), productId);
        }

        public async Task ClearCartAsync(int userId)
        {
            await _cartRepository.ClearCartAsync(userId.ToString());
        }
    }
}

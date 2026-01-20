using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using System;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities;
//using ECommerceAPI.Infrastructure.Repositories.Interfaces;

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

        public CartService(
            ICartRepository cartRepository,
            IProductRepository productRepository)
        {
            _cartRepository = cartRepository;
            _productRepository = productRepository;
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

        public async Task<CartDto> AddToCartAsync(int userId, int productId, int quantity)
        {
            // Validate product exists and has stock
            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null)
                throw new KeyNotFoundException("Product not found");

            if (product.StockQuantity < quantity)
                throw new InvalidOperationException("Insufficient stock");

            // Get or create cart
            var cart = await _cartRepository.GetByUserIdAsync(userId);
            if (cart == null)
            {
                cart = new Cart { UserId = userId, CreatedAt = DateTime.UtcNow };
                await _cartRepository.AddAsync(cart);
            }

            // Check if product already in cart
            var existingItem = cart.CartItems?.FirstOrDefault(ci => ci.ProductId == productId);
            
            if (existingItem != null)
            {
                existingItem.Quantity += quantity;
            }
            else
            {
                var cartItem = new CartItem
                {
                    CartId = cart.Id,
                    ProductId = productId,
                    Quantity = quantity,
                    AddedAt = DateTime.UtcNow
                };
                
                cart.CartItems.Add(cartItem);
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _cartRepository.UpdateAsync(cart);

            return MapToDto(cart);
        }

        public async Task<CartDto> UpdateQuantityAsync(int userId, int productId, int quantity)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId);
            if (cart == null)
                throw new KeyNotFoundException("Cart not found");

            var cartItem = cart.CartItems?.FirstOrDefault(ci => ci.ProductId == productId);
            if (cartItem == null)
                throw new KeyNotFoundException("Item not in cart");

            if (quantity <= 0)
            {
                cart.CartItems.Remove(cartItem);
            }
            else
            {
                // Validate stock
                var product = await _productRepository.GetByIdAsync(productId);
                if (product.StockQuantity < quantity)
                    throw new InvalidOperationException("Insufficient stock");

                cartItem.Quantity = quantity;
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _cartRepository.UpdateAsync(cart);

            return MapToDto(cart);
        }

        public async Task RemoveFromCartAsync(int userId, int productId)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId);
            if (cart == null)
                throw new KeyNotFoundException("Cart not found");

            var cartItem = cart.CartItems?.FirstOrDefault(ci => ci.ProductId == productId);
            if (cartItem != null)
            {
                cart.CartItems.Remove(cartItem);
                cart.UpdatedAt = DateTime.UtcNow;
                await _cartRepository.UpdateAsync(cart);
            }
        }

        public async Task ClearCartAsync(int userId)
        {
            var cart = await _cartRepository.GetByUserIdAsync(userId);
            if (cart != null)
            {
                cart.CartItems.Clear();
                cart.UpdatedAt = DateTime.UtcNow;
                await _cartRepository.UpdateAsync(cart);
            }
        }

        private CartDto MapToDto(Cart cart)
        {
            return new CartDto
            {
                CartId = cart.Id,
                Items = cart.CartItems?.Select(ci => new CartItemDto
                {
                    ProductId = ci.ProductId,
                    ProductName = ci.Product?.Name,
                    Price = ci.Product?.Price ?? 0,
                    Quantity = ci.Quantity,
                    ImageUrl = ci.Product?.ImageUrl
                }).ToList() ?? new List<CartItemDto>(),
                TotalAmount = cart.CartItems?.Sum(ci => ci.Product.Price * ci.Quantity) ?? 0
            };
        }
    }
}

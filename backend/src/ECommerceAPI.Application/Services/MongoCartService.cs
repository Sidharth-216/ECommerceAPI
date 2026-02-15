using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using ECommerceAPI.Application.DTOs.Cart;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;  // ✅ CORRECTED NAMESPACE
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Pure MongoDB Cart Service - NO SQL DEPENDENCIES
    /// </summary>
    public class MongoCartService : IMongoCartService
    {
        private readonly ICartMongoRepository _cartRepository;
        private readonly IProductMongoRepository _productRepository;

        public MongoCartService(
            ICartMongoRepository cartRepository,
            IProductMongoRepository productRepository)
        {
            _cartRepository = cartRepository;
            _productRepository = productRepository;
        }

        public async Task<CartDto> GetCartAsync(string userId)
        {
            Console.WriteLine($"📋 [MongoCartService] GetCartAsync for user: {userId}");
            
            // Validate MongoDB ObjectId format
            if (!ObjectId.TryParse(userId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB User ID format: {userId}");
                throw new ArgumentException($"Invalid MongoDB User ID format: {userId}");
            }
            
            var cart = await _cartRepository.GetByUserIdAsync(userId);
            
            if (cart == null)
            {
                Console.WriteLine($"🆕 Cart not found, creating new cart for user: {userId}");
                
                // Create new cart if doesn't exist
                cart = new CartMongo  // ✅ CORRECTED CLASS NAME
                {
                    UserId = userId,
                    Items = new List<CartItemMongo>(),  // ✅ CORRECTED CLASS NAME
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                await _cartRepository.AddAsync(cart);
                Console.WriteLine($"✅ New cart created with ID: {cart.Id}");
            }

            return MapToDto(cart);
        }

        public async Task<CartDto> AddItemAsync(string userId, string productId, int quantity = 1)
        {
            Console.WriteLine($"➕ [MongoCartService] AddItemAsync");
            Console.WriteLine($"   User ID: {userId}");
            Console.WriteLine($"   Product ID: {productId}");
            Console.WriteLine($"   Quantity: {quantity}");
            
            // Validate inputs
            if (string.IsNullOrEmpty(productId))
            {
                Console.WriteLine("❌ Product ID is required");
                throw new ArgumentException("Product ID is required");
            }

            if (quantity <= 0)
            {
                Console.WriteLine("❌ Quantity must be greater than 0");
                throw new ArgumentException("Quantity must be greater than 0");
            }

            // Validate MongoDB ObjectId formats
            if (!ObjectId.TryParse(userId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB User ID format: {userId}");
                throw new ArgumentException($"Invalid MongoDB User ID format: {userId}");
            }
            
            if (!ObjectId.TryParse(productId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB Product ID format: {productId}");
                throw new ArgumentException($"Invalid MongoDB Product ID format: {productId}");
            }

            // Verify product exists and has stock
            Console.WriteLine($"🔍 Fetching product: {productId}");
            var product = await _productRepository.GetByIdAsync(productId);
            
            if (product == null)
            {
                Console.WriteLine($"❌ Product not found: {productId}");
                throw new KeyNotFoundException($"Product not found: {productId}");
            }

            Console.WriteLine($"✅ Product found: {product.Name}");
            Console.WriteLine($"   Price: ₹{product.Price}");
            Console.WriteLine($"   Stock: {product.StockQuantity}");

            if (product.StockQuantity < quantity)
            {
                Console.WriteLine($"❌ Insufficient stock. Available: {product.StockQuantity}, Requested: {quantity}");
                throw new InvalidOperationException($"Insufficient stock. Available: {product.StockQuantity}");
            }

            // Get or create cart
            var cart = await _cartRepository.GetByUserIdAsync(userId);
            
            if (cart == null)
            {
                Console.WriteLine($"🆕 Creating new cart for user: {userId}");
                cart = new CartMongo  // ✅ CORRECTED CLASS NAME
                {
                    UserId = userId,
                    Items = new List<CartItemMongo>(),  // ✅ CORRECTED CLASS NAME
                    CreatedAt = DateTime.UtcNow
                };
            }

            cart.Items ??= new List<CartItemMongo>();  // ✅ CORRECTED CLASS NAME

            var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == productId);
            
            if (existingItem != null)
            {
                Console.WriteLine($"📝 Item already in cart, updating quantity from {existingItem.Quantity} to {existingItem.Quantity + quantity}");
                
                // Update quantity
                existingItem.Quantity += quantity;
                
                // Verify total quantity doesn't exceed stock
                if (existingItem.Quantity > product.StockQuantity)
                {
                    Console.WriteLine($"❌ Total quantity exceeds available stock: {product.StockQuantity}");
                    throw new InvalidOperationException($"Total quantity exceeds available stock: {product.StockQuantity}");
                }
            }
            else
            {
                Console.WriteLine($"🆕 Adding new item to cart");
                
                // Add new item
                cart.Items.Add(new CartItemMongo  // ✅ CORRECTED CLASS NAME
                {
                    ProductId = productId,
                    ProductIdString = productId,
                    ProductName = product.Name,
                    Price = product.Price,
                    Quantity = quantity,
                    ImageUrl = product.ImageUrl,
                    Brand = product.Brand
                });
            }

            cart.UpdatedAt = DateTime.UtcNow;

            if (string.IsNullOrEmpty(cart.Id))
            {
                Console.WriteLine("💾 Saving new cart");
                await _cartRepository.AddAsync(cart);
            }
            else
            {
                Console.WriteLine($"💾 Updating existing cart: {cart.Id}");
                await _cartRepository.UpdateAsync(cart.Id, cart);
            }

            Console.WriteLine($"✅ Cart updated successfully");
            
            return MapToDto(cart);
        }

        public async Task<CartDto> UpdateItemQuantityAsync(string userId, string productId, int quantity)
        {
            Console.WriteLine($"✏️ [MongoCartService] UpdateItemQuantityAsync");
            Console.WriteLine($"   User ID: {userId}");
            Console.WriteLine($"   Product ID: {productId}");
            Console.WriteLine($"   New Quantity: {quantity}");
            
            if (quantity <= 0)
            {
                Console.WriteLine("❌ Quantity must be greater than 0");
                throw new ArgumentException("Quantity must be greater than 0");
            }

            // Validate MongoDB ObjectId formats
            if (!ObjectId.TryParse(userId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB User ID format: {userId}");
                throw new ArgumentException($"Invalid MongoDB User ID format: {userId}");
            }
            
            if (!ObjectId.TryParse(productId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB Product ID format: {productId}");
                throw new ArgumentException($"Invalid MongoDB Product ID format: {productId}");
            }

            var cart = await _cartRepository.GetByUserIdAsync(userId);
            
            if (cart == null)
            {
                Console.WriteLine($"❌ Cart not found for user: {userId}");
                throw new KeyNotFoundException("Cart not found");
            }

            var item = cart.Items?.FirstOrDefault(i => i.ProductId == productId);
            
            if (item == null)
            {
                Console.WriteLine($"❌ Item not found in cart: {productId}");
                throw new KeyNotFoundException($"Item not found in cart: {productId}");
            }

            // Verify stock availability
            var product = await _productRepository.GetByIdAsync(productId);
            
            if (product == null)
            {
                Console.WriteLine($"❌ Product not found: {productId}");
                throw new KeyNotFoundException($"Product not found: {productId}");
            }

            Console.WriteLine($"📦 Product stock check: Available={product.StockQuantity}, Requested={quantity}");

            if (product.StockQuantity < quantity)
            {
                Console.WriteLine($"❌ Insufficient stock. Available: {product.StockQuantity}");
                throw new InvalidOperationException($"Insufficient stock. Available: {product.StockQuantity}");
            }

            item.Quantity = quantity;
            cart.UpdatedAt = DateTime.UtcNow;

            Console.WriteLine($"💾 Updating cart: {cart.Id}");
            await _cartRepository.UpdateAsync(cart.Id, cart);

            Console.WriteLine($"✅ Item quantity updated successfully");
            
            return MapToDto(cart);
        }

        public async Task<CartDto> RemoveItemAsync(string userId, string productId)
        {
            Console.WriteLine($"🗑️ [MongoCartService] RemoveItemAsync");
            Console.WriteLine($"   User ID: {userId}");
            Console.WriteLine($"   Product ID: {productId}");
            
            // Validate MongoDB ObjectId formats
            if (!ObjectId.TryParse(userId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB User ID format: {userId}");
                throw new ArgumentException($"Invalid MongoDB User ID format: {userId}");
            }
            
            if (!ObjectId.TryParse(productId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB Product ID format: {productId}");
                throw new ArgumentException($"Invalid MongoDB Product ID format: {productId}");
            }

            var cart = await _cartRepository.GetByUserIdAsync(userId);
            
            if (cart == null)
            {
                Console.WriteLine($"❌ Cart not found for user: {userId}");
                throw new KeyNotFoundException("Cart not found");
            }

            var item = cart.Items?.FirstOrDefault(i => i.ProductId == productId);
            
            if (item == null)
            {
                Console.WriteLine($"❌ Item not found in cart: {productId}");
                throw new KeyNotFoundException($"Item not found in cart: {productId}");
            }

            Console.WriteLine($"🗑️ Removing item: {item.ProductName}");
            
            cart.Items.Remove(item);
            cart.UpdatedAt = DateTime.UtcNow;

            Console.WriteLine($"💾 Updating cart: {cart.Id}");
            await _cartRepository.UpdateAsync(cart.Id, cart);

            Console.WriteLine($"✅ Item removed successfully");
            
            return MapToDto(cart);
        }

        public async Task ClearCartAsync(string userId)
        {
            Console.WriteLine($"🧹 [MongoCartService] ClearCartAsync for user: {userId}");
            
            // Validate MongoDB ObjectId format
            if (!ObjectId.TryParse(userId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB User ID format: {userId}");
                throw new ArgumentException($"Invalid MongoDB User ID format: {userId}");
            }

            var cart = await _cartRepository.GetByUserIdAsync(userId);
            
            if (cart == null)
            {
                Console.WriteLine($"⚠️ Cart not found for user: {userId}, nothing to clear");
                return;
            }

            Console.WriteLine($"🗑️ Clearing {cart.Items?.Count ?? 0} items from cart");
            
            cart.Items?.Clear();
            cart.UpdatedAt = DateTime.UtcNow;

            Console.WriteLine($"💾 Updating cart: {cart.Id}");
            await _cartRepository.UpdateAsync(cart.Id, cart);
            
            Console.WriteLine($"✅ Cart cleared successfully");
        }

        /// <summary>
        /// Map MongoDB Cart entity to DTO
        /// </summary>
        private CartDto MapToDto(CartMongo cart)  // ✅ CORRECTED CLASS NAME
        {
            var items = cart.Items?.Select(i => new CartItemDto
            {
                ProductId = 0, // No SQL ID
                ProductIdString = i.ProductId,
                ProductName = i.ProductName,
                Price = i.Price,
                Quantity = i.Quantity,
                ImageUrl = i.ImageUrl,
                Brand = i.Brand,
                Subtotal = i.Price * i.Quantity
            }).ToList() ?? new List<CartItemDto>();

            return new CartDto
            {
                CartId = null, // No SQL cart ID
                MongoCartId = cart.Id,
                Items = items,
                TotalAmount = items.Sum(i => i.Subtotal),
                TotalItems = items.Sum(i => i.Quantity)
            };
        }
    }
}
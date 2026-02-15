using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Domain.Enums;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using Microsoft.Extensions.Logging;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Pure MongoDB Order Service - FIXED with proper UpdateOrderStatusAsync
    /// </summary>
    public class MongoOrderService : IMongoOrderService
    {
        private readonly IMongoOrderRepository _mongoOrderRepository;
        private readonly ICartMongoRepository _mongoCartRepository;
        private readonly IProductMongoRepository _mongoProductRepository;
        private readonly IMongoUserRepository _mongoUserRepository;
        private readonly IAddressMongoRepository _mongoAddressRepository;
        private readonly ILogger<MongoOrderService> _logger;

        public MongoOrderService(
            IMongoOrderRepository mongoOrderRepository,
            ICartMongoRepository mongoCartRepository,
            IProductMongoRepository mongoProductRepository,
            IMongoUserRepository mongoUserRepository,
            IAddressMongoRepository mongoAddressRepository,
            ILogger<MongoOrderService> logger)
        {
            _mongoOrderRepository = mongoOrderRepository;
            _mongoCartRepository = mongoCartRepository;
            _mongoProductRepository = mongoProductRepository;
            _mongoUserRepository = mongoUserRepository;
            _mongoAddressRepository = mongoAddressRepository;
            _logger = logger;
        }

        public async Task<OrderDto> CreateOrderAsync(string mongoUserId, CreateOrderDto createDto)
        {
            Console.WriteLine($"🔍 [MongoOrderService] Starting PURE MONGODB order creation");
            Console.WriteLine($"   MongoDB User ID: {mongoUserId}");

            try
            {
                // 1️⃣ Validate input
                if (createDto == null)
                {
                    Console.WriteLine("❌ CreateOrderDto is null");
                    throw new ArgumentNullException(nameof(createDto), "Order creation data is required");
                }

                // 2️⃣ Validate MongoDB User ID format
                if (!ObjectId.TryParse(mongoUserId, out var userObjectId))
                {
                    Console.WriteLine($"❌ Invalid MongoDB User ID format: {mongoUserId}");
                    throw new ArgumentException($"Invalid MongoDB User ID format: {mongoUserId}");
                }

                Console.WriteLine($"📋 ShippingAddressId: {createDto.ShippingAddressId}");

                // 3️⃣ Get MongoDB user
                Console.WriteLine($"🔍 Looking up MongoDB user: {mongoUserId}");
                var user = await _mongoUserRepository.GetByIdAsync(mongoUserId);
                if (user == null)
                {
                    Console.WriteLine($"❌ MongoDB User not found: {mongoUserId}");
                    throw new KeyNotFoundException($"User not found with ID: {mongoUserId}");
                }
                Console.WriteLine($"✅ User found: {user.FullName}");

                // 4️⃣ Get MongoDB cart
                Console.WriteLine($"🛒 Fetching MongoDB cart for user: {mongoUserId}");
                var cart = await _mongoCartRepository.GetByUserIdAsync(userObjectId.ToString());
                if (cart == null || cart.Items == null || !cart.Items.Any())
                {
                    Console.WriteLine($"❌ Cart is empty for user: {mongoUserId}");
                    throw new InvalidOperationException("Cart is empty");
                }
                Console.WriteLine($"✅ Cart found with {cart.Items.Count} items");

                // 5️⃣ Validate stock and prepare order items
                var orderItems = new List<MongoOrderItem>();
                decimal totalAmount = 0;

                Console.WriteLine($"📦 Validating stock for {cart.Items.Count} items...");
                foreach (var cartItem in cart.Items)
                {
                    Console.WriteLine($"   Checking product: {cartItem.ProductId}");
                    
                    var product = await _mongoProductRepository.GetByIdAsync(cartItem.ProductId);
                    if (product == null)
                    {
                        Console.WriteLine($"❌ Product not found: {cartItem.ProductId}");
                        throw new InvalidOperationException($"Product not found: {cartItem.ProductId}");
                    }

                    if (product.StockQuantity < cartItem.Quantity)
                    {
                        Console.WriteLine($"❌ Insufficient stock for {product.Name}");
                        Console.WriteLine($"   Available: {product.StockQuantity}, Requested: {cartItem.Quantity}");
                        throw new InvalidOperationException(
                            $"Insufficient stock for {product.Name}. Available: {product.StockQuantity}, Requested: {cartItem.Quantity}");
                    }

                    var itemTotal = product.Price * cartItem.Quantity;
                    totalAmount += itemTotal;

                    orderItems.Add(new MongoOrderItem
                    {
                        ProductId = product.Id,
                        ProductName = product.Name,
                        Quantity = cartItem.Quantity,
                        Price = product.Price,
                        ImageUrl = product.ImageUrl,
                        SqlProductId = null
                    });

                    Console.WriteLine($"  ✓ {product.Name}: {cartItem.Quantity} × ₹{product.Price} = ₹{itemTotal}");
                }
                Console.WriteLine($"✅ Total Amount: ₹{totalAmount}");

                // 6️⃣ Validate shipping address
                if (string.IsNullOrWhiteSpace(createDto.ShippingAddressId))
                {
                    Console.WriteLine("❌ Shipping address ID is missing");
                    throw new InvalidOperationException("Shipping address ID is required");
                }

                if (!ObjectId.TryParse(createDto.ShippingAddressId, out var addressObjectId))
                {
                    Console.WriteLine($"❌ Invalid address ObjectId format: {createDto.ShippingAddressId}");
                    throw new InvalidOperationException(
                        $"Invalid shipping address ID format: {createDto.ShippingAddressId}");
                }

                Console.WriteLine($"📍 Looking up MongoDB address: {createDto.ShippingAddressId}");
                var address = await _mongoAddressRepository.GetByIdAsync(createDto.ShippingAddressId);
                if (address == null)
                {
                    Console.WriteLine($"❌ Address not found: {createDto.ShippingAddressId}");
                    throw new InvalidOperationException($"Shipping address not found: {createDto.ShippingAddressId}");
                }

                if (address.UserId != user.Id)
                {
                    Console.WriteLine($"❌ Address does not belong to user!");
                    throw new UnauthorizedAccessException("Shipping address does not belong to the user");
                }

                Console.WriteLine($"✅ Address ownership verified");

                // 7️⃣ Create MongoDB order
                var orderNumber = GenerateOrderNumber();
                Console.WriteLine($"📝 Creating order: {orderNumber}");

                var mongoOrder = new MongoOrder
                {
                    UserId = user.Id,
                    OrderNumber = orderNumber,
                    TotalAmount = totalAmount,
                    Status = OrderStatus.Pending.ToString(),
                    ShippingAddressId = createDto.ShippingAddressId,
                    CreatedAt = DateTime.UtcNow,
                    Items = orderItems,
                    SqlId = null
                };

                await _mongoOrderRepository.AddAsync(mongoOrder);
                Console.WriteLine($"✅ Order created in MongoDB with ID: {mongoOrder.Id}");

                // 8️⃣ Deduct stock
                Console.WriteLine($"📉 Deducting stock from MongoDB products...");
                foreach (var cartItem in cart.Items)
                {
                    var product = await _mongoProductRepository.GetByIdAsync(cartItem.ProductId);
                    var oldStock = product.StockQuantity;
                    product.StockQuantity -= cartItem.Quantity;
                    await _mongoProductRepository.UpdateAsync(product.Id.ToString(), product);
                    Console.WriteLine($"  ✓ {product.Name}: {oldStock} → {product.StockQuantity}");
                }

                // 9️⃣ Clear cart
                Console.WriteLine($"🧹 Clearing MongoDB cart...");
                if (cart.Items != null)
                {
                    cart.Items.Clear();
                    await _mongoCartRepository.UpdateAsync(cart.Id, cart);
                    Console.WriteLine($"✅ Cart cleared");
                }

                // 🔟 Return DTO
                var orderDto = MapMongoToDto(mongoOrder);
                Console.WriteLine($"✅ Order creation completed successfully!");
                return orderDto;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR during order creation: {ex.Message}");
                throw;
            }
        }

        public async Task<OrderDto> CreateOrderAsync(int sqlUserId, CreateOrderDto createDto)
        {
            throw new NotSupportedException(
                "SQL-based order creation is not supported in pure MongoDB mode.");
        }

        public async Task<IEnumerable<OrderDto>> GetUserOrdersAsync(string mongoUserId)
        {
            Console.WriteLine($"📜 Getting orders for MongoDB user: {mongoUserId}");
            
            if (!ObjectId.TryParse(mongoUserId, out _))
            {
                Console.WriteLine($"❌ Invalid MongoDB User ID: {mongoUserId}");
                return new List<OrderDto>();
            }

            var orders = await _mongoOrderRepository.GetByUserIdAsync(mongoUserId);
            Console.WriteLine($"✅ Found {orders.Count()} orders");
            
            return orders.Select(MapMongoToDto);
        }

        public async Task<IEnumerable<OrderDto>> GetUserOrdersAsync(int sqlUserId)
        {
            throw new NotSupportedException(
                "SQL-based order retrieval is not supported in pure MongoDB mode.");
        }

        public async Task<OrderDto> GetOrderByMongoIdAsync(string mongoId, string mongoUserId)
        {
            if (!ObjectId.TryParse(mongoId, out _))
                throw new FormatException($"Invalid MongoDB Order ID format: {mongoId}");

            if (!ObjectId.TryParse(mongoUserId, out _))
                throw new FormatException($"Invalid MongoDB User ID format: {mongoUserId}");

            var order = await _mongoOrderRepository.GetByIdAsync(mongoId);
            if (order == null)
                throw new KeyNotFoundException($"Order not found with ID: {mongoId}");

            if (order.UserId != mongoUserId)
                throw new UnauthorizedAccessException("Access denied to this order");

            return MapMongoToDto(order);
        }

        public async Task<OrderDto> GetOrderByMongoIdAsync(string mongoId, int sqlUserId)
        {
            throw new NotSupportedException(
                "SQL-based order retrieval is not supported in pure MongoDB mode.");
        }

        public async Task<OrderDto> GetOrderByOrderNumberAsync(string orderNumber, string mongoUserId)
        {
            if (string.IsNullOrWhiteSpace(orderNumber))
                throw new ArgumentException("Order number is required");

            if (!ObjectId.TryParse(mongoUserId, out _))
                throw new FormatException($"Invalid MongoDB User ID format: {mongoUserId}");

            var order = await _mongoOrderRepository.GetByOrderNumberAsync(orderNumber);
            if (order == null)
                throw new KeyNotFoundException($"Order not found with order number: {orderNumber}");

            if (order.UserId != mongoUserId)
                throw new UnauthorizedAccessException("Access denied to this order");

            return MapMongoToDto(order);
        }

        public async Task<OrderDto> GetOrderByOrderNumberAsync(string orderNumber, int sqlUserId)
        {
            throw new NotSupportedException(
                "SQL-based order retrieval is not supported in pure MongoDB mode.");
        }

        public async Task CancelOrderAsync(string mongoId, string mongoUserId)
        {
            Console.WriteLine($"═══════════════════════════════════════════════════════");
            Console.WriteLine($"❌ [MongoOrderService] CANCEL ORDER REQUEST");
            Console.WriteLine($"   Order ID: {mongoId}");
            Console.WriteLine($"   User ID: {mongoUserId}");
            Console.WriteLine($"═══════════════════════════════════════════════════════");

            try
            {
                if (!ObjectId.TryParse(mongoId, out _))
                {
                    Console.WriteLine($"❌ Invalid order ID format: {mongoId}");
                    throw new FormatException($"Invalid MongoDB Order ID format: {mongoId}");
                }

                if (!ObjectId.TryParse(mongoUserId, out _))
                {
                    Console.WriteLine($"❌ Invalid user ID format: {mongoUserId}");
                    throw new FormatException($"Invalid MongoDB User ID format: {mongoUserId}");
                }

                var order = await _mongoOrderRepository.GetByIdAsync(mongoId);
                if (order == null)
                {
                    Console.WriteLine($"❌ Order not found: {mongoId}");
                    throw new KeyNotFoundException($"Order not found with ID: {mongoId}");
                }

                if (order.UserId != mongoUserId)
                {
                    Console.WriteLine($"❌ Unauthorized access");
                    throw new UnauthorizedAccessException("Access denied to this order");
                }

                if (order.Status != OrderStatus.Pending.ToString() &&
                    order.Status != OrderStatus.Confirmed.ToString())
                {
                    Console.WriteLine($"❌ Cannot cancel order in {order.Status} status");
                    throw new InvalidOperationException(
                        $"Cannot cancel order in {order.Status} status.");
                }

                order.Status = OrderStatus.Cancelled.ToString();
                order.UpdatedAt = DateTime.UtcNow;
                
                await _mongoOrderRepository.UpdateAsync(order);
                Console.WriteLine($"✅ Order status updated to Cancelled");

                // Restore stock
                if (order.Items != null && order.Items.Any())
                {
                    foreach (var item in order.Items)
                    {
                        if (string.IsNullOrEmpty(item.ProductId)) continue;

                        try
                        {
                            var product = await _mongoProductRepository.GetByIdAsync(item.ProductId);
                            if (product != null)
                            {
                                product.StockQuantity += item.Quantity;
                                await _mongoProductRepository.UpdateAsync(product.Id.ToString(), product);
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"⚠️ Error restoring stock for {item.ProductId}: {ex.Message}");
                        }
                    }
                }

                Console.WriteLine($"✅ ORDER CANCELLATION COMPLETED");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR during order cancellation: {ex.Message}");
                throw;
            }
        }

        public async Task CancelOrderAsync(string mongoId, int sqlUserId)
        {
            throw new NotSupportedException(
                "SQL-based order cancellation is not supported in pure MongoDB mode.");
        }

        public async Task<IEnumerable<OrderDto>> GetAllOrdersAsync()
        {
            var orders = await _mongoOrderRepository.GetAllAsync();
            return orders.Select(MapMongoToDto);
        }

        public async Task<bool> OrderExistsAsync(string mongoId)
        {
            if (!ObjectId.TryParse(mongoId, out _))
                return false;

            return await _mongoOrderRepository.ExistsAsync(mongoId);
        }

        /// <summary>
        /// Update order status - ADMIN ONLY - FIXED VERSION
        /// </summary>
        public async Task<bool> UpdateOrderStatusAsync(string orderId, string newStatus)
        {
            try
            {
                _logger.LogInformation($"✏️ [MongoOrderService] Updating order {orderId} status to {newStatus}");

                if (string.IsNullOrEmpty(orderId))
                {
                    _logger.LogWarning("⚠️ Order ID is required");
                    return false;
                }

                var validStatuses = new[] { "Pending", "Processing", "Shipped", "Delivered", "Cancelled" };
                if (!validStatuses.Contains(newStatus))
                {
                    _logger.LogWarning($"⚠️ Invalid status: {newStatus}");
                    return false;
                }

                var order = await _mongoOrderRepository.GetByIdAsync(orderId);
                if (order == null)
                {
                    _logger.LogWarning($"⚠️ Order not found: {orderId}");
                    return false;
                }

                if (order.Status == "Delivered" || order.Status == "Cancelled")
                {
                    _logger.LogWarning($"⚠️ Cannot change order status from {order.Status}");
                    return false;
                }

                order.Status = newStatus;
                order.UpdatedAt = DateTime.UtcNow;

                await _mongoOrderRepository.UpdateAsync(order);

                _logger.LogInformation($"✅ Order {orderId} status updated to {newStatus}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error updating order status: {orderId}");
                return false;
            }
        }

        #region Helper Methods

        private OrderDto MapMongoToDto(MongoOrder order)
        {
            return new OrderDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                TotalAmount = order.TotalAmount,
                Status = order.Status,
                CreatedAt = order.CreatedAt,
                Items = order.Items?.Select(item => new OrderItemDto
                {
                    ProductId = item.ProductId,
                    ProductName = item.ProductName,
                    Quantity = item.Quantity,
                    Price = item.Price
                }).ToList() ?? new List<OrderItemDto>()
            };
        }

        private string GenerateOrderNumber()
        {
            return $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
        }

        #endregion
    }
}
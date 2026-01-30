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

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Pure MongoDB Order Service - NO SQL DEPENDENCIES
    /// </summary>
    public class MongoOrderService : IMongoOrderService
    {
        private readonly IMongoOrderRepository _mongoOrderRepository;
        private readonly ICartMongoRepository _mongoCartRepository;
        private readonly IProductMongoRepository _mongoProductRepository;
        private readonly IMongoUserRepository _mongoUserRepository;
        private readonly IAddressMongoRepository _mongoAddressRepository;

        public MongoOrderService(
            IMongoOrderRepository mongoOrderRepository,
            ICartMongoRepository mongoCartRepository,
            IProductMongoRepository mongoProductRepository,
            IMongoUserRepository mongoUserRepository,
            IAddressMongoRepository mongoAddressRepository)
        {
            _mongoOrderRepository = mongoOrderRepository;
            _mongoCartRepository = mongoCartRepository;
            _mongoProductRepository = mongoProductRepository;
            _mongoUserRepository = mongoUserRepository;
            _mongoAddressRepository = mongoAddressRepository;
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
                        ProductId = product.Id, // MongoDB ObjectId as string
                        ProductName = product.Name,
                        Quantity = cartItem.Quantity,
                        Price = product.Price,
                        ImageUrl = product.ImageUrl,
                        SqlProductId = null // No SQL in pure MongoDB mode
                    });

                    Console.WriteLine($"  ✓ {product.Name}: {cartItem.Quantity} × ₹{product.Price} = ₹{itemTotal}");
                }
                Console.WriteLine($"✅ Total Amount: ₹{totalAmount}");

                // 6️⃣ Validate shipping address (MongoDB ObjectId)
                if (string.IsNullOrWhiteSpace(createDto.ShippingAddressId))
                {
                    Console.WriteLine("❌ Shipping address ID is missing");
                    throw new InvalidOperationException("Shipping address ID is required");
                }

                if (!ObjectId.TryParse(createDto.ShippingAddressId, out var addressObjectId))
                {
                    Console.WriteLine($"❌ Invalid address ObjectId format: {createDto.ShippingAddressId}");
                    throw new InvalidOperationException(
                        $"Invalid shipping address ID format: {createDto.ShippingAddressId}. Must be a valid MongoDB ObjectId (24 hex characters)");
                }

                Console.WriteLine($"📍 Looking up MongoDB address: {createDto.ShippingAddressId}");
                var address = await _mongoAddressRepository.GetByIdAsync(createDto.ShippingAddressId);
                if (address == null)
                {
                    Console.WriteLine($"❌ Address not found: {createDto.ShippingAddressId}");
                    throw new InvalidOperationException($"Shipping address not found: {createDto.ShippingAddressId}");
                }

                Console.WriteLine($"✅ Address found");
                Console.WriteLine($"   Address.UserId: {address.UserId}");
                Console.WriteLine($"   Current User.Id: {user.Id}");

                // Verify address belongs to user (both MongoDB ObjectIds)
                if (address.UserId != user.Id)
                {
                    Console.WriteLine($"❌ Address does not belong to user!");
                    Console.WriteLine($"   Address.UserId: '{address.UserId}'");
                    Console.WriteLine($"   User.Id: '{user.Id}'");
                    throw new UnauthorizedAccessException("Shipping address does not belong to the user");
                }

                Console.WriteLine($"✅ Address ownership verified");

                // 7️⃣ Create MongoDB order
                var orderNumber = GenerateOrderNumber();
                Console.WriteLine($"📝 Creating order: {orderNumber}");

                var mongoOrder = new MongoOrder
                {
                    UserId = user.Id, // MongoDB ObjectId
                    OrderNumber = orderNumber,
                    TotalAmount = totalAmount,
                    Status = OrderStatus.Pending.ToString(),
                    ShippingAddressId = createDto.ShippingAddressId,
                    CreatedAt = DateTime.UtcNow,
                    Items = orderItems,
                    SqlId = null // No SQL ID
                };

                await _mongoOrderRepository.AddAsync(mongoOrder);
                Console.WriteLine($"✅ Order created in MongoDB with ID: {mongoOrder.Id}");

                // 8️⃣ Deduct stock (MongoDB products)
                Console.WriteLine($"📉 Deducting stock from MongoDB products...");
                foreach (var cartItem in cart.Items)
                {
                    var product = await _mongoProductRepository.GetByIdAsync(cartItem.ProductId);
                    var oldStock = product.StockQuantity;
                    product.StockQuantity -= cartItem.Quantity;
                    await _mongoProductRepository.UpdateAsync(product.Id.ToString(), product);
                    Console.WriteLine($"  ✓ {product.Name}: {oldStock} → {product.StockQuantity}");
                }

                // 9️⃣ Clear cart (MongoDB cart)
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
                Console.WriteLine($"   Order ID: {orderDto.Id}");
                Console.WriteLine($"   Order Number: {orderDto.OrderNumber}");
                Console.WriteLine($"   Total: ₹{orderDto.TotalAmount}");

                return orderDto;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR during order creation:");
                Console.WriteLine($"   Type: {ex.GetType().Name}");
                Console.WriteLine($"   Message: {ex.Message}");
                Console.WriteLine($"   StackTrace: {ex.StackTrace}");
                throw;
            }
        }

        // ✅ OVERLOAD: Keep old signature for interface compatibility
        public async Task<OrderDto> CreateOrderAsync(int sqlUserId, CreateOrderDto createDto)
        {
            throw new NotSupportedException(
                "SQL-based order creation is not supported in pure MongoDB mode. Use CreateOrderAsync(string mongoUserId, CreateOrderDto createDto) instead.");
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

        // ✅ OVERLOAD: Keep old signature for interface compatibility
        public async Task<IEnumerable<OrderDto>> GetUserOrdersAsync(int sqlUserId)
        {
            throw new NotSupportedException(
                "SQL-based order retrieval is not supported in pure MongoDB mode. Use GetUserOrdersAsync(string mongoUserId) instead.");
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

        // ✅ OVERLOAD: Keep old signature for interface compatibility
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

        // ✅ OVERLOAD: Keep old signature for interface compatibility
        public async Task<OrderDto> GetOrderByOrderNumberAsync(string orderNumber, int sqlUserId)
        {
            throw new NotSupportedException(
                "SQL-based order retrieval is not supported in pure MongoDB mode.");
        }

        public async Task CancelOrderAsync(string mongoId, string mongoUserId)
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

            if (order.Status != OrderStatus.Pending.ToString() &&
                order.Status != OrderStatus.Confirmed.ToString())
                throw new InvalidOperationException(
                    $"Cannot cancel order in {order.Status} status. Only Pending or Confirmed orders can be cancelled.");

            order.Status = OrderStatus.Cancelled.ToString();
            order.UpdatedAt = DateTime.UtcNow;
            await _mongoOrderRepository.UpdateAsync(order);

            // Restore stock (MongoDB products)
            foreach (var item in order.Items)
            {
                if (!string.IsNullOrEmpty(item.ProductId))
                {
                    var product = await _mongoProductRepository.GetByIdAsync(item.ProductId);
                    if (product != null)
                    {
                        product.StockQuantity += item.Quantity;
                        await _mongoProductRepository.UpdateAsync(product.Id.ToString(), product);
                    }
                }
            }
        }

        // ✅ OVERLOAD: Keep old signature for interface compatibility
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
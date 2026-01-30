using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Domain.Enums;
using MongoDB.Bson;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// MongoDB-only Order Service
    /// Implements IOrderService interface with MongoDB
    /// </summary>
    public class HybridOrderService : IOrderService
    {
        private readonly IMongoOrderRepository _mongoOrderRepository;
        private readonly ICartRepository _cartRepository;
        private readonly IProductRepository _productRepository;
        private readonly IUserRepository _userRepository;
        private readonly IAddressMongoRepository _mongoAddressRepository;

        public HybridOrderService(
            IMongoOrderRepository mongoOrderRepository,
            ICartRepository cartRepository,
            IProductRepository productRepository,
            IUserRepository userRepository,
            IAddressMongoRepository mongoAddressRepository)
        {
            _mongoOrderRepository = mongoOrderRepository;
            _cartRepository = cartRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
            _mongoAddressRepository = mongoAddressRepository;
        }

        #region Interface Implementations (required for IOrderService)

        // Keep interface signatures, throw NotImplementedException
        public Task<OrderDto> GetOrderByIdAsync(int orderId, int userId)
        {
            throw new NotImplementedException("Use GetOrderByMongoIdAsync with MongoDB ID (string).");
        }

        public Task CancelOrderAsync(int orderId, int userId)
        {
            throw new NotImplementedException("Use CancelOrderMongoAsync with MongoDB ID (string).");
        }

        public async Task<OrderDto> CreateOrderAsync(int userId, CreateOrderDto createDto)
        {
            return await CreateOrderMongoAsync(userId, createDto);
        }

        public async Task<IEnumerable<OrderDto>> GetUserOrdersAsync(int userId)
        {
            return await GetUserOrdersMongoAsync(userId);
        }

        #endregion

        #region MongoDB Implementation
        private async Task<OrderDto> CreateOrderMongoAsync(int sqlUserId, CreateOrderDto createDto)
        {
            // 1️⃣ Get user
            var user = await _userRepository.GetByIdAsync(sqlUserId);
            if (user == null)
                throw new InvalidOperationException("User not found");

            // 2️⃣ Get cart
            var cart = await _cartRepository.GetByUserIdAsync(sqlUserId);
            if (cart == null || !cart.CartItems.Any())
                throw new InvalidOperationException("Cart is empty");

            // 3️⃣ Validate stock and prepare order items
            var orderItems = new List<MongoOrderItem>();
            decimal totalAmount = 0;

            foreach (var cartItem in cart.CartItems)
            {
                var product = await _productRepository.GetByIdAsync(cartItem.ProductId);
                if (product == null)
                    throw new InvalidOperationException($"Product not found");

                if (product.StockQuantity < cartItem.Quantity)
                    throw new InvalidOperationException($"Insufficient stock for {product.Name}");

                var itemTotal = product.Price * cartItem.Quantity;
                totalAmount += itemTotal;

                orderItems.Add(new MongoOrderItem
                {
                    ProductId = product.Id.ToString(),
                    ProductName = product.Name,
                    Quantity = cartItem.Quantity,
                    Price = product.Price,
                    ImageUrl = product.ImageUrl,
                    SqlProductId = product.Id
                });
            }

            // 4️⃣ Handle shipping address (MongoDB only)
            if (!ObjectId.TryParse(createDto.ShippingAddressId, out var objId))
                throw new InvalidOperationException($"Invalid Shipping Address ID format: {createDto.ShippingAddressId}");

            var mongoAddressId = createDto.ShippingAddressId;

            // Validate ownership
            var address = await _mongoAddressRepository.GetByIdAsync(mongoAddressId);
            if (address == null)
                throw new InvalidOperationException("Shipping address not found in MongoDB");

            if (address.UserId != user.Id.ToString())
                throw new InvalidOperationException("Shipping address does not belong to the user");

            // 5️⃣ Create MongoDB order
            var mongoOrder = new MongoOrder
            {
                UserId = user.Id.ToString(),
                OrderNumber = GenerateOrderNumber(),
                TotalAmount = totalAmount,
                Status = OrderStatus.Pending.ToString(),
                ShippingAddressId = mongoAddressId,
                CreatedAt = DateTime.UtcNow,
                Items = orderItems,
                SqlId = null
            };

            await _mongoOrderRepository.AddAsync(mongoOrder);

            // 6️⃣ Deduct stock
            foreach (var cartItem in cart.CartItems)
            {
                var product = await _productRepository.GetByIdAsync(cartItem.ProductId);
                product.StockQuantity -= cartItem.Quantity;
                await _productRepository.UpdateAsync(product);
            }

            // 7️⃣ Clear cart
            cart.CartItems.Clear();
            await _cartRepository.UpdateAsync(cart);

            // 8️⃣ Return DTO
            return MapMongoToDto(mongoOrder);
        }

        private async Task<IEnumerable<OrderDto>> GetUserOrdersMongoAsync(int sqlUserId)
        {
            var user = await _userRepository.GetByIdAsync(sqlUserId);
            if (user == null) return new List<OrderDto>();

            var orders = await _mongoOrderRepository.GetByUserIdAsync(user.Id.ToString());
            return orders.Select(MapMongoToDto);
        }

        public async Task<OrderDto> GetOrderByMongoIdAsync(string orderId, int sqlUserId)
        {
            var user = await _userRepository.GetByIdAsync(sqlUserId);
            if (user == null) throw new KeyNotFoundException("User not found");

            var order = await _mongoOrderRepository.GetByIdAsync(orderId);
            if (order == null) throw new KeyNotFoundException("Order not found");
            if (order.UserId != user.Id.ToString()) throw new UnauthorizedAccessException("Access denied");

            return MapMongoToDto(order);
        }

        public async Task CancelOrderMongoAsync(string orderId, int sqlUserId)
        {
            var user = await _userRepository.GetByIdAsync(sqlUserId);
            if (user == null) throw new KeyNotFoundException("User not found");

            var order = await _mongoOrderRepository.GetByIdAsync(orderId);
            if (order == null) throw new KeyNotFoundException("Order not found");
            if (order.UserId != user.Id.ToString()) throw new UnauthorizedAccessException("Access denied");

            if (order.Status != OrderStatus.Pending.ToString() &&
                order.Status != OrderStatus.Confirmed.ToString())
                throw new InvalidOperationException("Cannot cancel order in current status");

            order.Status = OrderStatus.Cancelled.ToString();
            await _mongoOrderRepository.UpdateAsync(order);

            // Restore stock
            foreach (var item in order.Items)
            {
                if (item.SqlProductId.HasValue)
                {
                    var product = await _productRepository.GetByIdAsync(item.SqlProductId.Value);
                    if (product != null)
                    {
                        product.StockQuantity += item.Quantity;
                        await _productRepository.UpdateAsync(product);
                    }
                }
            }
        }

        private OrderDto MapMongoToDto(MongoOrder order)
        {
            return new OrderDto
            {
                Id = (order.SqlId ?? 0).ToString(),
                OrderNumber = order.OrderNumber,
                TotalAmount = order.TotalAmount,
                Status = order.Status,
                CreatedAt = order.CreatedAt,
                Items = order.Items?.Select(item => new OrderItemDto
                {
                    ProductId = (item.SqlProductId ?? 0).ToString(),
                    ProductName = item.ProductName,
                    Quantity = item.Quantity,
                    Price = item.Price
                }).ToList()
            };
        }

        #endregion

        #region Helper
        private string GenerateOrderNumber()
        {
            return $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
        }
        #endregion
    }
}

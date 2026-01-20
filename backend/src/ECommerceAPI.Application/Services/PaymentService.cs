/*using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using ECommerceAPI.Application.DTOs.Payment;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Enums;
//using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Payment service implementation
    /// Handles payment initiation and verification with UPI gateway
    /// NEVER stores or processes UPI PIN
    /// </summary>
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly IOrderRepository _orderRepository;
        private readonly IConfiguration _configuration;

        public PaymentService(
            IPaymentRepository paymentRepository,
            IOrderRepository orderRepository,
            IConfiguration configuration)
        {
            _paymentRepository = paymentRepository;
            _orderRepository = orderRepository;
            _configuration = configuration;
        }

        public async Task<PaymentInitiationDto> InitiatePaymentAsync(int userId, int orderId)
        {
            // Get order
            var order = await _orderRepository.GetByIdAsync(orderId);
            
            if (order == null)
                throw new KeyNotFoundException("Order not found");

            if (order.UserId != userId)
                throw new UnauthorizedAccessException("Unauthorized access to order");

            // Create payment record
            var transactionId = Guid.NewGuid().ToString();
            
            var payment = new Payment
            {
                OrderId = orderId,
                TransactionId = transactionId,
                Amount = order.TotalAmount,
                Status = PaymentStatus.Pending,
                PaymentMethod = "UPI",
                CreatedAt = DateTime.UtcNow
            };

            await _paymentRepository.AddAsync(payment);

            // Generate UPI payment URL (mock)
            var merchantId = _configuration["Payment:UPI:MerchantId"];
            var callbackUrl = _configuration["Payment:UPI:CallbackUrl"];
            
            // In production, use actual UPI gateway SDK (Razorpay, Paytm, etc.)
            var paymentUrl = $"upi://pay?pa={merchantId}&pn=ShopAI&am={order.TotalAmount}&tn={orderId}&cu=INR";

            return new PaymentInitiationDto
            {
                PaymentUrl = paymentUrl,
                TransactionId = transactionId,
                Amount = order.TotalAmount
            };
        }

        public async Task<bool> VerifyPaymentAsync(PaymentVerificationDto verification)
        {
            // Get payment by transaction ID
            var payment = await _paymentRepository.GetByTransactionIdAsync(verification.TransactionId);
            
            if (payment == null)
                return false;

            // Verify payment signature (implement actual verification with gateway)
            // This is a simplified version - in production, verify with payment gateway
            
            if (verification.Status == "success")
            {
                payment.Status = PaymentStatus.Completed;
                payment.CompletedAt = DateTime.UtcNow;

                // Update order status
                var order = await _orderRepository.GetByIdAsync(payment.OrderId);
                order.Status = OrderStatus.Confirmed;
                
                await _paymentRepository.UpdateAsync(payment);
                await _orderRepository.UpdateAsync(order);

                return true;
            }
            else
            {
                payment.Status = PaymentStatus.Failed;
                await _paymentRepository.UpdateAsync(payment);
                return false;
            }
        }
    }
}
*/

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.DTOs.Payment;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Enums;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

// Note: IHttpClientFactory is in System.Net.Http namespace (available after adding Microsoft.Extensions.Http package)

namespace ECommerceAPI.Application.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly IOrderRepository _orderRepository;
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<PaymentService> _logger;
        private readonly string _razorpayKeyId;
        private readonly string _razorpayKeySecret;

        public PaymentService(
            IPaymentRepository paymentRepository,
            IOrderRepository orderRepository,
            IUserRepository userRepository,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory,
            ILogger<PaymentService> logger)
        {
            _paymentRepository = paymentRepository;
            _orderRepository = orderRepository;
            _userRepository = userRepository;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            
            _razorpayKeyId = _configuration["Razorpay:KeyId"];
            _razorpayKeySecret = _configuration["Razorpay:KeySecret"];
            
            if (string.IsNullOrEmpty(_razorpayKeyId) || string.IsNullOrEmpty(_razorpayKeySecret))
            {
                _logger.LogWarning("Razorpay credentials are not configured");
            }
        }

        public async Task<PaymentInitiationDto> InitiatePaymentAsync(int userId, int orderId)
        {
            try
            {
                // Get order with user details
                var order = await _orderRepository.GetByIdAsync(orderId);
                if (order == null)
                    throw new KeyNotFoundException("Order not found");

                if (order.UserId != userId)
                    throw new UnauthorizedAccessException("Unauthorized access to order");

                // Get user details
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                    throw new KeyNotFoundException("User not found");

                // Create Razorpay Order via API
                var amountInPaise = (int)(order.TotalAmount * 100); // Convert to paise
                
                var orderRequest = new
                {
                    amount = amountInPaise,
                    currency = _configuration["Payment:Currency"] ?? "INR",
                    receipt = $"order_{orderId}_{DateTime.UtcNow.Ticks}",
                    notes = new Dictionary<string, string>
                    {
                        { "order_id", orderId.ToString() },
                        { "user_id", userId.ToString() }
                    }
                };

                var httpClient = _httpClientFactory.CreateClient();
                httpClient.BaseAddress = new Uri("https://api.razorpay.com/v1/");
                
                // Set Basic Authentication
                var authBytes = Encoding.UTF8.GetBytes($"{_razorpayKeyId}:{_razorpayKeySecret}");
                var authHeader = Convert.ToBase64String(authBytes);
                httpClient.DefaultRequestHeaders.Authorization = 
                    new AuthenticationHeaderValue("Basic", authHeader);

                var jsonContent = JsonSerializer.Serialize(orderRequest);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                _logger.LogInformation($"Creating Razorpay order for Order ID: {orderId}, Amount: {amountInPaise} paise");

                var response = await httpClient.PostAsync("orders", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Razorpay order creation failed: {errorContent}");
                    throw new Exception($"Razorpay order creation failed: {errorContent}");
                }

                var responseJson = await response.Content.ReadAsStringAsync();
                var razorpayOrder = JsonSerializer.Deserialize<JsonElement>(responseJson);
                var razorpayOrderId = razorpayOrder.GetProperty("id").GetString();

                _logger.LogInformation($"Razorpay order created successfully: {razorpayOrderId}");

                // Create payment record in database
                var payment = new Payment
                {
                    OrderId = orderId,
                    TransactionId = razorpayOrderId,
                    Amount = order.TotalAmount,
                    Status = PaymentStatus.Pending,
                    PaymentMethod = "Razorpay",
                    CreatedAt = DateTime.UtcNow
                };

                await _paymentRepository.AddAsync(payment);

                // Return payment initiation details
                return new PaymentInitiationDto
                {
                    RazorpayOrderId = razorpayOrderId,
                    RazorpayKeyId = _razorpayKeyId,
                    Amount = order.TotalAmount,
                    Currency = _configuration["Payment:Currency"] ?? "INR",
                    OrderId = orderId.ToString(),
                    CustomerName = user.FullName,
                    CustomerEmail = user.Email,
                    CustomerContact = user.Mobile ?? ""
                };
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error initiating payment: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> VerifyPaymentAsync(PaymentVerificationDto verification)
        {
            try
            {
                _logger.LogInformation($"Verifying payment: OrderId={verification.RazorpayOrderId}, PaymentId={verification.RazorpayPaymentId}");

                // Verify signature
                var isValid = VerifyRazorpaySignature(
                    verification.RazorpayOrderId,
                    verification.RazorpayPaymentId,
                    verification.RazorpaySignature
                );

                if (!isValid)
                {
                    _logger.LogWarning($"Invalid payment signature for order: {verification.RazorpayOrderId}");
                    return false;
                }

                // Get payment by Razorpay order ID
                var payment = await _paymentRepository.GetByTransactionIdAsync(verification.RazorpayOrderId);
                if (payment == null)
                {
                    _logger.LogWarning($"Payment not found for Razorpay order: {verification.RazorpayOrderId}");
                    return false;
                }

                // Update payment status
                payment.Status = PaymentStatus.Completed;
                payment.CompletedAt = DateTime.UtcNow;
                payment.TransactionId = verification.RazorpayPaymentId; // Update with payment ID

                // Update order status
                var order = await _orderRepository.GetByIdAsync(payment.OrderId);
                if (order != null)
                {
                    order.Status = OrderStatus.Confirmed;
                    await _orderRepository.UpdateAsync(order);
                    _logger.LogInformation($"Order {order.Id} confirmed after successful payment");
                }

                await _paymentRepository.UpdateAsync(payment);

                _logger.LogInformation($"Payment verified successfully: {verification.RazorpayPaymentId}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Payment verification error: {ex.Message}");
                
                // Mark payment as failed
                try
                {
                    var payment = await _paymentRepository.GetByTransactionIdAsync(verification.RazorpayOrderId);
                    if (payment != null)
                    {
                        payment.Status = PaymentStatus.Failed;
                        await _paymentRepository.UpdateAsync(payment);
                    }
                }
                catch (Exception updateEx)
                {
                    _logger.LogError($"Error updating failed payment status: {updateEx.Message}");
                }

                return false;
            }
        }

        private bool VerifyRazorpaySignature(string orderId, string paymentId, string signature)
        {
            try
            {
                var payload = $"{orderId}|{paymentId}";

                using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_razorpayKeySecret)))
                {
                    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
                    var computedSignature = BitConverter.ToString(hash).Replace("-", "").ToLower();
                    
                    _logger.LogDebug($"Signature verification - Expected: {computedSignature}, Received: {signature}");
                    
                    return computedSignature == signature;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error verifying signature: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> HandleCODPaymentAsync(int orderId, int userId)
        {
            try
            {
                _logger.LogInformation($"Processing COD payment for Order: {orderId}, User: {userId}");

                var order = await _orderRepository.GetByIdAsync(orderId);
                if (order == null)
                {
                    _logger.LogWarning($"Order not found: {orderId}");
                    return false;
                }

                if (order.UserId != userId)
                {
                    _logger.LogWarning($"Unauthorized COD payment attempt for Order: {orderId} by User: {userId}");
                    return false;
                }

                // Create COD payment record
                var payment = new Payment
                {
                    OrderId = orderId,
                    TransactionId = $"COD_{orderId}_{DateTime.UtcNow.Ticks}",
                    Amount = order.TotalAmount,
                    Status = PaymentStatus.Pending,
                    PaymentMethod = "COD",
                    CreatedAt = DateTime.UtcNow
                };

                await _paymentRepository.AddAsync(payment);

                // Update order status
                order.Status = OrderStatus.Confirmed;
                await _orderRepository.UpdateAsync(order);

                _logger.LogInformation($"COD payment processed successfully for Order: {orderId}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error processing COD payment: {ex.Message}");
                return false;
            }
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// FILE: ECommerceAPI.API/Controllers/AIChatController.cs
//
// PURPOSE:
//   Single API surface for the Python AI agent. Aggregates products, cart,
//   orders, and addresses so the agent never has to call 4 different controllers.
//
// DESIGN RULES:
//   1. No business logic here — delegates 100% to existing services.
//   2. All responses use AiApiResponse<T> wrapper so Python can always check .success.
//   3. Every endpoint is JWT-protected (agent always passes the user's token).
//   4. Flat DTOs only — no deep nesting, no MongoDB internals exposed.
//
// ROUTES (all under /api/ai):
//   GET    /context                       → full user state in one call
//   GET    /products/search?q=&topK=      → semantic search
//   GET    /products/{id}                 → single product detail
//   POST   /products/compare              → side-by-side comparison with highlights
//   GET    /cart                          → current user's cart
//   POST   /cart/add                      → add item
//   PUT    /cart/update/{productId}?qty=  → change quantity
//   DELETE /cart/remove/{productId}       → remove item
//   DELETE /cart/clear                    → empty cart
//   GET    /orders                        → order history
//   GET    /orders/{orderId}              → single order
//   POST   /orders/place                  → create order from cart
//   POST   /orders/{orderId}/cancel       → cancel order
//   GET    /addresses                     → all addresses
//   GET    /addresses/default             → default address only
// ─────────────────────────────────────────────────────────────────────────────

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using ECommerceAPI.Application.DTOs.AI;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/ai")]
    [Authorize]                     // All endpoints require valid JWT
    public class AIChatController : ControllerBase
    {
        private readonly IProductMongoService      _productService;
        private readonly IMongoCartService         _cartService;
        private readonly IMongoOrderService        _orderService;
        private readonly IMongoAddressService      _addressService;
        private readonly ISemanticSearchService    _searchService;
        private readonly IMongoUserRepository      _userRepository;

        public AIChatController(
            IProductMongoService      productService,
            IMongoCartService         cartService,
            IMongoOrderService        orderService,
            IMongoAddressService      addressService,
            ISemanticSearchService    searchService,
            IMongoUserRepository      userRepository)
        {
            _productService  = productService;
            _cartService     = cartService;
            _orderService    = orderService;
            _addressService  = addressService;
            _searchService   = searchService;
            _userRepository  = userRepository;
        }

        // ══════════════════════════════════════════════════════════════════════
        // CONTEXT — one-shot session bootstrap for the Python agent
        // ══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// GET /api/ai/context
        /// Returns cart + addresses + recent orders + user info in a single call.
        /// Call this once when a chat session starts; cache the result in Python.
        /// </summary>
        [HttpGet("context")]
        public async Task<ActionResult<AiApiResponse<AiUserContextDto>>> GetContext()
        {
            try
            {
                var userId = GetUserId();
                var user   = await _userRepository.GetByIdAsync(userId);

                // Fetch all in parallel — no sequential blocking
                var cartTask     = _cartService.GetCartAsync(userId);
                var addrTask     = _addressService.GetByUserIdAsync(userId);
                var ordersTask   = _orderService.GetUserOrdersAsync(userId);

                await Task.WhenAll(cartTask, addrTask, ordersTask);

                var addresses = (await addrTask).ToList();
                var orders    = (await ordersTask)
                                    .OrderByDescending(o => o.CreatedAt)
                                    .Take(5)
                                    .ToList();

                var aiAddresses = addresses.Select(MapAddress).ToList();
                var defaultAddr = aiAddresses.FirstOrDefault(a => a.IsDefault)
                               ?? aiAddresses.FirstOrDefault();

                var context = new AiUserContextDto
                {
                    UserId         = userId,
                    UserName       = user?.FullName  ?? "Unknown",
                    UserEmail      = user?.Email     ?? "",
                    Cart           = MapCart(await cartTask, userId),
                    Addresses      = aiAddresses,
                    DefaultAddress = defaultAddr,
                    RecentOrders   = orders.Select(MapOrder).ToList()
                };

                return Ok(AiApiResponse<AiUserContextDto>.Ok(context));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(AiApiResponse<AiUserContextDto>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiUserContextDto>.Fail(ex.Message));
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // PRODUCTS
        // ══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// GET /api/ai/products/search?q=gaming+laptop&topK=5
        /// Semantic vector search powered by MongoDB Atlas.
        /// </summary>
        [HttpGet("products/search")]
        public async Task<ActionResult<AiApiResponse<List<AiProductDto>>>> SearchProducts(
            [FromQuery] string q,
            [FromQuery] int topK = 5)
        {
            if (string.IsNullOrWhiteSpace(q))
                return BadRequest(AiApiResponse<List<AiProductDto>>.Fail("Query 'q' is required"));

            try
            {
                var result = await _searchService.SearchAsync(q.Trim(), topK);
                var products = result.Results.Select(r => new AiProductDto
                {
                    Id            = r.Id,
                    Name          = r.Name,
                    Brand         = r.Brand,
                    Price         = (decimal)r.Price,
                    Category      = r.Category,
                    Description   = r.Description,
                    ImageUrl      = r.ImageUrl,
                    StockQuantity = r.StockQuantity,
                    IsAvailable   = r.StockQuantity > 0,
                    Rating        = r.Rating,
                    ReviewCount   = r.ReviewCount
                }).ToList();

                return Ok(AiApiResponse<List<AiProductDto>>.Ok(products,
                    $"Found {products.Count} results for '{q}'"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<List<AiProductDto>>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// GET /api/ai/products/{id}
        /// Fetch a single product's full details.
        /// </summary>
        [HttpGet("products/{id}")]
        public async Task<ActionResult<AiApiResponse<AiProductDto>>> GetProduct(string id)
        {
            try
            {
                var product = await _productService.GetByIdAsync(id);
                if (product == null)
                    return NotFound(AiApiResponse<AiProductDto>.Fail($"Product {id} not found"));

                return Ok(AiApiResponse<AiProductDto>.Ok(new AiProductDto
                {
                    Id            = product.Id,
                    Name          = product.Name,
                    Brand         = product.Brand,
                    Price         = product.Price,
                    Category      = product.Category?.Name ?? "Uncategorized",
                    Description   = product.Description,
                    ImageUrl      = product.ImageUrl,
                    StockQuantity = product.StockQuantity,
                    IsAvailable   = product.StockQuantity > 0,
                    Rating        = (double)(product.Rating ?? 0),
                    ReviewCount   = product.ReviewCount ?? 0
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiProductDto>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// POST /api/ai/products/compare
        /// Body: { "productIds": ["id1", "id2", "id3"] }
        /// Returns products side-by-side with pre-built comparison highlights.
        /// The agent can paste the highlights directly into its response.
        /// </summary>
        [HttpPost("products/compare")]
        public async Task<ActionResult<AiApiResponse<AiCompareResponseDto>>> CompareProducts(
            [FromBody] AiCompareRequest request)
        {
            if (request?.ProductIds == null || request.ProductIds.Count < 2)
                return BadRequest(AiApiResponse<AiCompareResponseDto>.Fail(
                    "Provide at least 2 product IDs to compare"));

            if (request.ProductIds.Count > 4)
                return BadRequest(AiApiResponse<AiCompareResponseDto>.Fail(
                    "Maximum 4 products can be compared at once"));

            try
            {
                // Fetch all in parallel
                var tasks   = request.ProductIds.Select(id => _productService.GetByIdAsync(id));
                var results = await Task.WhenAll(tasks);

                var products = results
                    .Where(p => p != null)
                    .Select(p => new AiProductDto
                    {
                        Id            = p.Id,
                        Name          = p.Name,
                        Brand         = p.Brand,
                        Price         = p.Price,
                        Category      = p.Category?.Name ?? "Uncategorized",
                        Description   = p.Description,
                        ImageUrl      = p.ImageUrl,
                        StockQuantity = p.StockQuantity,
                        IsAvailable   = p.StockQuantity > 0,
                        Rating        = (double)(p.Rating ?? 0),
                        ReviewCount   = p.ReviewCount ?? 0
                    })
                    .ToList();

                if (products.Count < 2)
                    return NotFound(AiApiResponse<AiCompareResponseDto>.Fail(
                        "Could not find enough products to compare"));

                var highlights = BuildComparisonHighlights(products);

                return Ok(AiApiResponse<AiCompareResponseDto>.Ok(new AiCompareResponseDto
                {
                    Products   = products,
                    Highlights = highlights
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiCompareResponseDto>.Fail(ex.Message));
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // CART
        // ══════════════════════════════════════════════════════════════════════

        /// <summary>GET /api/ai/cart</summary>
        [HttpGet("cart")]
        public async Task<ActionResult<AiApiResponse<AiCartDto>>> GetCart()
        {
            try
            {
                var userId = GetUserId();
                var cart   = await _cartService.GetCartAsync(userId);
                return Ok(AiApiResponse<AiCartDto>.Ok(MapCart(cart, userId)));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
        }

        /// <summary>POST /api/ai/cart/add  Body: { productId, quantity }</summary>
        [HttpPost("cart/add")]
        public async Task<ActionResult<AiApiResponse<AiCartDto>>> AddToCart(
            [FromBody] AiAddToCartRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.ProductId))
                return BadRequest(AiApiResponse<AiCartDto>.Fail("productId is required"));

            if (request.Quantity <= 0)
                return BadRequest(AiApiResponse<AiCartDto>.Fail("Quantity must be at least 1"));

            try
            {
                var userId = GetUserId();
                var cart   = await _cartService.AddItemAsync(userId, request.ProductId, request.Quantity);
                return Ok(AiApiResponse<AiCartDto>.Ok(MapCart(cart, userId),
                    $"Added {request.Quantity} item(s) to cart"));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
        }

        /// <summary>PUT /api/ai/cart/update/{productId}?qty=2</summary>
        [HttpPut("cart/update/{productId}")]
        public async Task<ActionResult<AiApiResponse<AiCartDto>>> UpdateCartItem(
            string productId,
            [FromQuery] int qty)
        {
            if (qty <= 0)
                return BadRequest(AiApiResponse<AiCartDto>.Fail("qty must be at least 1"));

            try
            {
                var userId = GetUserId();
                var cart   = await _cartService.UpdateItemQuantityAsync(userId, productId, qty);
                return Ok(AiApiResponse<AiCartDto>.Ok(MapCart(cart, userId),
                    $"Quantity updated to {qty}"));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
        }

        /// <summary>DELETE /api/ai/cart/remove/{productId}</summary>
        [HttpDelete("cart/remove/{productId}")]
        public async Task<ActionResult<AiApiResponse<AiCartDto>>> RemoveFromCart(string productId)
        {
            try
            {
                var userId = GetUserId();
                var cart   = await _cartService.RemoveItemAsync(userId, productId);
                return Ok(AiApiResponse<AiCartDto>.Ok(MapCart(cart, userId), "Item removed from cart"));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiCartDto>.Fail(ex.Message));
            }
        }

        /// <summary>DELETE /api/ai/cart/clear</summary>
        [HttpDelete("cart/clear")]
        public async Task<ActionResult<AiApiResponse<string>>> ClearCart()
        {
            try
            {
                var userId = GetUserId();
                await _cartService.ClearCartAsync(userId);
                return Ok(AiApiResponse<string>.Ok("cleared", "Cart has been cleared"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<string>.Fail(ex.Message));
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // ORDERS
        // ══════════════════════════════════════════════════════════════════════

        /// <summary>GET /api/ai/orders — full order history</summary>
        [HttpGet("orders")]
        public async Task<ActionResult<AiApiResponse<List<AiOrderDto>>>> GetOrders()
        {
            try
            {
                var userId = GetUserId();
                var orders = await _orderService.GetUserOrdersAsync(userId);
                var dtos   = orders.OrderByDescending(o => o.CreatedAt)
                                   .Select(MapOrder)
                                   .ToList();
                return Ok(AiApiResponse<List<AiOrderDto>>.Ok(dtos,
                    $"{dtos.Count} order(s) found"));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<List<AiOrderDto>>.Fail(ex.Message));
            }
        }

        /// <summary>GET /api/ai/orders/{orderId}</summary>
        [HttpGet("orders/{orderId}")]
        public async Task<ActionResult<AiApiResponse<AiOrderDto>>> GetOrder(string orderId)
        {
            try
            {
                var userId = GetUserId();
                var order  = await _orderService.GetOrderByMongoIdAsync(orderId, userId);
                return Ok(AiApiResponse<AiOrderDto>.Ok(MapOrder(order)));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(AiApiResponse<AiOrderDto>.Fail(ex.Message));
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiOrderDto>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// POST /api/ai/orders/place
        /// Body: { "shippingAddressId": "..." }  ← optional; uses default if omitted
        /// Places an order from the current cart. The Python agent calls this after
        /// the user confirms, then shows the UPI payment screen.
        /// </summary>
        [HttpPost("orders/place")]
        public async Task<ActionResult<AiApiResponse<AiOrderDto>>> PlaceOrder(
            [FromBody] AiPlaceOrderRequest request)
        {
            try
            {
                var userId = GetUserId();

                // If agent didn't supply an address, auto-resolve:
                // 1. Try the address marked as default
                // 2. Fall back to the first saved address (handles case where no default is set)
                var addressId = request?.ShippingAddressId;
                if (string.IsNullOrWhiteSpace(addressId))
                {
                    var defaultAddr = await _addressService.GetDefaultAddressAsync(userId);
                    if (defaultAddr != null)
                    {
                        addressId = defaultAddr.Id;
                    }
                    else
                    {
                        // No default — pick the first available address
                        var allAddresses = (await _addressService.GetByUserIdAsync(userId))?.ToList();
                        if (allAddresses == null || !allAddresses.Any())
                            return BadRequest(AiApiResponse<AiOrderDto>.Fail(
                                "No shipping address found. Please add an address from your Profile first."));

                        addressId = allAddresses.First().Id;
                    }
                }

                var order = await _orderService.CreateOrderAsync(userId, new CreateOrderDto
                {
                    ShippingAddressId = addressId
                });

                return Ok(AiApiResponse<AiOrderDto>.Ok(MapOrder(order),
                    $"Order {order.OrderNumber} placed successfully. Proceed to payment."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(AiApiResponse<AiOrderDto>.Fail(ex.Message));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(AiApiResponse<AiOrderDto>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiOrderDto>.Fail(ex.Message));
            }
        }

        /// <summary>POST /api/ai/orders/{orderId}/cancel</summary>
        [HttpPost("orders/{orderId}/cancel")]
        public async Task<ActionResult<AiApiResponse<string>>> CancelOrder(string orderId)
        {
            try
            {
                var userId = GetUserId();
                await _orderService.CancelOrderAsync(orderId, userId);
                return Ok(AiApiResponse<string>.Ok("cancelled",
                    $"Order {orderId} has been cancelled successfully."));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(AiApiResponse<string>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(AiApiResponse<string>.Fail(ex.Message));
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<string>.Fail(ex.Message));
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // ADDRESSES
        // ══════════════════════════════════════════════════════════════════════

        /// <summary>GET /api/ai/addresses</summary>
        [HttpGet("addresses")]
        public async Task<ActionResult<AiApiResponse<List<AiAddressDto>>>> GetAddresses()
        {
            try
            {
                var userId    = GetUserId();
                var addresses = await _addressService.GetByUserIdAsync(userId);
                var dtos      = addresses.Select(MapAddress).ToList();
                return Ok(AiApiResponse<List<AiAddressDto>>.Ok(dtos));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<List<AiAddressDto>>.Fail(ex.Message));
            }
        }

        /// <summary>GET /api/ai/addresses/default</summary>
        [HttpGet("addresses/default")]
        public async Task<ActionResult<AiApiResponse<AiAddressDto>>> GetDefaultAddress()
        {
            try
            {
                var userId  = GetUserId();
                var address = await _addressService.GetDefaultAddressAsync(userId);

                if (address == null)
                    return NotFound(AiApiResponse<AiAddressDto>.Fail(
                        "No default address set. Please add an address first."));

                return Ok(AiApiResponse<AiAddressDto>.Ok(MapAddress(address)));
            }
            catch (Exception ex)
            {
                return StatusCode(500, AiApiResponse<AiAddressDto>.Fail(ex.Message));
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // PRIVATE HELPERS
        // ══════════════════════════════════════════════════════════════════════

        private string GetUserId()
        {
            var id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value
                  ?? User.FindFirst("nameid")?.Value;

            if (string.IsNullOrWhiteSpace(id))
                throw new UnauthorizedAccessException("User ID not found in token");

            if (!ObjectId.TryParse(id, out _))
                throw new UnauthorizedAccessException($"Invalid MongoDB User ID in token: {id}");

            return id;
        }

        private static AiCartDto MapCart(
            ECommerceAPI.Application.DTOs.Cart.CartDto cart, string userId)
        {
            if (cart == null)
                return new AiCartDto { UserId = userId, IsEmpty = true };

            var items = (cart.Items ?? new List<ECommerceAPI.Application.DTOs.Cart.CartItemDto>())
                .Select(i => new AiCartItemDto
                {
                    ProductId   = i.ProductIdString ?? i.ProductId.ToString(),
                    ProductName = i.ProductName,
                    Brand       = i.Brand,
                    Price       = i.Price,
                    Quantity    = i.Quantity,
                    Subtotal    = i.Subtotal,
                    ImageUrl    = i.ImageUrl
                }).ToList();

            return new AiCartDto
            {
                CartId     = cart.MongoCartId,
                UserId     = userId,
                Items      = items,
                Total      = cart.TotalAmount,
                TotalItems = cart.TotalItems,
                IsEmpty    = !items.Any()
            };
        }

        private static AiOrderDto MapOrder(
            ECommerceAPI.Application.DTOs.Orders.OrderDto order)
        {
            return new AiOrderDto
            {
                OrderId       = order.Id,
                OrderNumber   = order.OrderNumber,
                Status        = order.Status,
                TotalAmount   = order.TotalAmount,
                CreatedAt     = order.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                Items         = (order.Items ?? new List<ECommerceAPI.Application.DTOs.Orders.OrderItemDto>())
                    .Select(i => new AiOrderItemDto
                    {
                        ProductId   = i.ProductId,
                        ProductName = i.ProductName,
                        Quantity    = i.Quantity,
                        Price       = i.Price,
                        Subtotal    = i.Price * i.Quantity
                    }).ToList()
            };
        }

        private static AiAddressDto MapAddress(
            ECommerceAPI.Domain.Entities.Mongo.AddressMongo address)
        {
            // Build a pre-formatted one-liner for the LLM to read easily
            var full = string.Join(", ", new[]
            {
                address.AddressLine1,
                address.AddressLine2,
                address.City,
                address.State,
                address.PostalCode,
                address.Country
            }.Where(s => !string.IsNullOrWhiteSpace(s)));

            return new AiAddressDto
            {
                Id          = address.Id,
                FullAddress = full,
                City        = address.City,
                State       = address.State,
                PostalCode  = address.PostalCode,
                Country     = address.Country,
                IsDefault   = address.IsDefault
            };
        }

        /// <summary>
        /// Generates comparison summary bullets for the LLM to use verbatim.
        /// Keeps the LLM from having to do arithmetic on raw product data.
        /// </summary>
        private static List<string> BuildComparisonHighlights(List<AiProductDto> products)
        {
            var highlights = new List<string>();

            // Price comparison
            var cheapest  = products.OrderBy(p => p.Price).First();
            var mostExpensive = products.OrderByDescending(p => p.Price).First();
            if (cheapest.Id != mostExpensive.Id)
            {
                var diff = mostExpensive.Price - cheapest.Price;
                highlights.Add(
                    $"💰 {cheapest.Name} is the most affordable at ₹{cheapest.Price:N0} " +
                    $"(₹{diff:N0} cheaper than {mostExpensive.Name}).");
            }

            // Rating comparison
            var bestRated = products.OrderByDescending(p => p.Rating).First();
            highlights.Add(
                $"⭐ {bestRated.Name} has the highest rating: {bestRated.Rating:F1}/5 " +
                $"({bestRated.ReviewCount} reviews).");

            // Stock comparison
            var outOfStock = products.Where(p => !p.IsAvailable).ToList();
            if (outOfStock.Any())
            {
                highlights.Add(
                    $"⚠️ Out of stock: {string.Join(", ", outOfStock.Select(p => p.Name))}.");
            }

            // Best value (lowest price with rating >= 4)
            var bestValue = products
                .Where(p => p.IsAvailable && p.Rating >= 4)
                .OrderBy(p => p.Price)
                .FirstOrDefault();
            if (bestValue != null)
            {
                highlights.Add(
                    $"🏆 Best value pick: {bestValue.Name} — good rating ({bestValue.Rating:F1}★) at ₹{bestValue.Price:N0}.");
            }

            return highlights;
        }
    }
}
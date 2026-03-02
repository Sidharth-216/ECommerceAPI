// ─────────────────────────────────────────────────────────────────────────────
// FILE: ECommerceAPI.Application/DTOs/AI/AiDtos.cs
// PURPOSE: Flat, agent-friendly DTOs returned by AIChatController.
//          No nesting deeper than 2 levels — easier for the LLM to parse.
// ─────────────────────────────────────────────────────────────────────────────

namespace ECommerceAPI.Application.DTOs.AI
{
    // ── Product ──────────────────────────────────────────────────────────────

    public class AiProductDto
    {
        public string Id            { get; set; }
        public string Name          { get; set; }
        public string Brand         { get; set; }
        public decimal Price        { get; set; }
        public string Category      { get; set; }
        public string Description   { get; set; }
        public string ImageUrl      { get; set; }
        public int StockQuantity    { get; set; }
        public bool IsAvailable     { get; set; }
        public double Rating        { get; set; }
        public int ReviewCount      { get; set; }
    }

    // ── Cart ─────────────────────────────────────────────────────────────────

    public class AiCartDto
    {
        public string CartId        { get; set; }
        public string UserId        { get; set; }
        public List<AiCartItemDto> Items { get; set; } = new();
        public decimal Total        { get; set; }
        public int TotalItems       { get; set; }
        public bool IsEmpty         { get; set; }
    }

    public class AiCartItemDto
    {
        public string ProductId     { get; set; }
        public string ProductName   { get; set; }
        public string Brand         { get; set; }
        public decimal Price        { get; set; }
        public int Quantity         { get; set; }
        public decimal Subtotal     { get; set; }
        public string ImageUrl      { get; set; }
    }

    // ── Order ─────────────────────────────────────────────────────────────────

    public class AiOrderDto
    {
        public string OrderId       { get; set; }
        public string OrderNumber   { get; set; }
        public string Status        { get; set; }
        public decimal TotalAmount  { get; set; }
        public string CreatedAt     { get; set; }   // ISO 8601 string — easy for LLM
        public List<AiOrderItemDto> Items { get; set; } = new();
        public string ShippingAddress { get; set; } // Pre-formatted one-liner
    }

    public class AiOrderItemDto
    {
        public string ProductId     { get; set; }
        public string ProductName   { get; set; }
        public int Quantity         { get; set; }
        public decimal Price        { get; set; }
        public decimal Subtotal     { get; set; }
    }

    // ── Address ───────────────────────────────────────────────────────────────

    public class AiAddressDto
    {
        public string Id            { get; set; }
        public string FullAddress   { get; set; }   // Single pre-formatted line for LLM
        public string City          { get; set; }
        public string State         { get; set; }
        public string PostalCode    { get; set; }   // matches AddressMongo.PostalCode
        public string Country       { get; set; }
        public bool IsDefault       { get; set; }
    }

    // ── Context (one-shot full state for the agent) ───────────────────────────

    /// <summary>
    /// GET /api/ai/context
    /// Returns everything the AI agent needs for a user session in one call.
    /// Eliminates 4 separate API calls at session start.
    /// </summary>
    public class AiUserContextDto
    {
        public string UserId        { get; set; }
        public string UserName      { get; set; }
        public string UserEmail     { get; set; }
        public AiCartDto Cart       { get; set; }
        public List<AiAddressDto> Addresses { get; set; } = new();
        public AiAddressDto DefaultAddress  { get; set; }
        public List<AiOrderDto> RecentOrders { get; set; } = new(); // Last 5 only
    }

    // ── Add to Cart Request ───────────────────────────────────────────────────

    public class AiAddToCartRequest
    {
        public string ProductId     { get; set; }
        public int Quantity         { get; set; } = 1;
    }

    // ── Place Order Request ───────────────────────────────────────────────────

    public class AiPlaceOrderRequest
    {
        /// <summary>
        /// MongoDB ObjectId of the address to ship to.
        /// If null, the agent's default address will be used automatically.
        /// </summary>
        public string ShippingAddressId { get; set; }
    }

    // ── Compare Products Request ───────────────────────────────────────────────

    public class AiCompareRequest
    {
        /// <summary>List of 2–4 MongoDB Product IDs to compare.</summary>
        public List<string> ProductIds { get; set; } = new();
    }

    public class AiCompareResponseDto
    {
        public List<AiProductDto> Products { get; set; } = new();

        /// <summary>
        /// Pre-built summary sentences ready for the LLM to include in a response.
        /// e.g. "Product A is cheaper by ₹500 but has lower stock."
        /// </summary>
        public List<string> Highlights { get; set; } = new();
    }

    // ── Generic AI API Response Wrapper ───────────────────────────────────────

    public class AiApiResponse<T>
    {
        public bool Success         { get; set; }
        public string Message       { get; set; }
        public T Data               { get; set; }

        public static AiApiResponse<T> Ok(T data, string message = "Success")
            => new() { Success = true, Message = message, Data = data };

        public static AiApiResponse<T> Fail(string message)
            => new() { Success = false, Message = message, Data = default };
    }
}
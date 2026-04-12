using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Service for generating detailed invoices with professional formatting
    /// </summary>
    public class InvoiceService : IInvoiceService
    {
      private readonly IMongoOrderRepository _orderRepository;
      private readonly IMongoUserRepository _userRepository;
      private readonly IAddressMongoRepository _addressRepository;
        private readonly ILogger<InvoiceService> _logger;

        // Brand constants
        private const string BrandName = "ShopAI";
        private const string SupportEmail = "support@shopai.com";
        private const string PrimaryColor = "#0f766e";   // teal-700
        private const string AccentColor = "#14b8a6";    // teal-500
        private const string DarkColor = "#134e4a";      // teal-900

        public InvoiceService(
          IMongoOrderRepository orderRepository,
          IMongoUserRepository userRepository,
          IAddressMongoRepository addressRepository,
            ILogger<InvoiceService> logger)
        {
          _orderRepository = orderRepository;
          _userRepository = userRepository;
          _addressRepository = addressRepository;
            _logger = logger;
        }

        public async Task<string> GenerateInvoiceHtmlAsync(
            OrderDto order, 
            string customerName, 
            string customerEmail, 
            string customerPhone)
        {
            try
            {
                _logger.LogInformation("📄 [InvoiceService] Generating invoice for order {OrderNumber}", 
                    order.OrderNumber);

                var itemsHtml = BuildInvoiceItemsTable(order);
                var totalsHtml = BuildTotalsSection(order);
                var addressHtml = BuildShippingAddress(order);

                var html = $@"<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1.0'/>
  <title>Invoice - {order.OrderNumber}</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ 
      font-family: 'Segoe UI', Arial, sans-serif; 
      color: #374151; 
      line-height: 1.6; 
      background: #f9fafb;
    }}
    .container {{ max-width: 800px; margin: 40px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
    .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid {AccentColor}; padding-bottom: 20px; }}
    .header-left h1 {{ color: {DarkColor}; font-size: 28px; font-weight: 800; margin-bottom: 8px; }}
    .header-left p {{ color: #6b7280; font-size: 14px; }}
    .invoice-number {{ text-align: right; }}
    .invoice-number span {{ display: block; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }}
    .invoice-number strong {{ display: block; font-size: 20px; color: {PrimaryColor}; font-weight: 800; font-family: 'Courier New', monospace; }}
    .metadata {{ display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }}
    .metadata-box h3 {{ font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 8px; }}
    .metadata-box p {{ color: {DarkColor}; font-size: 15px; font-weight: 600; }}
    .section-header {{ font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin: 30px 0 16px 0; }}
    .items-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
    .items-table th {{ background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; border-bottom: 2px solid {AccentColor}; }}
    .items-table td {{ padding: 14px 12px; border-bottom: 1px solid #e5e7eb; }}
    .items-table tr:last-child td {{ border-bottom: 2px solid {AccentColor}; }}
    .item-name {{ font-weight: 600; color: {DarkColor}; }}
    .item-qty {{ text-align: center; color: #6b7280; }}
    .item-price {{ text-align: right; color: {PrimaryColor}; font-weight: 600; }}
    .totals-box {{ background: linear-gradient(135deg, #f0fdfa, #ecfeff); border-left: 4px solid {AccentColor}; padding: 20px; border-radius: 6px; margin-bottom: 30px; }}
    .totals-box .row {{ display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }}
    .totals-box .row:last-child {{ margin-bottom: 0; }}
    .totals-box .label {{ color: #6b7280; font-weight: 600; }}
    .totals-box .value {{ color: {DarkColor}; font-weight: 600; }}
    .totals-box .row.total {{ border-top: 2px solid {AccentColor}; padding-top: 12px; margin-top: 12px; }}
    .totals-box .row.total .value {{ color: {PrimaryColor}; font-size: 20px; font-weight: 900; }}
    .address-box {{ background: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 30px; }}
    .address-box h3 {{ font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 12px; }}
    .address-box p {{ margin: 6px 0; color: {DarkColor}; font-size: 14px; line-height: 1.7; }}
    .footer {{ border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; }}
    .footer strong {{ color: {PrimaryColor}; }}
    .status-badge {{ display: inline-block; background: #dcfce7; color: #166534; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 12px; }}
    @media print {{ 
      body {{ background: white; }}
      .container {{ max-width: 100%; margin: 0; padding: 0; box-shadow: none; }}
    }}
  </style>
</head>
<body>
  <div class='container'>
    <!-- Header -->
    <div class='header'>
      <div class='header-left'>
        <h1>{BrandName}</h1>
        <p>Professional E-Commerce Solutions</p>
      </div>
      <div class='invoice-number'>
        <span>Invoice Number</span>
        <strong>{order.OrderNumber}</strong>
        <span style='margin-top: 16px; display: block;'>Invoice Date</span>
        <strong>{order.CreatedAt:dd MMM yyyy}</strong>
      </div>
    </div>

    <!-- Metadata -->
    <div class='metadata'>
      <div class='metadata-box'>
        <h3>Bill To</h3>
        <p>{customerName}</p>
        <p style='font-size: 13px; color: #6b7280; margin-top: 8px;'>{customerEmail}</p>
        <p style='font-size: 13px; color: #6b7280;'>{customerPhone}</p>
      </div>
      <div class='metadata-box'>
        <h3>Order Status</h3>
        <span class='status-badge'>● {order.Status?.ToUpper()}</span>
        <h3 style='margin-top: 16px;'>Order Date</h3>
        <p>{order.CreatedAt:dd MMM yyyy, hh:mm tt}</p>
      </div>
    </div>

    <!-- Shipping Address -->
    <div class='address-box'>
      <h3>📍 Shipping Address</h3>
      {addressHtml}
    </div>

    <!-- Items Table -->
    <h2 class='section-header'>Order Items</h2>
    <table class='items-table'>
      <thead>
        <tr>
          <th style='width: 50%;'>Product Name</th>
          <th style='width: 15%;'>Quantity</th>
          <th style='width: 17.5%;'>Unit Price</th>
          <th style='width: 17.5%;'>Total</th>
        </tr>
      </thead>
      <tbody>
        {itemsHtml}
      </tbody>
    </table>

    <!-- Totals Section -->
    <h2 class='section-header'>Price Breakdown</h2>
    <div class='totals-box'>
      {totalsHtml}
    </div>

    <!-- Footer -->
    <div class='footer'>
      <p>Thank you for your business! If you have any questions about this invoice, please contact us at <strong>{SupportEmail}</strong></p>
      <p style='margin-top: 12px;'>This is an automatically generated invoice from {BrandName}. Please keep it for your records.</p>
    </div>
  </div>
</body>
</html>";

                _logger.LogInformation("✅ [InvoiceService] Invoice generated successfully for {OrderNumber}", 
                    order.OrderNumber);
                return html;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [InvoiceService] Error generating invoice for order {OrderNumber}", 
                    order.OrderNumber);
                throw;
            }
        }

        public async Task<string> GetInvoiceAsHtmlAsync(string orderId)
        {
            try
            {
            var order = await _orderRepository.GetByIdAsync(orderId);
                if (order == null)
                {
                    _logger.LogWarning("⚠️ [InvoiceService] Order not found: {OrderId}", orderId);
                    throw new KeyNotFoundException($"Order {orderId} not found");
                }

            var customer = await _userRepository.GetByIdAsync(order.UserId);
            var address = await _addressRepository.GetByIdAsync(order.ShippingAddressId);

            var orderDto = new OrderDto
            {
              Id = order.Id,
              UserId = order.UserId,
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
              }).ToList(),
              CustomerName = customer?.FullName ?? "Valued Customer",
              CustomerEmail = customer?.Email ?? "",
              CustomerPhone = customer?.Mobile ?? "",
              ShippingAddress = address == null ? null : new ShippingAddressDto
              {
                AddressLine1 = address.AddressLine1,
                AddressLine2 = address.AddressLine2,
                City = address.City,
                State = address.State,
                PostalCode = address.PostalCode,
                Country = address.Country
              }
            };

                // Generate invoice with order data
                var html = await GenerateInvoiceHtmlAsync(
              orderDto,
              orderDto.CustomerName,
              orderDto.CustomerEmail,
              orderDto.CustomerPhone);

                return html;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [InvoiceService] Error retrieving invoice for order {OrderId}", orderId);
                throw;
            }
        }

        /// <summary>
        /// Build HTML for items table rows
        /// </summary>
        private string BuildInvoiceItemsTable(OrderDto order)
        {
            if (order?.Items == null || !order.Items.Any())
                return "<tr><td colspan='4' style='text-align: center; color: #9ca3af;'>No items in order</td></tr>";

            var rows = new List<string>();
            foreach (var item in order.Items)
            {
                var itemTotal = item.Price * item.Quantity;
                rows.Add($@"
        <tr>
          <td class='item-name'>{item.ProductName}</td>
          <td class='item-qty'>{item.Quantity}</td>
          <td class='item-price'>₹{item.Price:N2}</td>
          <td class='item-price'>₹{itemTotal:N2}</td>
        </tr>");
            }

            return string.Join("", rows);
        }

        /// <summary>
        /// Build totals summary section
        /// </summary>
        private string BuildTotalsSection(OrderDto order)
        {
            var subtotal = order.Items?.Sum(i => i.Price * i.Quantity) ?? 0;
            var tax = subtotal * 0.05m; // Assuming 5% tax
            var shipping = subtotal > 500 ? 0 : 50; // Free shipping above ₹500
            var total = subtotal + tax + shipping;

            return $@"
      <div class='row'>
        <span class='label'>Subtotal</span>
        <span class='value'>₹{subtotal:N2}</span>
      </div>
      <div class='row'>
        <span class='label'>Tax (5%)</span>
        <span class='value'>₹{tax:N2}</span>
      </div>
      <div class='row'>
        <span class='label'>Shipping</span>
        <span class='value'>₹{shipping:N2}</span>
      </div>
      <div class='row total'>
        <span class='label'>Total Amount</span>
        <span class='value'>₹{total:N2}</span>
      </div>";
        }

        /// <summary>
        /// Build shipping address HTML
        /// </summary>
        private string BuildShippingAddress(OrderDto order)
        {
            if (order?.ShippingAddress == null)
                return "<p>Address not provided</p>";

            var addr = order.ShippingAddress;
            return $@"
      <p>{addr.AddressLine1}</p>
      {(string.IsNullOrWhiteSpace(addr.AddressLine2) ? "" : $"<p>{addr.AddressLine2}</p>")}
      <p>{addr.City}, {addr.State} {addr.PostalCode}</p>
      <p>{addr.Country}</p>";
        }
    }
}

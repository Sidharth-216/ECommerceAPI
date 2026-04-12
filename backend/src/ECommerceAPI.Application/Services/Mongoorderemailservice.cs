/*using System;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Sends rich HTML transactional emails for order lifecycle events.
    /// </summary>
    public class MongoOrderEmailService : IMongoOrderEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<MongoOrderEmailService> _logger;

        // Brand constants — change once, reflected everywhere
        private const string BrandName     = "ShopAI";
        private const string SupportEmail  = "support@shopai.com";
        private const string PrimaryColor  = "#0f766e";   // teal-700
        private const string AccentColor   = "#14b8a6";   // teal-500
        private const string DarkColor     = "#134e4a";   // teal-900

        public MongoOrderEmailService(
            IConfiguration configuration,
            ILogger<MongoOrderEmailService> logger)
        {
            _configuration = configuration;
            _logger        = logger;
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PUBLIC METHODS
        // ─────────────────────────────────────────────────────────────────────────

        public async Task<bool> SendOrderConfirmationAsync(
            string toEmail, string customerName, OrderDto order)
        {
            try
            {
                _logger.LogInformation(
                    "📧 Sending order confirmation email to {Email} for order {OrderNumber}",
                    toEmail, order.OrderNumber);

                var subject = $"🎉 Order Confirmed! #{order.OrderNumber} — {BrandName}";
                var body    = BuildOrderConfirmationHtml(customerName, order);

                var sent = await SendEmailAsync(toEmail, subject, body);

                if (sent)
                    _logger.LogInformation("✅ Order confirmation email sent to {Email}", toEmail);
                else
                    _logger.LogWarning("⚠️ Failed to send order confirmation email to {Email}", toEmail);

                return sent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "❌ Error sending order confirmation email to {Email}", toEmail);
                return false;
            }
        }

        public async Task<bool> SendOrderCancellationAsync(
            string toEmail, string customerName, OrderDto order)
        {
            try
            {
                _logger.LogInformation(
                    "📧 Sending order cancellation email to {Email} for order {OrderNumber}",
                    toEmail, order.OrderNumber);

                var subject = $"❌ Order Cancelled — #{order.OrderNumber} | {BrandName}";
                var body    = BuildOrderCancellationHtml(customerName, order);

                return await SendEmailAsync(toEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "❌ Error sending order cancellation email to {Email}", toEmail);
                return false;
            }
        }

        public async Task<bool> SendOrderStatusUpdateAsync(
            string toEmail, string customerName, OrderDto order, string previousStatus)
        {
            try
            {
                _logger.LogInformation(
                    "📧 Sending order status update email to {Email}, order {OrderNumber}: {Prev} → {New}",
                    toEmail, order.OrderNumber, previousStatus, order.Status);

                var (emoji, label) = GetStatusMeta(order.Status);
                var subject = $"{emoji} Order {label} — #{order.OrderNumber} | {BrandName}";
                var body    = BuildOrderStatusUpdateHtml(customerName, order, previousStatus);

                return await SendEmailAsync(toEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "❌ Error sending order status update email to {Email}", toEmail);
                return false;
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // HTML BUILDERS
        // ─────────────────────────────────────────────────────────────────────────

        private string BuildOrderConfirmationHtml(string customerName, OrderDto order)
        {
            var itemsHtml  = BuildItemsTableHtml(order);
            var timeline   = BuildTimelineHtml("confirmed");
            var firstName  = customerName.Split(' ')[0];

            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1.0'/>
  <title>Order Confirmed — {BrandName}</title>
</head>
<body style='margin:0;padding:0;background:#f0fdfa;font-family:""Segoe UI"",Arial,sans-serif;'>

<!-- ═══ WRAPPER ═══ -->
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0fdfa;padding:40px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0'
       style='background:#ffffff;border-radius:20px;overflow:hidden;
              box-shadow:0 8px 40px rgba(20,184,166,0.13);max-width:600px;width:100%;'>

  <!-- ══ HEADER ══ -->
  <tr>
    <td style='background:linear-gradient(135deg,{AccentColor} 0%,#0891b2 100%);
               padding:44px 40px 36px;text-align:center;'>
      <div style='font-size:40px;margin-bottom:8px;'>🛍️</div>
      <h1 style='margin:0 0 4px;color:#fff;font-size:26px;font-weight:800;
                 letter-spacing:0.5px;'>{BrandName}</h1>
      <p style='margin:0;color:#ccfbf1;font-size:13px;letter-spacing:1px;
                text-transform:uppercase;font-weight:600;'>Your Smart Shopping Companion</p>
    </td>
  </tr>

  <!-- ══ SUCCESS BADGE ══ -->
  <tr>
    <td style='padding:0;text-align:center;background:#ffffff;'>
      <div style='display:inline-block;margin-top:-22px;background:#fff;
                  border-radius:50px;padding:10px 28px;
                  box-shadow:0 4px 20px rgba(20,184,166,0.2);
                  border:2px solid #ccfbf1;'>
        <span style='color:{PrimaryColor};font-weight:800;font-size:14px;
                     letter-spacing:0.5px;'>✅ ORDER CONFIRMED</span>
      </div>
    </td>
  </tr>

  <!-- ══ GREETING ══ -->
  <tr>
    <td style='padding:36px 40px 0;'>
      <h2 style='margin:0 0 12px;font-size:24px;color:{DarkColor};font-weight:800;'>
        Hey {firstName}! 🎉
      </h2>
      <p style='margin:0;color:#6b7280;font-size:15px;line-height:1.7;'>
        Your order has been placed successfully and is now being processed.
        We'll keep you updated every step of the way. Thank you for shopping with
        <strong style='color:{PrimaryColor};'>{BrandName}</strong>!
      </p>
    </td>
  </tr>

  <!-- ══ ORDER META ══ -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <table width='100%' cellpadding='0' cellspacing='0'
             style='background:linear-gradient(135deg,#f0fdfa,#ecfeff);
                    border-radius:16px;border:1.5px solid #99f6e4;overflow:hidden;'>
        <tr>
          <td style='padding:22px 28px;'>
            <table width='100%' cellpadding='0' cellspacing='0'>
              <tr>
                <td style='width:50%;vertical-align:top;padding-bottom:16px;'>
                  <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;
                             text-transform:uppercase;letter-spacing:1.5px;font-weight:700;'>
                    Order Number</p>
                  <p style='margin:0;font-size:17px;color:{DarkColor};font-weight:800;
                             font-family:""Courier New"",monospace;'>
                    #{order.OrderNumber}</p>
                </td>
                <td style='width:50%;vertical-align:top;padding-bottom:16px;text-align:right;'>
                  <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;
                             text-transform:uppercase;letter-spacing:1.5px;font-weight:700;'>
                    Order Date</p>
                  <p style='margin:0;font-size:15px;color:{DarkColor};font-weight:700;'>
                    {order.CreatedAt:dd MMM yyyy}</p>
                </td>
              </tr>
              <tr>
                <td style='width:50%;vertical-align:top;'>
                  <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;
                             text-transform:uppercase;letter-spacing:1.5px;font-weight:700;'>
                    Status</p>
                  <span style='display:inline-block;background:#dcfce7;color:#166534;
                                font-size:12px;font-weight:800;padding:4px 12px;
                                border-radius:20px;letter-spacing:0.5px;'>
                    ● {order.Status?.ToUpper()}</span>
                </td>
                <td style='width:50%;vertical-align:top;text-align:right;'>
                  <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;
                             text-transform:uppercase;letter-spacing:1.5px;font-weight:700;'>
                    Total Amount</p>
                  <p style='margin:0;font-size:22px;color:{PrimaryColor};font-weight:900;'>
                    ₹{order.TotalAmount:N2}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ ORDER TIMELINE ══ -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <h3 style='margin:0 0 18px;font-size:15px;color:{DarkColor};font-weight:800;
                 text-transform:uppercase;letter-spacing:0.5px;'>Order Journey</h3>
      {timeline}
    </td>
  </tr>

  <!-- ══ ITEMS TABLE ══ -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <h3 style='margin:0 0 16px;font-size:15px;color:{DarkColor};font-weight:800;
                 text-transform:uppercase;letter-spacing:0.5px;'>Items Ordered</h3>
      {itemsHtml}
    </td>
  </tr>

  <!-- ══ TOTAL SUMMARY ══ -->
  <tr>
    <td style='padding:0 40px;'>
      <table width='100%' cellpadding='0' cellspacing='0'>
        <tr>
          <td style='padding:16px 0;border-top:1.5px dashed #e5e7eb;'>
            <table width='100%' cellpadding='0' cellspacing='0'>
              <tr>
                <td style='color:#9ca3af;font-size:13px;font-weight:600;'>Subtotal</td>
                <td align='right' style='color:#374151;font-size:13px;font-weight:700;'>
                  ₹{order.TotalAmount:N2}</td>
              </tr>
              <tr>
                <td style='color:#9ca3af;font-size:13px;font-weight:600;padding-top:8px;'>
                  Shipping</td>
                <td align='right' style='color:#059669;font-size:13px;font-weight:800;
                                          padding-top:8px;'>FREE 🎁</td>
              </tr>
              <tr>
                <td style='color:{DarkColor};font-size:16px;font-weight:900;padding-top:14px;
                            border-top:2px solid #f0fdfa;'>Total Paid</td>
                <td align='right' style='color:{PrimaryColor};font-size:22px;font-weight:900;
                                          padding-top:14px;border-top:2px solid #f0fdfa;'>
                  ₹{order.TotalAmount:N2}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ WHAT'S NEXT ══ -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <table width='100%' cellpadding='0' cellspacing='0'
             style='background:#fef9c3;border-left:4px solid #eab308;
                    border-radius:12px;'>
        <tr>
          <td style='padding:20px 22px;'>
            <p style='margin:0 0 6px;font-size:14px;font-weight:800;color:#854d0e;'>
              📦 What happens next?</p>
            <p style='margin:0;font-size:13px;color:#92400e;line-height:1.7;'>
              Our team is now picking and packing your items. You'll receive another
              email as soon as your order is shipped with a tracking link.
              Estimated delivery: <strong>3–5 business days</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ DIVIDER ══ -->
  <tr><td style='padding:32px 40px 0;'>
    <hr style='border:none;border-top:1.5px solid #f0fdfa;margin:0;'/>
  </td></tr>

  <!-- ══ SUPPORT ══ -->
  <tr>
    <td style='padding:24px 40px;text-align:center;'>
      <p style='margin:0 0 8px;font-size:13px;color:#6b7280;'>
        Questions about your order?
      </p>
      <a href='mailto:{SupportEmail}'
         style='color:{AccentColor};font-weight:800;font-size:14px;text-decoration:none;'>
        📬 {SupportEmail}
      </a>
    </td>
  </tr>

  <!-- ══ FOOTER ══ -->
  <tr>
    <td style='background:#f8fafc;padding:28px 40px;text-align:center;
               border-top:1.5px solid #f0f0f0;'>
      <p style='margin:0 0 6px;font-size:13px;color:#6b7280;'>
        © {DateTime.UtcNow.Year}
        <strong style='color:{PrimaryColor};'>{BrandName}</strong>.
        All rights reserved.
      </p>
      <p style='margin:0;font-size:11px;color:#9ca3af;'>
        This is an automated message — please do not reply directly to this email.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>";
        }

        private string BuildOrderCancellationHtml(string customerName, OrderDto order)
        {
            var itemsHtml = BuildItemsTableHtml(order);
            var firstName = customerName.Split(' ')[0];

            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1.0'/>
  <title>Order Cancelled — {BrandName}</title>
</head>
<body style='margin:0;padding:0;background:#fff1f2;font-family:""Segoe UI"",Arial,sans-serif;'>

<table width='100%' cellpadding='0' cellspacing='0' style='background:#fff1f2;padding:40px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0'
       style='background:#ffffff;border-radius:20px;overflow:hidden;
              box-shadow:0 8px 40px rgba(244,63,94,0.12);max-width:600px;width:100%;'>

  <!-- HEADER -->
  <tr>
    <td style='background:linear-gradient(135deg,#f43f5e,#e11d48);
               padding:44px 40px 36px;text-align:center;'>
      <div style='font-size:40px;margin-bottom:8px;'>🛍️</div>
      <h1 style='margin:0 0 4px;color:#fff;font-size:26px;font-weight:800;'>{BrandName}</h1>
      <p style='margin:0;color:#fecdd3;font-size:13px;letter-spacing:1px;
                text-transform:uppercase;font-weight:600;'>Order Update</p>
    </td>
  </tr>

  <!-- BADGE -->
  <tr>
    <td style='padding:0;text-align:center;background:#ffffff;'>
      <div style='display:inline-block;margin-top:-22px;background:#fff;
                  border-radius:50px;padding:10px 28px;
                  box-shadow:0 4px 20px rgba(244,63,94,0.18);border:2px solid #fecdd3;'>
        <span style='color:#e11d48;font-weight:800;font-size:14px;letter-spacing:0.5px;'>
          ❌ ORDER CANCELLED</span>
      </div>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style='padding:36px 40px 0;'>
      <h2 style='margin:0 0 12px;font-size:22px;color:#1f2937;font-weight:800;'>
        Hi {firstName},</h2>
      <p style='margin:0;color:#6b7280;font-size:15px;line-height:1.7;'>
        Your order <strong style='color:#e11d48;'>#{order.OrderNumber}</strong> has been
        successfully cancelled as requested. If a payment was made, it will be refunded
        within <strong>5–7 business days</strong>.
      </p>
    </td>
  </tr>

  <!-- ORDER META -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <table width='100%' cellpadding='0' cellspacing='0'
             style='background:#fff1f2;border-radius:16px;border:1.5px solid #fecdd3;'>
        <tr>
          <td style='padding:22px 28px;'>
            <table width='100%' cellpadding='0' cellspacing='0'>
              <tr>
                <td style='color:#9ca3af;font-size:11px;text-transform:uppercase;
                            letter-spacing:1.5px;font-weight:700;padding-bottom:4px;'>
                  Order Number</td>
                <td align='right' style='color:#9ca3af;font-size:11px;text-transform:uppercase;
                                          letter-spacing:1.5px;font-weight:700;padding-bottom:4px;'>
                  Amount</td>
              </tr>
              <tr>
                <td style='color:#1f2937;font-size:17px;font-weight:800;
                            font-family:""Courier New"",monospace;'>
                  #{order.OrderNumber}</td>
                <td align='right' style='color:#e11d48;font-size:20px;font-weight:900;'>
                  ₹{order.TotalAmount:N2}</td>
              </tr>
              <tr>
                <td colspan='2' style='padding-top:14px;border-top:1px dashed #fecdd3;'>
                  <span style='background:#fee2e2;color:#991b1b;font-size:12px;
                                font-weight:800;padding:4px 14px;border-radius:20px;'>
                    ● CANCELLED</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ITEMS -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <h3 style='margin:0 0 16px;font-size:15px;color:#1f2937;font-weight:800;
                 text-transform:uppercase;letter-spacing:0.5px;'>Cancelled Items</h3>
      {itemsHtml}
    </td>
  </tr>

  <!-- REFUND NOTE -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <table width='100%' cellpadding='0' cellspacing='0'
             style='background:#f0fdf4;border-left:4px solid #22c55e;border-radius:12px;'>
        <tr>
          <td style='padding:20px 22px;'>
            <p style='margin:0 0 6px;font-size:14px;font-weight:800;color:#14532d;'>
              💚 Refund Information</p>
            <p style='margin:0;font-size:13px;color:#166534;line-height:1.7;'>
              If you paid online, your refund of <strong>₹{order.TotalAmount:N2}</strong>
              will be credited to your original payment method within 5–7 business days.
              For any queries, reach us at
              <a href='mailto:{SupportEmail}' style='color:#15803d;font-weight:700;'>
                {SupportEmail}</a>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style='background:#f8fafc;padding:32px 40px;text-align:center;
               border-top:1.5px solid #f0f0f0;margin-top:32px;'>
      <p style='margin:0 0 8px;font-size:13px;color:#6b7280;'>
        © {DateTime.UtcNow.Year}
        <strong style='color:{PrimaryColor};'>{BrandName}</strong>. All rights reserved.
      </p>
      <p style='margin:0;font-size:11px;color:#9ca3af;'>
        This is an automated message — please do not reply directly.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>";
        }

        private string BuildOrderStatusUpdateHtml(
            string customerName, OrderDto order, string previousStatus)
        {
            var (emoji, label)   = GetStatusMeta(order.Status);
            var (bgColor, fgColor, badgeBg, badgeFg) = GetStatusColors(order.Status);
            var firstName        = customerName.Split(' ')[0];
            var timeline         = BuildTimelineHtml(order.Status?.ToLower() ?? "pending");
            var statusMessage    = GetStatusMessage(order.Status, order.OrderNumber);

            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1.0'/>
  <title>Order {label} — {BrandName}</title>
</head>
<body style='margin:0;padding:0;background:#f8fafc;font-family:""Segoe UI"",Arial,sans-serif;'>

<table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;padding:40px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0'
       style='background:#ffffff;border-radius:20px;overflow:hidden;
              box-shadow:0 8px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;'>

  <!-- HEADER -->
  <tr>
    <td style='background:linear-gradient(135deg,{AccentColor} 0%,#0891b2 100%);
               padding:44px 40px 36px;text-align:center;'>
      <div style='font-size:40px;margin-bottom:8px;'>🛍️</div>
      <h1 style='margin:0 0 4px;color:#fff;font-size:26px;font-weight:800;'>{BrandName}</h1>
      <p style='margin:0;color:#ccfbf1;font-size:13px;letter-spacing:1px;
                text-transform:uppercase;font-weight:600;'>Order Update</p>
    </td>
  </tr>

  <!-- STATUS BADGE -->
  <tr>
    <td style='padding:0;text-align:center;background:#ffffff;'>
      <div style='display:inline-block;margin-top:-22px;background:#fff;
                  border-radius:50px;padding:10px 28px;
                  box-shadow:0 4px 20px rgba(20,184,166,0.18);border:2px solid #ccfbf1;'>
        <span style='color:{PrimaryColor};font-weight:800;font-size:14px;letter-spacing:0.5px;'>
          {emoji} ORDER {label.ToUpper()}</span>
      </div>
    </td>
  </tr>

  <!-- GREETING -->
  <tr>
    <td style='padding:36px 40px 0;'>
      <h2 style='margin:0 0 12px;font-size:22px;color:{DarkColor};font-weight:800;'>
        Hi {firstName}!</h2>
      <p style='margin:0;color:#6b7280;font-size:15px;line-height:1.7;'>
        {statusMessage}
      </p>
    </td>
  </tr>

  <!-- ORDER META -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <table width='100%' cellpadding='0' cellspacing='0'
             style='background:linear-gradient(135deg,#f0fdfa,#ecfeff);
                    border-radius:16px;border:1.5px solid #99f6e4;'>
        <tr>
          <td style='padding:22px 28px;'>
            <table width='100%' cellpadding='0' cellspacing='0'>
              <tr>
                <td>
                  <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;
                             text-transform:uppercase;letter-spacing:1.5px;font-weight:700;'>
                    Order Number</p>
                  <p style='margin:0;font-size:17px;color:{DarkColor};font-weight:800;
                             font-family:""Courier New"",monospace;'>
                    #{order.OrderNumber}</p>
                </td>
                <td align='right'>
                  <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;
                             text-transform:uppercase;letter-spacing:1.5px;font-weight:700;'>
                    Total</p>
                  <p style='margin:0;font-size:20px;color:{PrimaryColor};font-weight:900;'>
                    ₹{order.TotalAmount:N2}</p>
                </td>
              </tr>
              <tr>
                <td colspan='2' style='padding-top:14px;'>
                  <span style='background:{badgeBg};color:{badgeFg};font-size:12px;
                                font-weight:800;padding:4px 14px;border-radius:20px;'>
                    {emoji} {order.Status?.ToUpper()}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- TIMELINE -->
  <tr>
    <td style='padding:28px 40px 0;'>
      <h3 style='margin:0 0 18px;font-size:15px;color:{DarkColor};font-weight:800;
                 text-transform:uppercase;letter-spacing:0.5px;'>Order Journey</h3>
      {timeline}
    </td>
  </tr>

  <!-- SUPPORT -->
  <tr>
    <td style='padding:28px 40px;text-align:center;'>
      <p style='margin:0 0 8px;font-size:13px;color:#6b7280;'>
        Need help? We're always here for you.</p>
      <a href='mailto:{SupportEmail}'
         style='color:{AccentColor};font-weight:800;font-size:14px;text-decoration:none;'>
        📬 {SupportEmail}</a>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style='background:#f8fafc;padding:28px 40px;text-align:center;
               border-top:1.5px solid #f0f0f0;'>
      <p style='margin:0 0 6px;font-size:13px;color:#6b7280;'>
        © {DateTime.UtcNow.Year}
        <strong style='color:{PrimaryColor};'>{BrandName}</strong>. All rights reserved.</p>
      <p style='margin:0;font-size:11px;color:#9ca3af;'>
        This is an automated message — please do not reply directly.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>";
        }

        // ─────────────────────────────────────────────────────────────────────────
        // COMPONENT BUILDERS
        // ─────────────────────────────────────────────────────────────────────────

        private string BuildItemsTableHtml(OrderDto order)
        {
            if (order.Items == null || !order.Items.Any())
                return "<p style='color:#9ca3af;font-size:13px;'>No items found.</p>";

            var sb = new StringBuilder();
            sb.Append(@"<table width='100%' cellpadding='0' cellspacing='0'
       style='border-radius:12px;overflow:hidden;border:1.5px solid #f0fdfa;'>");

            // Header row
            sb.Append($@"
  <tr style='background:{AccentColor};'>
    <td style='padding:12px 16px;color:#fff;font-size:11px;font-weight:800;
               text-transform:uppercase;letter-spacing:1px;'>Product</td>
    <td style='padding:12px 16px;color:#fff;font-size:11px;font-weight:800;
               text-transform:uppercase;letter-spacing:1px;text-align:center;'>Qty</td>
    <td style='padding:12px 16px;color:#fff;font-size:11px;font-weight:800;
               text-transform:uppercase;letter-spacing:1px;text-align:right;'>Price</td>
    <td style='padding:12px 16px;color:#fff;font-size:11px;font-weight:800;
               text-transform:uppercase;letter-spacing:1px;text-align:right;'>Total</td>
  </tr>");

            var rowBg = new[] { "#ffffff", "#f0fdfa" };
            var idx   = 0;

            foreach (var item in order.Items)
            {
                var bg       = rowBg[idx % 2];
                var itemTotal = item.Price * item.Quantity;
                idx++;

                sb.Append($@"
  <tr style='background:{bg};'>
    <td style='padding:14px 16px;color:#1f2937;font-size:14px;font-weight:700;
               border-bottom:1px solid #f0fdfa;'>
      {System.Web.HttpUtility.HtmlEncode(item.ProductName)}
    </td>
    <td style='padding:14px 16px;color:#6b7280;font-size:14px;font-weight:600;
               text-align:center;border-bottom:1px solid #f0fdfa;'>
      × {item.Quantity}
    </td>
    <td style='padding:14px 16px;color:#6b7280;font-size:14px;font-weight:600;
               text-align:right;border-bottom:1px solid #f0fdfa;'>
      ₹{item.Price:N2}
    </td>
    <td style='padding:14px 16px;color:{PrimaryColor};font-size:14px;font-weight:800;
               text-align:right;border-bottom:1px solid #f0fdfa;'>
      ₹{itemTotal:N2}
    </td>
  </tr>");
            }

            sb.Append("</table>");
            return sb.ToString();
        }

        private string BuildTimelineHtml(string currentStatus)
        {
            var steps = new[]
            {
                ("confirmed",  "🛒", "Order Confirmed",   "We've received your order"),
                ("processing", "⚙️", "Processing",         "Packing your items"),
                ("shipped",    "🚚", "Shipped",             "On the way to you"),
                ("delivered",  "🎉", "Delivered",           "Enjoy your purchase!")
            };

            var order = new[] { "confirmed", "processing", "shipped", "delivered" };
            var currentIdx = Array.IndexOf(order, currentStatus.ToLower());

            var sb = new StringBuilder();
            sb.Append("<table width='100%' cellpadding='0' cellspacing='0'>");
            sb.Append("<tr>");

            for (int i = 0; i < steps.Length; i++)
            {
                var (key, icon, title, sub) = steps[i];
                var done    = i <= currentIdx;
                var active  = i == currentIdx;
                var circleBg = active  ? AccentColor :
                               done    ? PrimaryColor : "#e5e7eb";
                var textColor = done ? DarkColor : "#9ca3af";

                sb.Append($@"
  <td style='text-align:center;vertical-align:top;padding:0 4px;'>
    <div style='width:40px;height:40px;border-radius:50%;background:{circleBg};
                color:#fff;font-size:18px;line-height:40px;margin:0 auto 8px;
                box-shadow:{(active ? $"0 0 0 4px #ccfbf1" : "none")};'>
      {icon}
    </div>
    <p style='margin:0 0 2px;font-size:12px;font-weight:800;color:{textColor};'>{title}</p>
    <p style='margin:0;font-size:10px;color:#9ca3af;'>{sub}</p>
  </td>");

                if (i < steps.Length - 1)
                {
                    var lineColor = i < currentIdx ? AccentColor : "#e5e7eb";
                    sb.Append($@"
  <td style='vertical-align:top;padding-top:20px;'>
    <div style='height:2px;background:{lineColor};border-radius:2px;'></div>
  </td>");
                }
            }

            sb.Append("</tr></table>");
            return sb.ToString();
        }

        // ─────────────────────────────────────────────────────────────────────────
        // SMTP SENDER
        // ─────────────────────────────────────────────────────────────────────────

        private async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            try
            {
                var smtp      = _configuration.GetSection("EmailSettings");
                var host      = smtp["SmtpHost"];
                var port      = int.Parse(smtp["SmtpPort"]!);
                var username  = smtp["SmtpUsername"];
                var password  = smtp["SmtpPassword"];
                var fromEmail = smtp["FromEmail"];
                var fromName  = smtp["FromName"] ?? BrandName;
                var enableSsl = bool.Parse(smtp["EnableSsl"] ?? "true");

                using var client = new SmtpClient(host, port)
                {
                    Credentials     = new NetworkCredential(username, password),
                    EnableSsl       = enableSsl,
                    DeliveryMethod  = SmtpDeliveryMethod.Network
                };

                var mail = new MailMessage
                {
                    From       = new MailAddress(fromEmail!, fromName),
                    Subject    = subject,
                    Body       = htmlBody,
                    IsBodyHtml = true
                };
                mail.To.Add(toEmail);

                await client.SendMailAsync(mail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ SMTP send failed to {Email}", toEmail);
                return false;
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────────────────

        private static (string emoji, string label) GetStatusMeta(string? status) =>
            (status?.ToLower()) switch
            {
                "processing" => ("⚙️", "Processing"),
                "shipped"    => ("🚚", "Shipped"),
                "delivered"  => ("🎉", "Delivered"),
                "cancelled"  => ("❌", "Cancelled"),
                _            => ("✅", "Confirmed")
            };

        private static (string bg, string fg, string badgeBg, string badgeFg)
            GetStatusColors(string? status) =>
            (status?.ToLower()) switch
            {
                "processing" => ("#eff6ff", "#1e3a8a", "#dbeafe", "#1e40af"),
                "shipped"    => ("#f0fdf4", "#14532d", "#dcfce7", "#166534"),
                "delivered"  => ("#fef9c3", "#713f12", "#fef08a", "#854d0e"),
                "cancelled"  => ("#fff1f2", "#881337", "#fee2e2", "#991b1b"),
                _            => ("#f0fdfa", "#134e4a", "#ccfbf1", "#0f766e")
            };

        private static string GetStatusMessage(string? status, string orderNumber) =>
            (status?.ToLower()) switch
            {
                "processing" =>
                    $"Great news! Your order <strong>#{orderNumber}</strong> is now being processed and packed by our team. We'll notify you once it's on its way.",
                "shipped"    =>
                    $"Your order <strong>#{orderNumber}</strong> has been shipped! 🚀 It's on its way to you. Estimated arrival: <strong>2–3 business days</strong>.",
                "delivered"  =>
                    $"Your order <strong>#{orderNumber}</strong> has been delivered! 🎉 We hope you love your purchase. Don't forget to leave a review!",
                _            =>
                    $"There's an update on your order <strong>#{orderNumber}</strong>. Please check the details below."
            };
    }
}
*/


using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Sends rich HTML transactional emails for order lifecycle events via Brevo API.
    /// Brevo (formerly Sendinblue) — 300 emails/day free, no domain required,
    /// sends to any email address.
    /// </summary>
    public class MongoOrderEmailService : IMongoOrderEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<MongoOrderEmailService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        // Brand constants
        private const string BrandName    = "ShopAI";
        private const string SupportEmail = "support@shopai.com";
        private const string PrimaryColor = "#0f766e";
        private const string AccentColor  = "#14b8a6";
        private const string DarkColor    = "#134e4a";

        // Brevo transactional email API endpoint
        private const string BrevoApiUrl = "https://api.brevo.com/v3/smtp/email";

        public MongoOrderEmailService(
            IConfiguration configuration,
            ILogger<MongoOrderEmailService> logger,
            IHttpClientFactory httpClientFactory)
        {
            _configuration     = configuration;
            _logger            = logger;
            _httpClientFactory = httpClientFactory;
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PUBLIC METHODS
        // ─────────────────────────────────────────────────────────────────────────

        public async Task<bool> SendOrderConfirmationAsync(
            string toEmail, string customerName, OrderDto order)
        {
            try
            {
                _logger.LogInformation(
                    "📧 Sending order confirmation to {Email} for order {OrderNumber}",
                    toEmail, order.OrderNumber);

                var subject = $"🎉 Order Confirmed! #{order.OrderNumber} — {BrandName}";
                var body    = BuildOrderConfirmationHtml(customerName, order);
                var sent    = await SendEmailAsync(toEmail, subject, body);

                if (sent) _logger.LogInformation("✅ Confirmation email sent to {Email}", toEmail);
                else      _logger.LogWarning("⚠️ Failed to send confirmation email to {Email}", toEmail);

                return sent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error sending confirmation email to {Email}", toEmail);
                return false;
            }
        }

        public async Task<bool> SendOrderCancellationAsync(
            string toEmail, string customerName, OrderDto order)
        {
            try
            {
                _logger.LogInformation(
                    "📧 Sending cancellation email to {Email} for order {OrderNumber}",
                    toEmail, order.OrderNumber);

                var subject = $"❌ Order Cancelled — #{order.OrderNumber} | {BrandName}";
                var body    = BuildOrderCancellationHtml(customerName, order);
                return await SendEmailAsync(toEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error sending cancellation email to {Email}", toEmail);
                return false;
            }
        }

        public async Task<bool> SendOrderStatusUpdateAsync(
            string toEmail, string customerName, OrderDto order, string previousStatus)
        {
            try
            {
                _logger.LogInformation(
                    "📧 Sending status update to {Email}, order {OrderNumber}: {Prev} → {New}",
                    toEmail, order.OrderNumber, previousStatus, order.Status);

                var (emoji, label) = GetStatusMeta(order.Status);
                var subject = $"{emoji} Order {label} — #{order.OrderNumber} | {BrandName}";
                var body    = BuildOrderStatusUpdateHtml(customerName, order, previousStatus);
                return await SendEmailAsync(toEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error sending status update email to {Email}", toEmail);
                return false;
            }
        }

        /// <summary>
        /// Send detailed invoice email when order is delivered
        /// </summary>
        public async Task<bool> SendInvoiceAsync(
          string toEmail, string customerName, OrderDto order, string invoiceHtml, byte[] invoicePdfBytes)
        {
            try
            {
                _logger.LogInformation(
                    "📧 Sending invoice email to {Email} for order {OrderNumber}",
                    toEmail, order.OrderNumber);

                var subject = $"📄 Order Invoice — #{order.OrderNumber} | {BrandName}";

                // Wrap invoice HTML in email template
                var body = $@"<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1.0'/>
  <title>Invoice — {BrandName}</title>
</head>
<body style='margin:0;padding:0;background:#f9fafb;font-family:""Segoe UI"",Arial,sans-serif;'>

<!-- Email Wrapper -->
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f9fafb;padding:20px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0'
       style='background:#ffffff;border-radius:12px;overflow:hidden;
              box-shadow:0 4px 20px rgba(0,0,0,0.1);max-width:600px;width:100%;'>

  <!-- Header -->
  <tr>
    <td style='background:linear-gradient(135deg,{AccentColor} 0%,#0891b2 100%);
               padding:36px 32px;text-align:center;'>
      <div style='font-size:36px;margin-bottom:8px;'>📄</div>
      <h1 style='margin:0 0 4px;color:#fff;font-size:24px;font-weight:800;'>{BrandName}</h1>
      <p style='margin:0;color:#ccfbf1;font-size:12px;letter-spacing:1px;
                text-transform:uppercase;font-weight:600;'>Invoice Document</p>
    </td>
  </tr>

  <!-- Invoice badge -->
  <tr>
    <td style='padding:0;text-align:center;background:#ffffff;'>
      <div style='display:inline-block;margin-top:-20px;background:#fff;
                  border-radius:50px;padding:8px 24px;
                  box-shadow:0 4px 16px rgba(20,184,166,0.15);
                  border:2px solid #ccfbf1;'>
        <span style='color:{PrimaryColor};font-weight:800;font-size:13px;
                     letter-spacing:0.5px;'>✅ ORDER DELIVERED</span>
      </div>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style='padding:24px 32px 0;'>
      <h2 style='margin:0 0 8px;font-size:18px;color:#1f2937;font-weight:800;'>
        Invoice for your order, {customerName.Split(' ')[0]}!</h2>
      <p style='margin:0;color:#6b7280;font-size:14px;line-height:1.6;'>
        Your order #{order.OrderNumber} has been delivered! Here's your complete invoice for your records.
      </p>
    </td>
  </tr>

  <!-- Invoice content (embedded invoice HTML) -->
  <tr>
    <td style='padding:24px 32px;'>
      {invoiceHtml}
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style='background:#f9fafb;padding:24px 32px;text-align:center;
               border-top:1.5px solid #e5e7eb;'>
      <p style='margin:0 0 8px;font-size:12px;color:#6b7280;'>
        Thank you for shopping with <strong style='color:{PrimaryColor};'>{BrandName}</strong>!</p>
      <p style='margin:0;font-size:11px;color:#9ca3af;'>
        For support, contact <a href='mailto:{SupportEmail}'
        style='color:{AccentColor};font-weight:700;text-decoration:none;'>{SupportEmail}</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>";

                var attachments = invoicePdfBytes != null && invoicePdfBytes.Length > 0
                  ? new[]
                  {
                    new
                    {
                      name = $"Invoice-{order.OrderNumber}.pdf",
                      content = Convert.ToBase64String(invoicePdfBytes)
                    }
                  }
                  : null;

                var sent = await SendEmailAsync(toEmail, subject, body, attachments);
                if (sent)
                    _logger.LogInformation("✅ Invoice email sent to {Email}", toEmail);
                else
                    _logger.LogWarning("⚠️ Failed to send invoice email to {Email}", toEmail);

                return sent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error sending invoice email to {Email}", toEmail);
                return false;
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // BREVO HTTP API SENDER
        // Key difference from Resend:
        //   - Header: "api-key" instead of "Authorization: Bearer"
        //   - Payload: { sender, to, subject, htmlContent }
        //   - No domain required — sends to any email on free tier
        // ─────────────────────────────────────────────────────────────────────────

        private async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, object[] attachments = null)
        {
            try
            {
                var apiKey    = _configuration["Brevo:ApiKey"];
                var fromEmail = _configuration["EmailSettings:FromEmail"] ?? "sivini.lawhouse@gmail.com";
                var fromName  = _configuration["EmailSettings:FromName"]  ?? BrandName;

                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    _logger.LogError("❌ Brevo:ApiKey is not configured in appsettings or env vars");
                    return false;
                }

                // Brevo API payload
                var payload = new
                {
                    sender      = new { name = fromName, email = fromEmail },
                    to          = new[] { new { email = toEmail } },
                    subject     = subject,
                  htmlContent = htmlBody,
                  attachments = attachments
                };

                var client  = _httpClientFactory.CreateClient();
                var json    = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                // Brevo uses "api-key" header — NOT "Authorization: Bearer"
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("api-key", apiKey);
                client.DefaultRequestHeaders.Accept.Add(
                    new MediaTypeWithQualityHeaderValue("application/json"));

                var response = await client.PostAsync(BrevoApiUrl, content);
                var respBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("✅ Brevo API success for {Email}", toEmail);
                    return true;
                }

                _logger.LogError("❌ Brevo API error {StatusCode} for {Email}: {Body}",
                    response.StatusCode, toEmail, respBody);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Brevo HTTP call failed for {Email}", toEmail);
                return false;
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // HTML BUILDERS — all original templates unchanged
        // ─────────────────────────────────────────────────────────────────────────

        private string BuildOrderConfirmationHtml(string customerName, OrderDto order)
        {
            var itemsHtml = BuildItemsTableHtml(order);
            var timeline  = BuildTimelineHtml("confirmed");
            var firstName = customerName.Split(' ')[0];

            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1.0'/>
  <title>Order Confirmed — {BrandName}</title>
</head>
<body style='margin:0;padding:0;background:#f0fdfa;font-family:""Segoe UI"",Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0fdfa;padding:40px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0'
       style='background:#ffffff;border-radius:20px;overflow:hidden;
              box-shadow:0 8px 40px rgba(20,184,166,0.13);max-width:600px;width:100%;'>
  <tr>
    <td style='background:linear-gradient(135deg,{AccentColor} 0%,#0891b2 100%);
               padding:44px 40px 36px;text-align:center;'>
      <div style='font-size:40px;margin-bottom:8px;'>🛍️</div>
      <h1 style='margin:0 0 4px;color:#fff;font-size:26px;font-weight:800;'>{BrandName}</h1>
      <p style='margin:0;color:#ccfbf1;font-size:13px;letter-spacing:1px;
                text-transform:uppercase;font-weight:600;'>Your Smart Shopping Companion</p>
    </td>
  </tr>
  <tr>
    <td style='padding:0;text-align:center;background:#ffffff;'>
      <div style='display:inline-block;margin-top:-22px;background:#fff;border-radius:50px;
                  padding:10px 28px;box-shadow:0 4px 20px rgba(20,184,166,0.2);
                  border:2px solid #ccfbf1;'>
        <span style='color:{PrimaryColor};font-weight:800;font-size:14px;'>✅ ORDER CONFIRMED</span>
      </div>
    </td>
  </tr>
  <tr>
    <td style='padding:36px 40px 0;'>
      <h2 style='margin:0 0 12px;font-size:24px;color:{DarkColor};font-weight:800;'>
        Hey {firstName}! 🎉</h2>
      <p style='margin:0;color:#6b7280;font-size:15px;line-height:1.7;'>
        Your order has been placed successfully and is now being processed.
        Thank you for shopping with <strong style='color:{PrimaryColor};'>{BrandName}</strong>!
      </p>
    </td>
  </tr>
  <tr>
    <td style='padding:28px 40px 0;'>
      <table width='100%' cellpadding='0' cellspacing='0'
             style='background:linear-gradient(135deg,#f0fdfa,#ecfeff);
                    border-radius:16px;border:1.5px solid #99f6e4;'>
        <tr><td style='padding:22px 28px;'>
          <table width='100%' cellpadding='0' cellspacing='0'>
            <tr>
              <td style='width:50%;vertical-align:top;padding-bottom:16px;'>
                <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;
                           letter-spacing:1.5px;font-weight:700;'>Order Number</p>
                <p style='margin:0;font-size:17px;color:{DarkColor};font-weight:800;
                           font-family:""Courier New"",monospace;'>#{order.OrderNumber}</p>
              </td>
              <td style='width:50%;vertical-align:top;padding-bottom:16px;text-align:right;'>
                <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;
                           letter-spacing:1.5px;font-weight:700;'>Order Date</p>
                <p style='margin:0;font-size:15px;color:{DarkColor};font-weight:700;'>
                  {order.CreatedAt:dd MMM yyyy}</p>
              </td>
            </tr>
            <tr>
              <td style='width:50%;vertical-align:top;'>
                <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;
                           letter-spacing:1.5px;font-weight:700;'>Status</p>
                <span style='display:inline-block;background:#dcfce7;color:#166534;font-size:12px;
                              font-weight:800;padding:4px 12px;border-radius:20px;'>
                  ● {order.Status?.ToUpper()}</span>
              </td>
              <td style='width:50%;vertical-align:top;text-align:right;'>
                <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;
                           letter-spacing:1.5px;font-weight:700;'>Total Amount</p>
                <p style='margin:0;font-size:22px;color:{PrimaryColor};font-weight:900;'>
                  ₹{order.TotalAmount:N2}</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td>
  </tr>
  <tr><td style='padding:28px 40px 0;'>
    <h3 style='margin:0 0 18px;font-size:15px;color:{DarkColor};font-weight:800;
               text-transform:uppercase;'>Order Journey</h3>
    {timeline}
  </td></tr>
  <tr><td style='padding:28px 40px 0;'>
    <h3 style='margin:0 0 16px;font-size:15px;color:{DarkColor};font-weight:800;
               text-transform:uppercase;'>Items Ordered</h3>
    {itemsHtml}
  </td></tr>
  <tr><td style='padding:0 40px;'>
    <table width='100%' cellpadding='0' cellspacing='0'>
      <tr><td style='padding:16px 0;border-top:1.5px dashed #e5e7eb;'>
        <table width='100%' cellpadding='0' cellspacing='0'>
          <tr>
            <td style='color:#9ca3af;font-size:13px;font-weight:600;'>Subtotal</td>
            <td align='right' style='color:#374151;font-size:13px;font-weight:700;'>
              ₹{order.TotalAmount:N2}</td>
          </tr>
          <tr>
            <td style='color:#9ca3af;font-size:13px;font-weight:600;padding-top:8px;'>Shipping</td>
            <td align='right' style='color:#059669;font-size:13px;font-weight:800;padding-top:8px;'>
              FREE 🎁</td>
          </tr>
          <tr>
            <td style='color:{DarkColor};font-size:16px;font-weight:900;padding-top:14px;
                        border-top:2px solid #f0fdfa;'>Total Paid</td>
            <td align='right' style='color:{PrimaryColor};font-size:22px;font-weight:900;
                                      padding-top:14px;border-top:2px solid #f0fdfa;'>
              ₹{order.TotalAmount:N2}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style='padding:28px 40px 0;'>
    <table width='100%' cellpadding='0' cellspacing='0'
           style='background:#fef9c3;border-left:4px solid #eab308;border-radius:12px;'>
      <tr><td style='padding:20px 22px;'>
        <p style='margin:0 0 6px;font-size:14px;font-weight:800;color:#854d0e;'>
          📦 What happens next?</p>
        <p style='margin:0;font-size:13px;color:#92400e;line-height:1.7;'>
          Our team is now picking and packing your items. You'll receive another email once
          shipped. Estimated delivery: <strong>3–5 business days</strong>.
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style='padding:24px 40px;text-align:center;'>
    <p style='margin:0 0 8px;font-size:13px;color:#6b7280;'>Questions about your order?</p>
    <a href='mailto:{SupportEmail}'
       style='color:{AccentColor};font-weight:800;font-size:14px;text-decoration:none;'>
      📬 {SupportEmail}</a>
  </td></tr>
  <tr><td style='background:#f8fafc;padding:28px 40px;text-align:center;
                 border-top:1.5px solid #f0f0f0;'>
    <p style='margin:0 0 6px;font-size:13px;color:#6b7280;'>
      © {DateTime.UtcNow.Year} <strong style='color:{PrimaryColor};'>{BrandName}</strong>.
      All rights reserved.</p>
    <p style='margin:0;font-size:11px;color:#9ca3af;'>
      This is an automated message — please do not reply directly.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>";
        }

        private string BuildOrderCancellationHtml(string customerName, OrderDto order)
        {
            var itemsHtml = BuildItemsTableHtml(order);
            var firstName = customerName.Split(' ')[0];

            return $@"<!DOCTYPE html>
<html lang='en'>
<head><meta charset='UTF-8'/><title>Order Cancelled — {BrandName}</title></head>
<body style='margin:0;padding:0;background:#fff1f2;font-family:""Segoe UI"",Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#fff1f2;padding:40px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0'
       style='background:#ffffff;border-radius:20px;overflow:hidden;
              box-shadow:0 8px 40px rgba(244,63,94,0.12);max-width:600px;width:100%;'>
  <tr>
    <td style='background:linear-gradient(135deg,#f43f5e,#e11d48);
               padding:44px 40px 36px;text-align:center;'>
      <div style='font-size:40px;margin-bottom:8px;'>🛍️</div>
      <h1 style='margin:0 0 4px;color:#fff;font-size:26px;font-weight:800;'>{BrandName}</h1>
      <p style='margin:0;color:#fecdd3;font-size:13px;letter-spacing:1px;
                text-transform:uppercase;font-weight:600;'>Order Update</p>
    </td>
  </tr>
  <tr>
    <td style='padding:0;text-align:center;background:#ffffff;'>
      <div style='display:inline-block;margin-top:-22px;background:#fff;border-radius:50px;
                  padding:10px 28px;box-shadow:0 4px 20px rgba(244,63,94,0.18);
                  border:2px solid #fecdd3;'>
        <span style='color:#e11d48;font-weight:800;font-size:14px;'>❌ ORDER CANCELLED</span>
      </div>
    </td>
  </tr>
  <tr>
    <td style='padding:36px 40px 0;'>
      <h2 style='margin:0 0 12px;font-size:22px;color:#1f2937;font-weight:800;'>
        Hi {firstName},</h2>
      <p style='margin:0;color:#6b7280;font-size:15px;line-height:1.7;'>
        Your order <strong style='color:#e11d48;'>#{order.OrderNumber}</strong> has been cancelled.
        If a payment was made, it will be refunded within <strong>5–7 business days</strong>.
      </p>
    </td>
  </tr>
  <tr><td style='padding:28px 40px 0;'>
    <h3 style='margin:0 0 16px;font-size:15px;color:#1f2937;font-weight:800;
               text-transform:uppercase;'>Cancelled Items</h3>
    {itemsHtml}
  </td></tr>
  <tr><td style='padding:28px 40px 0;'>
    <table width='100%' cellpadding='0' cellspacing='0'
           style='background:#f0fdf4;border-left:4px solid #22c55e;border-radius:12px;'>
      <tr><td style='padding:20px 22px;'>
        <p style='margin:0 0 6px;font-size:14px;font-weight:800;color:#14532d;'>
          💚 Refund Information</p>
        <p style='margin:0;font-size:13px;color:#166534;line-height:1.7;'>
          Your refund of <strong>₹{order.TotalAmount:N2}</strong> will be credited within
          5–7 business days. Contact
          <a href='mailto:{SupportEmail}' style='color:#15803d;font-weight:700;'>
            {SupportEmail}</a> for queries.
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style='background:#f8fafc;padding:32px 40px;text-align:center;
                 border-top:1.5px solid #f0f0f0;'>
    <p style='margin:0 0 6px;font-size:13px;color:#6b7280;'>
      © {DateTime.UtcNow.Year} <strong style='color:{PrimaryColor};'>{BrandName}</strong>.
      All rights reserved.</p>
    <p style='margin:0;font-size:11px;color:#9ca3af;'>
      This is an automated message — please do not reply directly.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>";
        }

        private string BuildOrderStatusUpdateHtml(
            string customerName, OrderDto order, string previousStatus)
        {
            var (emoji, label)               = GetStatusMeta(order.Status);
            var (_, _, badgeBg, badgeFg)     = GetStatusColors(order.Status);
            var firstName                    = customerName.Split(' ')[0];
            var timeline                     = BuildTimelineHtml(order.Status?.ToLower() ?? "pending");
            var statusMessage                = GetStatusMessage(order.Status, order.OrderNumber);

            return $@"<!DOCTYPE html>
<html lang='en'>
<head><meta charset='UTF-8'/><title>Order {label} — {BrandName}</title></head>
<body style='margin:0;padding:0;background:#f8fafc;font-family:""Segoe UI"",Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;padding:40px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0'
       style='background:#ffffff;border-radius:20px;overflow:hidden;
              box-shadow:0 8px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;'>
  <tr>
    <td style='background:linear-gradient(135deg,{AccentColor} 0%,#0891b2 100%);
               padding:44px 40px 36px;text-align:center;'>
      <div style='font-size:40px;margin-bottom:8px;'>🛍️</div>
      <h1 style='margin:0 0 4px;color:#fff;font-size:26px;font-weight:800;'>{BrandName}</h1>
      <p style='margin:0;color:#ccfbf1;font-size:13px;letter-spacing:1px;
                text-transform:uppercase;font-weight:600;'>Order Update</p>
    </td>
  </tr>
  <tr>
    <td style='padding:0;text-align:center;background:#ffffff;'>
      <div style='display:inline-block;margin-top:-22px;background:#fff;border-radius:50px;
                  padding:10px 28px;box-shadow:0 4px 20px rgba(20,184,166,0.18);
                  border:2px solid #ccfbf1;'>
        <span style='color:{PrimaryColor};font-weight:800;font-size:14px;'>
          {emoji} ORDER {label.ToUpper()}</span>
      </div>
    </td>
  </tr>
  <tr>
    <td style='padding:36px 40px 0;'>
      <h2 style='margin:0 0 12px;font-size:22px;color:{DarkColor};font-weight:800;'>
        Hi {firstName}!</h2>
      <p style='margin:0;color:#6b7280;font-size:15px;line-height:1.7;'>{statusMessage}</p>
    </td>
  </tr>
  <tr><td style='padding:28px 40px 0;'>
    <table width='100%' cellpadding='0' cellspacing='0'
           style='background:linear-gradient(135deg,#f0fdfa,#ecfeff);
                  border-radius:16px;border:1.5px solid #99f6e4;'>
      <tr><td style='padding:22px 28px;'>
        <table width='100%' cellpadding='0' cellspacing='0'>
          <tr>
            <td>
              <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;
                         letter-spacing:1.5px;font-weight:700;'>Order Number</p>
              <p style='margin:0;font-size:17px;color:{DarkColor};font-weight:800;
                         font-family:""Courier New"",monospace;'>#{order.OrderNumber}</p>
            </td>
            <td align='right'>
              <p style='margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;
                         letter-spacing:1.5px;font-weight:700;'>Total</p>
              <p style='margin:0;font-size:20px;color:{PrimaryColor};font-weight:900;'>
                ₹{order.TotalAmount:N2}</p>
            </td>
          </tr>
          <tr><td colspan='2' style='padding-top:14px;'>
            <span style='background:{badgeBg};color:{badgeFg};font-size:12px;font-weight:800;
                          padding:4px 14px;border-radius:20px;'>
              {emoji} {order.Status?.ToUpper()}</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style='padding:28px 40px 0;'>
    <h3 style='margin:0 0 18px;font-size:15px;color:{DarkColor};font-weight:800;
               text-transform:uppercase;'>Order Journey</h3>
    {timeline}
  </td></tr>
  <tr><td style='padding:28px 40px;text-align:center;'>
    <p style='margin:0 0 8px;font-size:13px;color:#6b7280;'>Need help? We're here for you.</p>
    <a href='mailto:{SupportEmail}'
       style='color:{AccentColor};font-weight:800;font-size:14px;text-decoration:none;'>
      📬 {SupportEmail}</a>
  </td></tr>
  <tr><td style='background:#f8fafc;padding:28px 40px;text-align:center;
                 border-top:1.5px solid #f0f0f0;'>
    <p style='margin:0 0 6px;font-size:13px;color:#6b7280;'>
      © {DateTime.UtcNow.Year} <strong style='color:{PrimaryColor};'>{BrandName}</strong>.
      All rights reserved.</p>
    <p style='margin:0;font-size:11px;color:#9ca3af;'>
      This is an automated message — please do not reply directly.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>";
        }

        // ─────────────────────────────────────────────────────────────────────────
        // COMPONENT BUILDERS — unchanged from original
        // ─────────────────────────────────────────────────────────────────────────

        private string BuildItemsTableHtml(OrderDto order)
        {
            if (order.Items == null || !order.Items.Any())
                return "<p style='color:#9ca3af;font-size:13px;'>No items found.</p>";

            var sb = new System.Text.StringBuilder();
            sb.Append($@"<table width='100%' cellpadding='0' cellspacing='0'
       style='border-radius:12px;overflow:hidden;border:1.5px solid #f0fdfa;'>
  <tr style='background:{AccentColor};'>
    <td style='padding:12px 16px;color:#fff;font-size:11px;font-weight:800;
               text-transform:uppercase;letter-spacing:1px;'>Product</td>
    <td style='padding:12px 16px;color:#fff;font-size:11px;font-weight:800;
               text-transform:uppercase;letter-spacing:1px;text-align:center;'>Qty</td>
    <td style='padding:12px 16px;color:#fff;font-size:11px;font-weight:800;
               text-transform:uppercase;letter-spacing:1px;text-align:right;'>Price</td>
    <td style='padding:12px 16px;color:#fff;font-size:11px;font-weight:800;
               text-transform:uppercase;letter-spacing:1px;text-align:right;'>Total</td>
  </tr>");

            var rowBg = new[] { "#ffffff", "#f0fdfa" };
            var idx   = 0;
            foreach (var item in order.Items)
            {
                var bg        = rowBg[idx % 2];
                var itemTotal = item.Price * item.Quantity;
                idx++;
                sb.Append($@"
  <tr style='background:{bg};'>
    <td style='padding:14px 16px;color:#1f2937;font-size:14px;font-weight:700;
               border-bottom:1px solid #f0fdfa;'>
      {System.Web.HttpUtility.HtmlEncode(item.ProductName)}</td>
    <td style='padding:14px 16px;color:#6b7280;font-size:14px;font-weight:600;
               text-align:center;border-bottom:1px solid #f0fdfa;'>× {item.Quantity}</td>
    <td style='padding:14px 16px;color:#6b7280;font-size:14px;font-weight:600;
               text-align:right;border-bottom:1px solid #f0fdfa;'>₹{item.Price:N2}</td>
    <td style='padding:14px 16px;color:{PrimaryColor};font-size:14px;font-weight:800;
               text-align:right;border-bottom:1px solid #f0fdfa;'>₹{itemTotal:N2}</td>
  </tr>");
            }
            sb.Append("</table>");
            return sb.ToString();
        }

        private string BuildTimelineHtml(string currentStatus)
        {
            var steps = new[]
            {
                ("confirmed",  "🛒", "Order Confirmed", "We've received your order"),
                ("processing", "⚙️", "Processing",       "Packing your items"),
                ("shipped",    "🚚", "Shipped",           "On the way to you"),
                ("delivered",  "🎉", "Delivered",         "Enjoy your purchase!")
            };
            var order      = new[] { "confirmed", "processing", "shipped", "delivered" };
            var currentIdx = Array.IndexOf(order, currentStatus.ToLower());
            var sb         = new System.Text.StringBuilder();

            sb.Append("<table width='100%' cellpadding='0' cellspacing='0'><tr>");
            for (int i = 0; i < steps.Length; i++)
            {
                var (key, icon, title, sub) = steps[i];
                var done      = i <= currentIdx;
                var active    = i == currentIdx;
                var circleBg  = active ? AccentColor : done ? PrimaryColor : "#e5e7eb";
                var textColor = done ? DarkColor : "#9ca3af";

                sb.Append($@"
  <td style='text-align:center;vertical-align:top;padding:0 4px;'>
    <div style='width:40px;height:40px;border-radius:50%;background:{circleBg};
                color:#fff;font-size:18px;line-height:40px;margin:0 auto 8px;'>{icon}</div>
    <p style='margin:0 0 2px;font-size:12px;font-weight:800;color:{textColor};'>{title}</p>
    <p style='margin:0;font-size:10px;color:#9ca3af;'>{sub}</p>
  </td>");

                if (i < steps.Length - 1)
                {
                    var lineColor = i < currentIdx ? AccentColor : "#e5e7eb";
                    sb.Append($@"<td style='vertical-align:top;padding-top:20px;'>
    <div style='height:2px;background:{lineColor};border-radius:2px;'></div>
  </td>");
                }
            }
            sb.Append("</tr></table>");
            return sb.ToString();
        }

        private static (string emoji, string label) GetStatusMeta(string? status) =>
            (status?.ToLower()) switch
            {
                "processing" => ("⚙️", "Processing"),
                "shipped"    => ("🚚", "Shipped"),
                "delivered"  => ("🎉", "Delivered"),
                "cancelled"  => ("❌", "Cancelled"),
                _            => ("✅", "Confirmed")
            };

        private static (string bg, string fg, string badgeBg, string badgeFg)
            GetStatusColors(string? status) =>
            (status?.ToLower()) switch
            {
                "processing" => ("#eff6ff", "#1e3a8a", "#dbeafe", "#1e40af"),
                "shipped"    => ("#f0fdf4", "#14532d", "#dcfce7", "#166534"),
                "delivered"  => ("#fef9c3", "#713f12", "#fef08a", "#854d0e"),
                "cancelled"  => ("#fff1f2", "#881337", "#fee2e2", "#991b1b"),
                _            => ("#f0fdfa", "#134e4a", "#ccfbf1", "#0f766e")
            };

        private static string GetStatusMessage(string? status, string orderNumber) =>
            (status?.ToLower()) switch
            {
                "processing" =>
                    $"Great news! Your order <strong>#{orderNumber}</strong> is now being processed and packed.",
                "shipped"    =>
                    $"Your order <strong>#{orderNumber}</strong> has been shipped! 🚀 Estimated arrival: <strong>2–3 business days</strong>.",
                "delivered"  =>
                    $"Your order <strong>#{orderNumber}</strong> has been delivered! 🎉 We hope you love your purchase.",
                _            =>
                    $"There's an update on your order <strong>#{orderNumber}</strong>. Please check the details below."
            };
    }
}
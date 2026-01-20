namespace ECommerceAPI.Application.DTOs.Payment
{
    /*public class PaymentInitiationDto
    {
        public string PaymentUrl { get; set; }
        public string TransactionId { get; set; }
        public decimal Amount { get; set; }
    }*/
        public class PaymentInitiationDto
            {
                public string RazorpayOrderId { get; set; }
                public string RazorpayKeyId { get; set; }
                public decimal Amount { get; set; }
                public string Currency { get; set; }
                public string OrderId { get; set; }
                public string CustomerName { get; set; }
                public string CustomerEmail { get; set; }
                public string CustomerContact { get; set; }
            }
}

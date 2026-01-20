namespace ECommerceAPI.Application.DTOs.Payment
{
    public class PaymentCallbackDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int OrderId { get; set; }
    }
}
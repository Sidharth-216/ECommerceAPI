namespace ECommerceAPI.Application.DTOs.Payment
{
    /*public class PaymentVerificationDto
    {
        public string TransactionId { get; set; }
        public string Status { get; set; }
        public string Signature { get; set; }
    }*/
    public class PaymentVerificationDto
    {
        public string RazorpayOrderId { get; set; }
        public string RazorpayPaymentId { get; set; }
        public string RazorpaySignature { get; set; }
        public int OrderId { get; set; }
    }
}

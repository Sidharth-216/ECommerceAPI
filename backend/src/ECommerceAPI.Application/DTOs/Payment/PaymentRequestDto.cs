namespace ECommerceAPI.Application.DTOs.Payment
{
    /*public class PaymentRequestDto
    {
        public int OrderId { get; set; }
    }*/
    public class PaymentRequestDto
        {
            public int OrderId { get; set; }
            public string PaymentMethod { get; set; } // "COD" or "Online"
        }

}

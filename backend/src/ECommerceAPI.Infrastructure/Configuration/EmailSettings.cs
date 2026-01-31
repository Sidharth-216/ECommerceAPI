namespace ECommerceAPI.Infrastructure.Configuration
{
    /// <summary>
    /// Email Configuration Settings
    /// </summary>
    public class EmailSettings
    {
        public string SmtpHost { get; set; }
        public string SmtpPort { get; set; }
        public string SmtpUsername { get; set; }
        public string SmtpPassword { get; set; }
        public string FromEmail { get; set; }
        public string FromName { get; set; }
        public string EnableSsl { get; set; }
    }
}
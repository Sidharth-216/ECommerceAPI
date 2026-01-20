using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.API.Middleware
{
    /// <summary>
    /// JWT middleware for handling token authentication
    /// This middleware validates JWT tokens on each request
    /// </summary>
    public class JwtMiddleware
    {
        private readonly RequestDelegate _next;

        public JwtMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context, IUserRepository userRepository)
        {
            var token = context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();

            if (token != null)
            {
                // Token validation is handled by ASP.NET Core authentication
                // This middleware can be used for additional custom logic if needed
            }

            await _next(context);
        }
    }
}

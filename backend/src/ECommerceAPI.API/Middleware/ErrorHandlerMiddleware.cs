using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace ECommerceAPI.API.Middleware
{
    /// <summary>
    /// Global error handling middleware
    /// Catches all unhandled exceptions and returns proper error responses
    /// </summary>
    public class ErrorHandlerMiddleware
    {
        private readonly RequestDelegate _next;

        public ErrorHandlerMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception error)
            {
                var response = context.Response;
                response.ContentType = "application/json";

                switch (error)
                {
                    case KeyNotFoundException e:
                        // Not found error
                        response.StatusCode = (int)HttpStatusCode.NotFound;
                        break;
                    case UnauthorizedAccessException e:
                        // Unauthorized error
                        response.StatusCode = (int)HttpStatusCode.Unauthorized;
                        break;
                    case InvalidOperationException e:
                        // Bad request error
                        response.StatusCode = (int)HttpStatusCode.BadRequest;
                        break;
                    default:
                        // Internal server error
                        response.StatusCode = (int)HttpStatusCode.InternalServerError;
                        break;
                }

                var result = JsonSerializer.Serialize(new
                {
                    message = error?.Message,
                    statusCode = response.StatusCode
                });

                await response.WriteAsync(result);
            }
        }
    }
}

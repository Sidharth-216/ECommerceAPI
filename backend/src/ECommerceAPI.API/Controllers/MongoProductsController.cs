using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Products;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/mongo/products")]
    public class MongoProductsController : ControllerBase
    {
        private readonly IProductMongoService _service;

        public MongoProductsController(IProductMongoService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
            => Ok(await _service.GetByIdAsync(id));

        [HttpPost]
        public async Task<IActionResult> Create(ProductCreateDto dto)
            => Ok(await _service.CreateAsync(dto));

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, ProductCreateDto dto)
            => Ok(await _service.UpdateAsync(id, dto));

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
            => Ok(await _service.DeleteAsync(id));

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] ProductSearchDto dto)
            => Ok(await _service.SearchAsync(dto));

        [HttpGet("suggest")]
        public async Task<IActionResult> Suggest([FromQuery] string q)
            => Ok(await _service.SuggestAsync(q));
    }
}

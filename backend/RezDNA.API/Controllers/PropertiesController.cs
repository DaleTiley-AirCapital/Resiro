using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RezDNA.API.Services;
using RezDNA.Models.DTOs;

namespace RezDNA.API.Controllers;

[ApiController]
[Route("api/properties")]
[Authorize]
public class PropertiesController : ControllerBase
{
    private readonly IPropertyService _propertyService;

    public PropertiesController(IPropertyService propertyService)
    {
        _propertyService = propertyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProperties()
    {
        try
        {
            var orgIdClaim = User.FindFirst("orgId")?.Value;
            if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                return BadRequest(new { error = "Invalid organization ID" });
            }

            var properties = await _propertyService.GetPropertiesByOrgAsync(orgId);
            return Ok(properties);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch properties", details = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProperty(Guid id)
    {
        try
        {
            var orgIdClaim = User.FindFirst("orgId")?.Value;
            if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                return BadRequest(new { error = "Invalid organization ID" });
            }

            var property = await _propertyService.GetPropertyAsync(id, orgId);
            if (property == null)
            {
                return NotFound(new { error = "Property not found" });
            }

            return Ok(property);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch property", details = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateProperty([FromBody] CreatePropertyRequest request)
    {
        try
        {
            var orgIdClaim = User.FindFirst("orgId")?.Value;
            if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                return BadRequest(new { error = "Invalid organization ID" });
            }

            var property = await _propertyService.CreatePropertyAsync(request, orgId);
            return CreatedAtAction(nameof(GetProperty), new { id = property.Id }, property);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to create property", details = ex.Message });
        }
    }
}
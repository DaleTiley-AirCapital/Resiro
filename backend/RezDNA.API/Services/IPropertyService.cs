using RezDNA.Models.DTOs;

namespace RezDNA.API.Services;

public interface IPropertyService
{
    Task<IEnumerable<PropertyDTO>> GetPropertiesByOrgAsync(Guid orgId);
    Task<PropertyDTO?> GetPropertyAsync(Guid id, Guid orgId);
    Task<PropertyDTO> CreatePropertyAsync(CreatePropertyRequest request, Guid orgId);
}
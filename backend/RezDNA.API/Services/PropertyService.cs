using RezDNA.API.Services;
using RezDNA.Data.Repositories;
using RezDNA.Data.Services;
using RezDNA.Models.DTOs;
using RezDNA.Models.Entities;

namespace RezDNA.API.Services;

public class PropertyService : IPropertyService
{
    private readonly IRepository<Property> _propertyRepository;
    private readonly IDnaIdGenerator _dnaIdGenerator;
    private readonly IRepository<Document> _documents;

    public PropertyService(IRepository<Property> propertyRepository, IDnaIdGenerator dnaIdGenerator, IRepository<Document> documents)
    {
        _propertyRepository = propertyRepository;
        _dnaIdGenerator = dnaIdGenerator;
        _documents = documents;
    }

    public async Task<IEnumerable<PropertyDTO>> GetPropertiesByOrgAsync(Guid orgId)
    {
        var properties = await _propertyRepository.FindAsync(p => p.OrgId == orgId);
        var counts = (await _documents.FindAsync(d => d.OrgId == orgId && d.PropertyId != null))
            .GroupBy(d => d.PropertyId!.Value).ToDictionary(g => g.Key, g => g.Count());
        return properties.Select(p => { var dto = MapToDTO(p); dto.DocumentsCount = counts.GetValueOrDefault(p.Id); return dto; });
    }

    public async Task<PropertyDTO?> GetPropertyAsync(Guid id, Guid orgId)
    {
        var property = await _propertyRepository.FirstOrDefaultAsync(p => p.Id == id && p.OrgId == orgId);
        return property != null ? MapToDTO(property) : null;
    }

    public async Task<PropertyDTO> CreatePropertyAsync(CreatePropertyRequest request, Guid orgId)
    {
        var dnaId = _dnaIdGenerator.GenerateDnaId(
            request.Country,
            request.Municipality,
            request.ParcelId,
            request.Unit,
            request.DeedNumber
        );

        var property = new Property
        {
            OrgId = orgId,
            DnaId = dnaId,
            Name = request.Name,
            Description = request.Description,
            PropertyType = request.PropertyType,
            Address = request.Address,
            City = request.City,
            Province = request.Province,
            PostalCode = request.PostalCode,
            Country = request.Country,
            ParcelId = request.ParcelId,
            Unit = request.Unit,
            DeedNumber = request.DeedNumber,
            Municipality = request.Municipality,
            Township = request.Township
        };

        await _propertyRepository.AddAsync(property);
        await _propertyRepository.SaveChangesAsync();

        return MapToDTO(property);
    }

    private static PropertyDTO MapToDTO(Property property)
    {
        return new PropertyDTO
        {
            Id = property.Id,
            DnaId = property.DnaId,
            ErfNumber = property.ParcelId,
            Township = property.Township,
            Municipality = property.Municipality,
            Name = property.Name,
            Description = property.Description,
            PropertyType = property.PropertyType,
            Address = property.Address,
            City = property.City,
            Province = property.Province,
            PostalCode = property.PostalCode,
            Country = property.Country,
            CreatedAt = property.CreatedAt,
            UpdatedAt = property.UpdatedAt
        };
    }
}
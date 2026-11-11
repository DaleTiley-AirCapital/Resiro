using RezDNA.Models.Enums;

namespace RezDNA.Models.DTOs;

public class CreatePropertyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PropertyType? PropertyType { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? ParcelId { get; set; }
    public string? Unit { get; set; }
    public string? DeedNumber { get; set; }
    public string? Municipality { get; set; }
    public string? Township { get; set; }
}

public class PropertyDTO
{
    public Guid Id { get; set; }
    public string DnaId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PropertyType? PropertyType { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
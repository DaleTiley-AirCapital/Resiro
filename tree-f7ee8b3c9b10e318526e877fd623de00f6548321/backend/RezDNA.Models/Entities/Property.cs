using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using RezDNA.Models.Enums;

namespace RezDNA.Models.Entities;

[Table("properties")]
public class Property
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("org_id")]
    public Guid OrgId { get; set; }

    [Required]
    [Column("dna_id")]
    public string DnaId { get; set; } = string.Empty;

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("property_type")]
    public PropertyType? PropertyType { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("city")]
    public string? City { get; set; }

    [Column("province")]
    public string? Province { get; set; }

    [Column("postal_code")]
    public string? PostalCode { get; set; }

    [Column("country")]
    public string? Country { get; set; }

    [Column("parcel_id")]
    public string? ParcelId { get; set; }

    [Column("unit")]
    public string? Unit { get; set; }

    [Column("deed_number")]
    public string? DeedNumber { get; set; }

    [Column("municipality")]
    public string? Municipality { get; set; }

    [Column("township")]
    public string? Township { get; set; }

    [Column("coordinates", TypeName = "jsonb")]
    public string? Coordinates { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("OrgId")]
    public virtual Organization Organization { get; set; } = null!;
    public virtual ICollection<Document> Documents { get; set; } = new List<Document>();
    public virtual ICollection<Policy> Policies { get; set; } = new List<Policy>();
    public virtual ICollection<MaintenanceItem> MaintenanceItems { get; set; } = new List<MaintenanceItem>();
}
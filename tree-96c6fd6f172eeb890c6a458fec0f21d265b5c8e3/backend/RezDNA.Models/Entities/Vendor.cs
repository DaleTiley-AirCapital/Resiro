using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RezDNA.Models.Entities;

[Table("vendors")]
public class Vendor
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("org_id")]
    public Guid OrgId { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("company")]
    public string? Company { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("specialties", TypeName = "text[]")]
    public string[] Specialties { get; set; } = Array.Empty<string>();

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("OrgId")]
    public virtual Organization Organization { get; set; } = null!;

    public virtual ICollection<VendorPropertyLink> VendorPropertyLinks { get; set; } = new List<VendorPropertyLink>();
}
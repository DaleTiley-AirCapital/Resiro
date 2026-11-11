using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RezDNA.Models.Entities;

[Table("vendor_property_links")]
public class VendorPropertyLink
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("org_id")]
    public Guid OrgId { get; set; }

    [Required]
    [Column("vendor_id")]
    public Guid VendorId { get; set; }

    [Required]
    [Column("property_id")]
    public Guid PropertyId { get; set; }

    [Required]
    [Column("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [Column("allowed_kinds", TypeName = "text[]")]
    public string[] AllowedKinds { get; set; } = Array.Empty<string>();

    [Column("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("OrgId")]
    public virtual Organization Organization { get; set; } = null!;

    [ForeignKey("VendorId")]
    public virtual Vendor Vendor { get; set; } = null!;

    [ForeignKey("PropertyId")]
    public virtual Property Property { get; set; } = null!;
}
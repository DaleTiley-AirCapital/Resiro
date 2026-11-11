using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using RezDNA.Models.Enums;

namespace RezDNA.Models.Entities;

[Table("documents")]
public class Document
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("org_id")]
    public Guid OrgId { get; set; }

    [Column("property_id")]
    public Guid? PropertyId { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("kind")]
    public DocumentKind? Kind { get; set; }

    [Column("source")]
    public DocumentSource? Source { get; set; }

    [Required]
    [Column("storage_key")]
    public string StorageKey { get; set; } = string.Empty;

    [Required]
    [Column("content_type")]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    [Column("bytes")]
    public long Bytes { get; set; }

    [Required]
    [Column("sha256")]
    public string Sha256 { get; set; } = string.Empty;

    [Column("uploaded_by")]
    public Guid? UploadedBy { get; set; }

    [Column("verified_by")]
    public Guid? VerifiedBy { get; set; }

    [Column("verified_at")]
    public DateTime? VerifiedAt { get; set; }

    [Column("metadata", TypeName = "jsonb")]
    public string? Metadata { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("OrgId")]
    public virtual Organization Organization { get; set; } = null!;

    [ForeignKey("PropertyId")]
    public virtual Property? Property { get; set; }

    [ForeignKey("UploadedBy")]
    public virtual User? UploadedByUser { get; set; }

    [ForeignKey("VerifiedBy")]
    public virtual User? VerifiedByUser { get; set; }
}
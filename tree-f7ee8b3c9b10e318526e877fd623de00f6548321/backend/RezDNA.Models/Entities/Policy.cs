using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RezDNA.Models.Entities;

[Table("policies")]
public class Policy
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("org_id")]
    public Guid OrgId { get; set; }

    [Column("property_id")]
    public Guid? PropertyId { get; set; }

    [Column("document_id")]
    public Guid? DocumentId { get; set; }

    [Required]
    [Column("policy_number")]
    public string PolicyNumber { get; set; } = string.Empty;

    [Required]
    [Column("provider")]
    public string Provider { get; set; } = string.Empty;

    [Column("policy_type")]
    public string? PolicyType { get; set; }

    [Column("coverage_amount", TypeName = "decimal(15,2)")]
    public decimal? CoverageAmount { get; set; }

    [Column("premium_amount", TypeName = "decimal(15,2)")]
    public decimal? PremiumAmount { get; set; }

    [Column("effective_date")]
    public DateTime? EffectiveDate { get; set; }

    [Column("expiry_date")]
    public DateTime? ExpiryDate { get; set; }

    [Column("deductible", TypeName = "decimal(15,2)")]
    public decimal? Deductible { get; set; }

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

    [ForeignKey("DocumentId")]
    public virtual Document? Document { get; set; }

    public virtual ICollection<PolicyFinding> PolicyFindings { get; set; } = new List<PolicyFinding>();
}
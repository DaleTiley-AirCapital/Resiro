using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RezDNA.Models.Entities;

[Table("policy_findings")]
public class PolicyFinding
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("org_id")]
    public Guid OrgId { get; set; }

    [Required]
    [Column("policy_id")]
    public Guid PolicyId { get; set; }

    [Required]
    [Column("finding_type")]
    public string FindingType { get; set; } = string.Empty;

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("severity")]
    public string? Severity { get; set; }

    [Column("confidence")]
    public string? Confidence { get; set; }

    [Column("page_number")]
    public int? PageNumber { get; set; }

    [Column("embedding")]
    public float[]? Embedding { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("OrgId")]
    public virtual Organization Organization { get; set; } = null!;

    [ForeignKey("PolicyId")]
    public virtual Policy Policy { get; set; } = null!;
}
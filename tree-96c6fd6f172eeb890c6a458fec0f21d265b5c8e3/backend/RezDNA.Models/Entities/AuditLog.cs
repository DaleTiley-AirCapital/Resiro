using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using RezDNA.Models.Enums;

namespace RezDNA.Models.Entities;

[Table("audit_log")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("org_id")]
    public Guid OrgId { get; set; }

    [Column("user_id")]
    public Guid? UserId { get; set; }

    [Required]
    [Column("action")]
    public AuditAction Action { get; set; }

    [Required]
    [Column("entity_type")]
    public string EntityType { get; set; } = string.Empty;

    [Column("entity_id")]
    public Guid? EntityId { get; set; }

    [Column("details", TypeName = "jsonb")]
    public string? Details { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("OrgId")]
    public virtual Organization Organization { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}
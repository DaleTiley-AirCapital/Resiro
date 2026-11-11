using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RezDNA.Models.Entities;

[Table("maintenance_items")]
public class MaintenanceItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("org_id")]
    public Guid OrgId { get; set; }

    [Required]
    [Column("property_id")]
    public Guid PropertyId { get; set; }

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("frequency")]
    public string? Frequency { get; set; }

    [Column("priority")]
    public string? Priority { get; set; }

    [Column("next_due")]
    public DateTime? NextDue { get; set; }

    [Column("assigned_to")]
    public Guid? AssignedTo { get; set; }

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
    public virtual Property Property { get; set; } = null!;

    [ForeignKey("AssignedTo")]
    public virtual User? AssignedToUser { get; set; }
}
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RezDNA.Models.Entities;

[Table("organizations")]
public class Organization
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("slug")]
    [StringLength(100)]
    public string Slug { get; set; } = string.Empty;

    [Column("billing_email")]
    public string? BillingEmail { get; set; }

    [Column("settings", TypeName = "jsonb")]
    public string Settings { get; set; } = "{}";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<User> Users { get; set; } = new List<User>();
    public virtual ICollection<Property> Properties { get; set; } = new List<Property>();
    public virtual ICollection<Document> Documents { get; set; } = new List<Document>();
    public virtual ICollection<Policy> Policies { get; set; } = new List<Policy>();
    public virtual ICollection<Vendor> Vendors { get; set; } = new List<Vendor>();
}
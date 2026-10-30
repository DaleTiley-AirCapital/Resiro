using Microsoft.EntityFrameworkCore;
using RezDNA.Models.Entities;
using RezDNA.Models.Enums;

namespace RezDNA.Data;

public class RezDNADbContext : DbContext
{
    public RezDNADbContext(DbContextOptions<RezDNADbContext> options) : base(options)
    {
    }

    public DbSet<Organization> Organizations { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Property> Properties { get; set; }
    public DbSet<Document> Documents { get; set; }
    public DbSet<Policy> Policies { get; set; }
    public DbSet<PolicyFinding> PolicyFindings { get; set; }
    public DbSet<MaintenanceItem> MaintenanceItems { get; set; }
    public DbSet<Vendor> Vendors { get; set; }
    public DbSet<VendorPropertyLink> VendorPropertyLinks { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<BillingLedger> BillingLedgers { get; set; }
    public DbSet<UsageCounter> UsageCounters { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure enum to string conversions
        modelBuilder.Entity<User>()
            .Property(e => e.UserType)
            .HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<UserType>(v.Replace("_", ""), true));

        modelBuilder.Entity<Property>()
            .Property(e => e.PropertyType)
            .HasConversion(
                v => v.HasValue ? v.Value.ToString().ToLowerInvariant() : null,
                v => !string.IsNullOrEmpty(v) ? Enum.Parse<PropertyType>(v, true) : null);

        modelBuilder.Entity<Document>()
            .Property(e => e.Kind)
            .HasConversion(
                v => v.HasValue ? v.Value.ToString().ToLowerInvariant() : null,
                v => !string.IsNullOrEmpty(v) ? Enum.Parse<DocumentKind>(v, true) : null);

        modelBuilder.Entity<Document>()
            .Property(e => e.Source)
            .HasConversion(
                v => v.HasValue ? v.Value.ToString().ToLowerInvariant() : null,
                v => !string.IsNullOrEmpty(v) ? Enum.Parse<DocumentSource>(v.Replace("_", ""), true) : null);

        modelBuilder.Entity<AuditLog>()
            .Property(e => e.Action)
            .HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<AuditAction>(v, true));

        // Configure unique constraints
        modelBuilder.Entity<Organization>()
            .HasIndex(o => o.Slug)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Property>()
            .HasIndex(p => p.DnaId)
            .IsUnique();

        modelBuilder.Entity<VendorPropertyLink>()
            .HasIndex(vpl => vpl.AccessToken)
            .IsUnique();

        // Configure composite unique constraints
        modelBuilder.Entity<UsageCounter>()
            .HasIndex(uc => new { uc.OrgId, uc.CounterType, uc.Period })
            .IsUnique();

        // Configure array properties for PostgreSQL
        modelBuilder.Entity<Vendor>()
            .Property(e => e.Specialties)
            .HasColumnType("text[]");

        modelBuilder.Entity<VendorPropertyLink>()
            .Property(e => e.AllowedKinds)
            .HasColumnType("text[]");

        // Configure JSONB properties
        modelBuilder.Entity<Organization>()
            .Property(e => e.Settings)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Property>()
            .Property(e => e.Coordinates)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Document>()
            .Property(e => e.Metadata)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Policy>()
            .Property(e => e.Metadata)
            .HasColumnType("jsonb");

        modelBuilder.Entity<MaintenanceItem>()
            .Property(e => e.Metadata)
            .HasColumnType("jsonb");

        modelBuilder.Entity<AuditLog>()
            .Property(e => e.Details)
            .HasColumnType("jsonb");

        modelBuilder.Entity<BillingLedger>()
            .Property(e => e.Metadata)
            .HasColumnType("jsonb");

        // Configure relationships
        modelBuilder.Entity<User>()
            .HasOne(u => u.Organization)
            .WithMany(o => o.Users)
            .HasForeignKey(u => u.OrgId);

        modelBuilder.Entity<Property>()
            .HasOne(p => p.Organization)
            .WithMany(o => o.Properties)
            .HasForeignKey(p => p.OrgId);

        modelBuilder.Entity<Document>()
            .HasOne(d => d.Organization)
            .WithMany(o => o.Documents)
            .HasForeignKey(d => d.OrgId);

        modelBuilder.Entity<Document>()
            .HasOne(d => d.Property)
            .WithMany(p => p.Documents)
            .HasForeignKey(d => d.PropertyId);

        modelBuilder.Entity<Document>()
            .HasOne(d => d.UploadedByUser)
            .WithMany(u => u.UploadedDocuments)
            .HasForeignKey(d => d.UploadedBy);

        modelBuilder.Entity<Policy>()
            .HasOne(p => p.Organization)
            .WithMany(o => o.Policies)
            .HasForeignKey(p => p.OrgId);

        modelBuilder.Entity<Policy>()
            .HasOne(p => p.Property)
            .WithMany(pr => pr.Policies)
            .HasForeignKey(p => p.PropertyId);

        modelBuilder.Entity<PolicyFinding>()
            .HasOne(pf => pf.Policy)
            .WithMany(p => p.PolicyFindings)
            .HasForeignKey(pf => pf.PolicyId);

        modelBuilder.Entity<MaintenanceItem>()
            .HasOne(mi => mi.Property)
            .WithMany(p => p.MaintenanceItems)
            .HasForeignKey(mi => mi.PropertyId);

        modelBuilder.Entity<Vendor>()
            .HasOne(v => v.Organization)
            .WithMany(o => o.Vendors)
            .HasForeignKey(v => v.OrgId);

        modelBuilder.Entity<VendorPropertyLink>()
            .HasOne(vpl => vpl.Vendor)
            .WithMany(v => v.VendorPropertyLinks)
            .HasForeignKey(vpl => vpl.VendorId);
    }
}
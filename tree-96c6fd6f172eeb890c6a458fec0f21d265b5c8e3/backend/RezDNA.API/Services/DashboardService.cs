using Microsoft.EntityFrameworkCore;
using RezDNA.API.Services;
using RezDNA.Data;
using RezDNA.Models.DTOs;

namespace RezDNA.API.Services;

public class DashboardService : IDashboardService
{
    private readonly RezDNADbContext _context;

    public DashboardService(RezDNADbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStatsDTO> GetDashboardStatsAsync(Guid orgId)
    {
        var totalProperties = await _context.Properties
            .Where(p => p.OrgId == orgId)
            .CountAsync();

        var activePolicies = await _context.Policies
            .Where(p => p.OrgId == orgId)
            .CountAsync();

        var pendingReviews = await _context.Documents
            .Where(d => d.OrgId == orgId && d.VerifiedBy == null)
            .CountAsync();

        var totalStorageBytes = await _context.Documents
            .Where(d => d.OrgId == orgId)
            .SumAsync(d => (long?)d.Bytes) ?? 0;

        var storageUsed = totalStorageBytes > 1024 * 1024 * 1024
            ? $"{totalStorageBytes / (1024.0 * 1024.0 * 1024.0):F1}GB"
            : $"{totalStorageBytes / (1024.0 * 1024.0):F1}MB";

        return new DashboardStatsDTO
        {
            TotalProperties = totalProperties,
            ActivePolicies = activePolicies,
            PendingReviews = pendingReviews,
            StorageUsed = storageUsed
        };
    }

    public async Task<IEnumerable<ActivityLogDTO>> GetRecentActivityAsync(Guid orgId, int limit = 10)
    {
        var activities = await _context.AuditLogs
            .Where(a => a.OrgId == orgId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new ActivityLogDTO
            {
                Action = a.Action.ToString(),
                EntityType = a.EntityType,
                Details = a.Details,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return activities;
    }
}
using RezDNA.Models.DTOs;

namespace RezDNA.API.Services;

public interface IDashboardService
{
    Task<DashboardStatsDTO> GetDashboardStatsAsync(Guid orgId);
    Task<IEnumerable<ActivityLogDTO>> GetRecentActivityAsync(Guid orgId, int limit = 10);
}
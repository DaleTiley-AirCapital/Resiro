using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RezDNA.API.Services;

namespace RezDNA.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var orgIdClaim = User.FindFirst("orgId")?.Value;
            if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                return BadRequest(new { error = "Invalid organization ID" });
            }

            var stats = await _dashboardService.GetDashboardStatsAsync(orgId);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch dashboard stats", details = ex.Message });
        }
    }

    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity()
    {
        try
        {
            var orgIdClaim = User.FindFirst("orgId")?.Value;
            if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                return BadRequest(new { error = "Invalid organization ID" });
            }

            var activity = await _dashboardService.GetRecentActivityAsync(orgId, 10);
            return Ok(activity);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch recent activity", details = ex.Message });
        }
    }
}
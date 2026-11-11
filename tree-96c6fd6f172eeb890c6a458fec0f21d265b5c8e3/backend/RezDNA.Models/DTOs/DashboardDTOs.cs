namespace RezDNA.Models.DTOs;

public class DashboardStatsDTO
{
    public int TotalProperties { get; set; }
    public int ActivePolicies { get; set; }
    public int PendingReviews { get; set; }
    public string StorageUsed { get; set; } = string.Empty;
}

public class ActivityLogDTO
{
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}
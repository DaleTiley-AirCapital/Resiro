using Microsoft.EntityFrameworkCore;
using RezDNA.Data;
using RezDNA.Models.Entities;
using System.Text.Json.Nodes;

namespace RezDNA.API.Services;

public static class WorkflowState
{
    public static JsonObject Json(string? text) => string.IsNullOrWhiteSpace(text) ? new() : JsonNode.Parse(text)!.AsObject();
    public static JsonObject Meta(MaintenanceItem item) => Json(item.Metadata);
    public static JsonArray List(JsonObject state, string name)
    {
        if (state[name] is not JsonArray) state[name] = new JsonArray();
        return state[name]!.AsArray();
    }
    public static string Text(JsonObject input, string name, int max = 2000) {
        var text = input[name]?.ToString().Trim() ?? "";
        return text[..Math.Min(text.Length, max)];
    }
    public static bool Time(JsonObject input, string name, out DateTime value) {
        value = default;
        var text = input[name]?.ToString();
        // Require an explicit offset instead of silently guessing the server's timezone.
        if (string.IsNullOrWhiteSpace(text) || !(text.EndsWith("Z") || System.Text.RegularExpressions.Regex.IsMatch(text, @"[+-]\d\d:\d\d$"))) return false;
        if (!DateTimeOffset.TryParse(text, out var date)) return false;
        value = date.UtcDateTime; return true;
    }
    public static async Task<Dictionary<Guid, Organization>> Lock(RezDNADbContext db, params Guid[] ids) {
        var result = new Dictionary<Guid, Organization>();
        foreach (var id in ids.Distinct().OrderBy(i => i))
            result[id] = await db.Organizations.FromSqlInterpolated(
                $"SELECT * FROM organizations WHERE id = {id} FOR UPDATE").SingleAsync();
        return result;
    }
    public static void Notify(Organization org, string key, string title, string message, string path) {
        var state = Json(org.Settings); var notices = List(state, "notifications");
        if (notices.Any(n => n?["key"]?.ToString() == key)) return;
        notices.Add(new JsonObject { ["id"] = Guid.NewGuid().ToString(), ["key"] = key,
            ["title"] = title, ["message"] = message, ["path"] = path,
            ["created_at"] = DateTime.UtcNow, ["read"] = false });
        org.Settings = state.ToJsonString(); org.UpdatedAt = DateTime.UtcNow;
    }
    public static object Reminder(MaintenanceItem item) {
        var meta = Meta(item);
        return new { id=item.Id, property_id=item.PropertyId, title=item.Title, description=item.Description,
            due_at=item.NextDue, recurrence=item.Frequency ?? "none", priority=item.Priority ?? "normal",
            status=meta["status"]?.ToString() ?? "open", revision=meta["revision"]?.GetValue<int>() ?? 1,
            overdue=meta["status"]?.ToString() == "open" && item.NextDue < DateTime.UtcNow };
    }
    public static object Booking(MaintenanceItem item) {
        var meta=Meta(item);
        return new { id=item.Id, property_id=item.PropertyId, title=item.Title, description=item.Description,
            property_address=meta["property_address"]?.ToString(), supplier_org_id=meta["supplier_org_id"]?.ToString(),
            supplier_name=meta["supplier_name"]?.ToString(), owner_name=meta["owner_name"]?.ToString(),
            start_at=meta["start_at"]?.ToString(), end_at=meta["end_at"]?.ToString(),
            status=meta["status"]?.ToString(), note=meta["note"]?.ToString(),
            revision=meta["revision"]?.GetValue<int>() ?? 1, events=meta["events"]?.DeepClone() };
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RezDNA.Data;
using System.Text.Json.Nodes;
using System.Security.Cryptography;

namespace RezDNA.API.Controllers;

// Supplier data uses the host's existing organization-owned JSONB settings.
// Row locks preserve concurrent profile, job, template and share updates.
[ApiController, Authorize(Policy = "Supplier"), Route("api/supplier")]
public class SupplierController : ControllerBase
{
    private readonly RezDNADbContext db;
    public SupplierController(RezDNADbContext db) { this.db = db; }
    private Guid OrgId => Guid.Parse(User.FindFirst("orgId")!.Value);
    private static JsonObject State(string json) => JsonNode.Parse(json)?.AsObject() ?? new();
    private async Task<JsonObject> Read() => State((await db.Organizations.SingleAsync(o => o.Id == OrgId)).Settings);
    private async Task<IActionResult> Change(Func<JsonObject, IActionResult> action)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var org = await db.Organizations.FromSqlInterpolated(
            $"SELECT * FROM organizations WHERE id = {OrgId} FOR UPDATE").SingleAsync();
        var state = State(org.Settings);
        var result = action(state);
        if (result is ObjectResult objectResult && objectResult.StatusCode >= 400) return result;
        org.Settings = state.ToJsonString();
        org.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return result;
    }
    private static JsonArray List(JsonObject state, string key)
    {
        if (state[key] is not JsonArray) state[key] = new JsonArray();
        return state[key]!.AsArray();
    }
    private static string Text(JsonObject input, string key, int max = 2000) =>
        (input[key]?.ToString() ?? "").Trim()[..Math.Min((input[key]?.ToString() ?? "").Trim().Length, max)];

    [HttpGet("profile")]
    public async Task<IActionResult> Profile()
    {
        var state = await Read();
        return Ok(state["supplier_profile"] ?? new JsonObject {
            ["company_name"] = (await db.Organizations.FindAsync(OrgId))!.Name,
            ["email"] = User.FindFirst("email")?.Value ?? "", ["specialties"] = new JsonArray() });
    }
    [HttpPut("profile"), RequestSizeLimit(65536)]
    public Task<IActionResult> SaveProfile(JsonObject input) => Change(state => {
        if (string.IsNullOrWhiteSpace(Text(input, "company_name"))) return BadRequest(new { error = "Company name is required" });
        var profile = new JsonObject();
        foreach (var key in new[] { "company_name", "registration_number", "description", "email", "phone", "website" })
            profile[key] = Text(input, key);
        profile["specialties"] = new JsonArray(Text(input, "specialties").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(x => (JsonNode?)JsonValue.Create(x)).ToArray());
        state["supplier_profile"] = profile;
        return Ok(profile.DeepClone());
    });

    [HttpGet("jobs")]
    public async Task<IActionResult> Jobs() => Ok(List(await Read(), "supplier_jobs"));
    [HttpPost("jobs"), RequestSizeLimit(65536)]
    public Task<IActionResult> CreateJob(JsonObject input) => Change(state => {
        if (new[] { "property_address", "client_name", "description" }.Any(k => string.IsNullOrWhiteSpace(Text(input, k))))
            return BadRequest(new { error = "Property address, client name and description are required" });
        var job = new JsonObject { ["id"] = Guid.NewGuid().ToString(),
            ["job_ref"] = "JOB-" + Convert.ToHexString(RandomNumberGenerator.GetBytes(6)),
            ["created_at"] = DateTime.UtcNow, ["document_count"] = 0, ["status"] = "open",
            ["documents"] = new JsonArray() };
        foreach (var key in new[] { "property_address", "client_name", "description", "template_name" }) job[key] = Text(input, key);
        List(state, "supplier_jobs").Add(job);
        return Ok(job.DeepClone());
    });
    [HttpGet("templates")]
    public async Task<IActionResult> Templates() => Ok(List(await Read(), "supplier_templates"));
    [HttpPost("templates"), RequestSizeLimit(65536)]
    public Task<IActionResult> SaveTemplate(JsonObject input) => Change(state => {
        var name = Text(input, "name", 120);
        if (string.IsNullOrWhiteSpace(name)) return BadRequest(new { error = "Template name is required" });
        var templates = List(state, "supplier_templates");
        var id = Text(input, "id", 100);
        var existing = templates.FirstOrDefault(t => t?["id"]?.ToString() == id);
        if (existing != null) templates.Remove(existing);
        var template = new JsonObject { ["id"] = existing?["id"]?.ToString() ?? Guid.NewGuid().ToString(),
            ["name"] = name, ["category"] = Text(input, "category", 120), ["version"] = "1.0" };
        templates.Add(template);
        return Ok(template.DeepClone());
    });
    [HttpGet("settings")]
    public async Task<IActionResult> Settings() => Ok((await Read())["supplier_settings"] ??
        new JsonObject { ["expire_after_days"] = 7 });
    [HttpPut("settings")]
    public Task<IActionResult> SaveSettings(JsonObject input) => Change(state => {
        if (!int.TryParse(input["expire_after_days"]?.ToString(), out var days) || days < 1 || days > 30)
            return BadRequest(new { error = "Share expiry must be between 1 and 30 days" });
        state["supplier_settings"] = new JsonObject { ["expire_after_days"] = days };
        return Ok(state["supplier_settings"]!.DeepClone());
    });
    [HttpPost("jobs/{id:guid}/share"), RequestSizeLimit(65536)]
    public Task<IActionResult> Share(Guid id, JsonObject input) => Change(state => {
        var job = List(state, "supplier_jobs").FirstOrDefault(j => j?["id"]?.ToString() == id.ToString());
        if (job == null) return NotFound(new { error = "Job not found" });
        var days = state["supplier_settings"]?["expire_after_days"]?.GetValue<int>() ?? 7;
        var password = Text(input, "password", 200);
        var share = new JsonObject { ["token"] = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant(),
            ["job_id"] = id.ToString(), ["expires_at"] = DateTime.UtcNow.AddDays(days),
            ["password_hash"] = string.IsNullOrEmpty(password) ? null : BCrypt.Net.BCrypt.HashPassword(password) };
        List(state, "supplier_shares").Add(share);
        return Ok(new { token = share["token"]!.ToString(), expires_at = share["expires_at"]!.ToString() });
    });
}

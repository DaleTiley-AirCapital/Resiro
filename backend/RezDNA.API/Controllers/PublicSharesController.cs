using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RezDNA.Data;
using System.Text.Json.Nodes;
namespace RezDNA.API.Controllers;

[ApiController, Route("api/public-shares")]
public class PublicSharesController : ControllerBase
{
    private readonly RezDNADbContext db;
    private readonly IWebHostEnvironment environment;
    public PublicSharesController(RezDNADbContext db, IWebHostEnvironment environment) { this.db = db; this.environment = environment; }
    private async Task<(Guid org, JsonNode share, JsonNode job)?> Find(string token)
    {
        if (token.Length != 48 || token.Any(c => !Uri.IsHexDigit(c))) return null;
        var candidates = await db.Organizations.Where(o => o.Settings.Contains(token)).ToListAsync();
        foreach (var org in candidates)
        {
            var state = JsonNode.Parse(org.Settings)!;
            var share = (state["supplier_shares"] as JsonArray)?.FirstOrDefault(s => s?["token"]?.ToString() == token);
            if (share == null)
            {
                var fileShare = (state["property_shares"] as JsonArray)?.FirstOrDefault(s => s?["token"]?.ToString() == token);
                if (fileShare != null && DateTime.Parse(fileShare["expires_at"]!.ToString()).ToUniversalTime() > DateTime.UtcNow &&
                    Guid.TryParse(fileShare["document_id"]?.ToString(), out var documentId))
                {
                    var doc = await db.Documents.SingleOrDefaultAsync(d => d.Id == documentId && d.OrgId == org.Id);
                    if (doc != null)
                    {
                        var docs = new JsonArray(new JsonObject { ["id"] = doc.Id.ToString(), ["name"] = doc.Name });
                        var fileJob = new JsonObject { ["property_address"] = doc.Name, ["job_ref"] = "Property document",
                            ["description"] = "Shared property document. Not independently verified.", ["documents"] = docs };
                        return (org.Id, fileShare, fileJob);
                    }
                }
            }
            if (share == null || DateTime.Parse(share["expires_at"]!.ToString()).ToUniversalTime() <= DateTime.UtcNow) continue;
            var job = (state["supplier_jobs"] as JsonArray)?.FirstOrDefault(j => j?["id"]?.ToString() == share["job_id"]?.ToString());
            if (job != null) return (org.Id, share, job);
        }
        return null;
    }
    private static bool CanRead(JsonNode share, JsonObject? input) =>
        string.IsNullOrEmpty(share["password_hash"]?.ToString()) ||
        BCrypt.Net.BCrypt.Verify(input?["password"]?.ToString() ?? "", share["password_hash"]!.ToString());
    [HttpGet("{token}")]
    [HttpPost("{token}")]
    public async Task<IActionResult> Read(string token, [FromBody] JsonObject? input = null)
    {
        var found = await Find(token);
        if (!found.HasValue) return NotFound(new { error = "Share link is missing or expired" });
        if (!CanRead(found.Value.share, input)) return Unauthorized(new { error = "Password required" });
        return Ok(new { job = found.Value.job, expires_at = found.Value.share["expires_at"]!.ToString() });
    }
    [HttpPost("{token}/files/{id:guid}")]
    public async Task<IActionResult> Download(string token, Guid id, [FromBody] JsonObject? input = null)
    {
        var found = await Find(token);
        if (!found.HasValue) return NotFound();
        if (!CanRead(found.Value.share, input)) return Unauthorized();
        var doc = (found.Value.job["documents"] as JsonArray)?.FirstOrDefault(d => d?["id"]?.ToString() == id.ToString());
        var path = Path.Combine(environment.ContentRootPath, "uploads", found.Value.org.ToString(), id.ToString());
        if (doc == null || !System.IO.File.Exists(path)) return NotFound();
        return PhysicalFile(path, "application/octet-stream", doc["name"]!.ToString());
    }
}

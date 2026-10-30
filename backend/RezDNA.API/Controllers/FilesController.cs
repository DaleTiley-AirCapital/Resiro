using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RezDNA.Data;
using RezDNA.Models.Entities;
using RezDNA.Models.Enums;
using System.Text.Json.Nodes;
using System.Security.Cryptography;

namespace RezDNA.API.Controllers;

[ApiController, Authorize]
public class FilesController : ControllerBase
{
    private readonly RezDNADbContext db;
    private readonly IWebHostEnvironment environment;
    public FilesController(RezDNADbContext db, IWebHostEnvironment environment) { this.db = db; this.environment = environment; }
    private Guid OrgId => Guid.Parse(User.FindFirst("orgId")!.Value);
    private string DiskPath(Guid org, Guid id) => Path.Combine(environment.ContentRootPath, "uploads", org.ToString(), id.ToString());
    [HttpPost("api/files"), RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] Guid? propertyId, [FromForm] Guid? jobId)
    {
        if (file.Length <= 0 || file.Length > 10 * 1024 * 1024)
            return BadRequest(new { error = "Choose a non-empty file up to 10 MB" });
        var userId = Guid.Parse(User.FindFirst("userId")!.Value);
        if (propertyId.HasValue && !await db.Properties.AnyAsync(p => p.Id == propertyId && p.OrgId == OrgId))
            return NotFound(new { error = "Property not found" });
        if (!propertyId.HasValue && User.FindFirst("userType")?.Value != "supplier") return Forbid();
        await using var transaction = await db.Database.BeginTransactionAsync();
        var org = await db.Organizations.FromSqlInterpolated(
            $"SELECT * FROM organizations WHERE id = {OrgId} FOR UPDATE").SingleAsync();
        var state = JsonNode.Parse(org.Settings)!.AsObject();
        var jobs = state["supplier_jobs"] as JsonArray;
        var job = jobId.HasValue ? jobs?.FirstOrDefault(j => j?["id"]?.ToString() == jobId.Value.ToString()) : null;
        if (jobId.HasValue && job == null) return NotFound(new { error = "Job not found" });
        var id = Guid.NewGuid();
        var filename = Path.GetFileName(file.FileName.Replace('\\', '/'));
        if (filename.Length > 200) filename = filename[^200..];
        var path = DiskPath(OrgId, id);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        try
        {
            await using (var stream = System.IO.File.Create(path)) await file.CopyToAsync(stream);
            await using var input = System.IO.File.OpenRead(path);
            var sha = Convert.ToHexString(await SHA256.HashDataAsync(input)).ToLowerInvariant();
            var metadata = new JsonObject { ["id"] = id.ToString(), ["name"] = filename,
                ["bytes"] = file.Length, ["sha256"] = sha, ["created_at"] = DateTime.UtcNow,
                ["content_type"] = file.ContentType, ["source"] = propertyId.HasValue ? "owner_upload" : "supplier_upload",
                ["kind"] = "other", ["download_url"] = "/api/files/" + id };
            if (propertyId.HasValue)
            {
                db.Documents.Add(new Document { Id = id, OrgId = OrgId, PropertyId = propertyId,
                    Name = filename, StorageKey = id.ToString(), UploadedBy = userId,
                    Bytes = file.Length, Sha256 = sha, ContentType = file.ContentType, Kind = DocumentKind.Other,
                    Source = DocumentSource.OwnerUpload });
            }
            else
            {
                if (job != null)
                {
                    if (job["documents"] is not JsonArray) job["documents"] = new JsonArray();
                    job["documents"]!.AsArray().Add(metadata.DeepClone());
                    job["document_count"] = job["documents"]!.AsArray().Count;
                }
                else
                {
                    if (state["supplier_documents"] is not JsonArray) state["supplier_documents"] = new JsonArray();
                    state["supplier_documents"]!.AsArray().Add(metadata.DeepClone());
                }
                org.Settings = state.ToJsonString();
            }
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok(metadata);
        }
        catch { if (System.IO.File.Exists(path)) System.IO.File.Delete(path); throw; }
    }
    [HttpGet("api/supplier/documents"), Authorize(Policy = "Supplier")]
    public async Task<IActionResult> SupplierDocuments()
    {
        var org = await db.Organizations.SingleAsync(o => o.Id == OrgId);
        return Ok(JsonNode.Parse(org.Settings)?["supplier_documents"] ?? new JsonArray());
    }
    [HttpGet("api/files/{id:guid}")]
    public async Task<IActionResult> Download(Guid id)
    {
        var document = await db.Documents.SingleOrDefaultAsync(d => d.Id == id && d.OrgId == OrgId);
        var name = document?.Name;
        if (document == null)
        {
            if (User.FindFirst("userType")?.Value != "supplier") return NotFound();
            var state = JsonNode.Parse((await db.Organizations.SingleAsync(o => o.Id == OrgId)).Settings)!;
            var docs = (state["supplier_documents"] as JsonArray)?.ToList() ?? new List<JsonNode?>();
            foreach (var job in state["supplier_jobs"] as JsonArray ?? new JsonArray())
                docs.AddRange(job?["documents"] as JsonArray ?? new JsonArray());
            name = docs.FirstOrDefault(d => d?["id"]?.ToString() == id.ToString())?["name"]?.ToString();
        }
        if (name == null || !System.IO.File.Exists(DiskPath(OrgId, id))) return NotFound();
        return PhysicalFile(DiskPath(OrgId, id), "application/octet-stream", name);
    }
    [HttpGet("api/properties/{id:guid}/documents")]
    public async Task<IActionResult> PropertyDocuments(Guid id)
    {
        if (!await db.Properties.AnyAsync(p => p.Id == id && p.OrgId == OrgId)) return NotFound();
        return Ok(await db.Documents.Where(d => d.PropertyId == id && d.OrgId == OrgId)
            .Select(d => new { id = d.Id, name = d.Name, kind = d.Kind, source = d.Source,
                bytes = d.Bytes, sha256 = d.Sha256, created_at = d.CreatedAt,
                content_type = d.ContentType, download_url = "/api/files/" + d.Id }).ToListAsync());
    }
    [HttpGet("api/properties/{id:guid}/policy-check")]
    public async Task<IActionResult> Policy(Guid id)
    {
        if (!await db.Properties.AnyAsync(p => p.Id == id && p.OrgId == OrgId)) return NotFound();
        return Content("null", "application/json");
    }
    [HttpGet("api/properties/{id:guid}/reminders")]
    [HttpGet("api/properties/{id:guid}/vendors")]
    public async Task<IActionResult> Related(Guid id)
    {
        if (!await db.Properties.AnyAsync(p => p.Id == id && p.OrgId == OrgId)) return NotFound();
        return Ok(Array.Empty<object>());
    }

    [HttpPost("api/files/{id:guid}/share"), RequestSizeLimit(65536)]
    public async Task<IActionResult> ShareFile(Guid id, JsonObject input)
    {
        var doc = await db.Documents.SingleOrDefaultAsync(d => d.Id == id && d.OrgId == OrgId);
        if (doc == null) return NotFound();
        await using var transaction = await db.Database.BeginTransactionAsync();
        var org = await db.Organizations.FromSqlInterpolated(
            $"SELECT * FROM organizations WHERE id = {OrgId} FOR UPDATE").SingleAsync();
        var state = JsonNode.Parse(org.Settings)!.AsObject();
        if (state["property_shares"] is not JsonArray) state["property_shares"] = new JsonArray();
        var password = input["password"]?.ToString() ?? "";
        if (password.Length > 200) return BadRequest(new { error = "Password must be 200 characters or fewer" });
        var share = new JsonObject { ["token"] = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant(),
            ["document_id"] = id.ToString(), ["expires_at"] = DateTime.UtcNow.AddDays(7),
            ["password_hash"] = string.IsNullOrEmpty(password) ? null : BCrypt.Net.BCrypt.HashPassword(password) };
        state["property_shares"]!.AsArray().Add(share);
        org.Settings = state.ToJsonString();
        await db.SaveChangesAsync(); await transaction.CommitAsync();
        return Ok(new { token = share["token"]!.ToString() });
    }
}

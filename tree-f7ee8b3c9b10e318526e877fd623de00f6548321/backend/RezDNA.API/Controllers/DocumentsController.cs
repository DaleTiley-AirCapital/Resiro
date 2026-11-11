using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RezDNA.API.Services;
using RezDNA.Models.DTOs;

namespace RezDNA.API.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documentService;

    public DocumentsController(IDocumentService documentService)
    {
        _documentService = documentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDocuments()
    {
        try
        {
            var orgIdClaim = User.FindFirst("orgId")?.Value;
            if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                return BadRequest(new { error = "Invalid organization ID" });
            }

            var documents = await _documentService.GetDocumentsByOrgAsync(orgId);
            return Ok(documents);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch documents", details = ex.Message });
        }
    }

    [HttpPost("sign")]
    public async Task<IActionResult> SignUpload([FromBody] DocumentSignRequest request)
    {
        try
        {
            var orgIdClaim = User.FindFirst("orgId")?.Value;
            if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                return BadRequest(new { error = "Invalid organization ID" });
            }

            var response = await _documentService.GenerateSignedUploadUrlAsync(request, orgId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to generate signed upload URL", details = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateDocument([FromBody] CreateDocumentRequest request)
    {
        try
        {
            var orgIdClaim = User.FindFirst("orgId")?.Value;
            var userIdClaim = User.FindFirst("userId")?.Value;

            if (orgIdClaim == null || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                return BadRequest(new { error = "Invalid organization ID" });
            }

            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return BadRequest(new { error = "Invalid user ID" });
            }

            var document = await _documentService.CreateDocumentAsync(request, orgId, userId);
            return CreatedAtAction(nameof(GetDocuments), document);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to create document", details = ex.Message });
        }
    }
}
using RezDNA.Models.DTOs;

namespace RezDNA.API.Services;

public interface IDocumentService
{
    Task<IEnumerable<DocumentDTO>> GetDocumentsByOrgAsync(Guid orgId);
    Task<DocumentSignResponse> GenerateSignedUploadUrlAsync(DocumentSignRequest request, Guid orgId);
    Task<DocumentDTO> CreateDocumentAsync(CreateDocumentRequest request, Guid orgId, Guid userId);
}
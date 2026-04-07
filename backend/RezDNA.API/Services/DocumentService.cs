using RezDNA.API.Services;
using RezDNA.Data.Repositories;
using RezDNA.Models.DTOs;
using RezDNA.Models.Entities;
using RezDNA.Models.Enums;

namespace RezDNA.API.Services;

public class DocumentService : IDocumentService
{
    private readonly IRepository<Document> _documentRepository;

    public DocumentService(IRepository<Document> documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<IEnumerable<DocumentDTO>> GetDocumentsByOrgAsync(Guid orgId)
    {
        var documents = await _documentRepository.FindAsync(d => d.OrgId == orgId);
        return documents.Select(MapToDTO);
    }

    public async Task<DocumentSignResponse> GenerateSignedUploadUrlAsync(DocumentSignRequest request, Guid orgId)
    {
        // In a real implementation, this would generate a signed URL for Google Cloud Storage
        // For now, we'll return a mock response
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var storageKey = $"{orgId}/uploads/{timestamp}-{Guid.NewGuid()}";

        return new DocumentSignResponse
        {
            Url = "https://storage.googleapis.com/mock-bucket/upload", // Mock URL
            StorageKey = storageKey,
            ContentType = request.ContentType,
            Sha256 = request.Sha256,
            Bytes = request.Bytes
        };
    }

    public async Task<DocumentDTO> CreateDocumentAsync(CreateDocumentRequest request, Guid orgId, Guid userId)
    {
        var document = new Document
        {
            OrgId = orgId,
            PropertyId = request.PropertyId,
            Name = request.Name,
            Description = request.Description,
            Kind = request.Kind,
            Source = DocumentSource.OwnerUpload,
            StorageKey = request.StorageKey,
            ContentType = request.ContentType,
            Bytes = request.Bytes,
            Sha256 = request.Sha256,
            UploadedBy = userId
        };

        await _documentRepository.AddAsync(document);
        await _documentRepository.SaveChangesAsync();

        return MapToDTO(document);
    }

    private static DocumentDTO MapToDTO(Document document)
    {
        return new DocumentDTO
        {
            Id = document.Id,
            PropertyId = document.PropertyId,
            Name = document.Name,
            Description = document.Description,
            Kind = document.Kind,
            Source = document.Source,
            StorageKey = document.StorageKey,
            ContentType = document.ContentType,
            Bytes = document.Bytes,
            Sha256 = document.Sha256,
            CreatedAt = document.CreatedAt,
            UpdatedAt = document.UpdatedAt
        };
    }
}
namespace RezDNA.Data.Services;

public interface IDnaIdGenerator
{
    string GenerateDnaId(string? country, string? municipality, string? parcelId, string? unit, string? deedNumber);
}
using System.Text;

namespace RezDNA.Data.Services;

public class DnaIdGenerator : IDnaIdGenerator
{
    public string GenerateDnaId(string? country, string? municipality, string? parcelId, string? unit, string? deedNumber)
    {
        var parts = new List<string>();
        
        // Add country code (or first 2 chars of country)
        if (!string.IsNullOrEmpty(country))
        {
            parts.Add(country.Length >= 2 ? country.Substring(0, 2).ToUpper() : country.ToUpper());
        }
        
        // Add municipality code (first 3 chars)
        if (!string.IsNullOrEmpty(municipality))
        {
            parts.Add(municipality.Length >= 3 ? municipality.Substring(0, 3).ToUpper() : municipality.ToUpper());
        }
        
        // Generate a random 4-digit number
        var random = new Random();
        parts.Add(random.Next(1000, 9999).ToString());
        
        // Add location suffix based on available data
        var suffix = new StringBuilder();
        
        if (!string.IsNullOrEmpty(parcelId))
        {
            suffix.Append(parcelId.Length >= 2 ? parcelId.Substring(0, 2) : parcelId);
        }
        
        if (!string.IsNullOrEmpty(unit))
        {
            suffix.Append($"U{unit}");
        }
        
        if (suffix.Length == 0 && !string.IsNullOrEmpty(deedNumber))
        {
            suffix.Append(deedNumber.Length >= 2 ? deedNumber.Substring(0, 2) : deedNumber);
        }
        
        if (suffix.Length > 0)
        {
            parts.Add(suffix.ToString().ToUpper());
        }
        
        return $"DNA-{string.Join("-", parts)}";
    }
}
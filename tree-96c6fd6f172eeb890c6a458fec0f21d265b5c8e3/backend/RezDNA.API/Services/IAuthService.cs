using RezDNA.Models.DTOs;
using RezDNA.Models.Entities;

namespace RezDNA.API.Services;

public interface IAuthService
{
    Task<AuthResponse?> SignupAsync(SignupRequest request);
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<UserDTO?> GetCurrentUserAsync(Guid userId);
    string GenerateJwtToken(User user);
    bool VerifyPassword(string password, string hash);
    string HashPassword(string password);
}
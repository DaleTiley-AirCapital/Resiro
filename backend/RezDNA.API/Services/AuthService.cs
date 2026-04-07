using Microsoft.IdentityModel.Tokens;
using RezDNA.API.Services;
using RezDNA.Data.Repositories;
using RezDNA.Models.DTOs;
using RezDNA.Models.Entities;
using RezDNA.Models.Enums;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace RezDNA.API.Services;

public class AuthService : IAuthService
{
    private readonly IRepository<User> _userRepository;
    private readonly IRepository<Organization> _organizationRepository;
    private readonly IConfiguration _configuration;

    public AuthService(
        IRepository<User> userRepository,
        IRepository<Organization> organizationRepository,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _organizationRepository = organizationRepository;
        _configuration = configuration;
    }

    public async Task<AuthResponse?> SignupAsync(SignupRequest request)
    {
        // Check if user already exists
        var existingUser = await _userRepository.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (existingUser != null)
        {
            return null; // User already exists
        }

        // Create organization
        var orgName = request.Company ?? $"{request.FirstName} {request.LastName}'s Organization";
        var orgSlug = orgName.ToLower().Replace(" ", "-").Replace("'", "");
        orgSlug = $"{orgSlug}-{Guid.NewGuid().ToString("N")[..8]}";

        var organization = new Organization
        {
            Name = orgName,
            Slug = orgSlug,
            BillingEmail = request.Email,
            Settings = $"{{\"user_type\": \"{request.UserType.ToString().ToLower()}\"}}"
        };

        await _organizationRepository.AddAsync(organization);
        await _organizationRepository.SaveChangesAsync();

        // Create user
        var user = new User
        {
            OrgId = organization.Id,
            Username = request.Email,
            Email = request.Email,
            Password = HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            UserType = request.UserType,
            Role = "admin",
            Company = request.Company,
            PhoneNumber = request.PhoneNumber
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        var token = GenerateJwtToken(user);

        return new AuthResponse
        {
            Token = token,
            User = new UserDTO
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                UserType = user.UserType,
                Role = user.Role
            },
            Organization = new OrganizationDTO
            {
                Id = organization.Id,
                Name = organization.Name,
                Slug = organization.Slug
            }
        };
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        // Handle demo accounts
        if (request.Email == "info@millenniumroofing.co.za" && request.Password == "supplier123")
        {
            return CreateDemoResponse("demo-supplier", "demo-org-supplier", "Millennium", "Roofing", 
                UserType.Supplier, "Millennium Roofing (Pty) Ltd", "millennium-roofing");
        }

        if (request.Email == "dale.tiley@email.com" && request.Password == "demo123")
        {
            return CreateDemoResponse("demo-property", "demo-org-property", "Dale", "Tiley", 
                UserType.Homeowner, "Dale Tiley Properties", "dale-tiley-properties");
        }

        // Regular user login
        var user = await _userRepository.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !VerifyPassword(request.Password, user.Password))
        {
            return null;
        }

        var organization = await _organizationRepository.GetByIdAsync(user.OrgId);
        if (organization == null)
        {
            return null;
        }

        var token = GenerateJwtToken(user);

        return new AuthResponse
        {
            Token = token,
            User = new UserDTO
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                UserType = user.UserType,
                Role = user.Role
            },
            Organization = new OrganizationDTO
            {
                Id = organization.Id,
                Name = organization.Name,
                Slug = organization.Slug
            }
        };
    }

    public async Task<UserDTO?> GetCurrentUserAsync(Guid userId)
    {
        // Handle demo users
        if (userId.ToString() == "demo-property")
        {
            return new UserDTO
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                Username = "dale.tiley@email.com",
                Email = "dale.tiley@email.com",
                FirstName = "Dale",
                LastName = "Tiley",
                UserType = UserType.Homeowner,
                Role = "admin"
            };
        }

        if (userId.ToString() == "demo-supplier")
        {
            return new UserDTO
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
                Username = "info@millenniumroofing.co.za",
                Email = "info@millenniumroofing.co.za",
                FirstName = "Millennium",
                LastName = "Roofing",
                UserType = UserType.Supplier,
                Role = "admin"
            };
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return null;

        return new UserDTO
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            UserType = user.UserType,
            Role = user.Role
        };
    }

    public string GenerateJwtToken(User user)
    {
        var jwtKey = _configuration["JWT:SecretKey"] ?? Environment.GetEnvironmentVariable("JWT_SECRET") ?? "development-secret-change-in-production";
        var key = Encoding.ASCII.GetBytes(jwtKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("userId", user.Id.ToString()),
                new Claim("orgId", user.OrgId.ToString()),
                new Claim("email", user.Email),
                new Claim("role", user.Role)
            }),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public bool VerifyPassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, 10);
    }

    private AuthResponse CreateDemoResponse(string userId, string orgId, string firstName, string lastName, 
        UserType userType, string orgName, string orgSlug)
    {
        var demoUser = new User 
        { 
            Id = Guid.Parse(userId == "demo-property" ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-000000000002"),
            OrgId = Guid.Parse(orgId == "demo-org-property" ? "00000000-0000-0000-0000-000000000003" : "00000000-0000-0000-0000-000000000004"),
            Email = userId == "demo-property" ? "dale.tiley@email.com" : "info@millenniumroofing.co.za",
            FirstName = firstName,
            LastName = lastName,
            UserType = userType,
            Role = "admin"
        };

        var token = GenerateJwtToken(demoUser);

        return new AuthResponse
        {
            Token = token,
            User = new UserDTO
            {
                Id = demoUser.Id,
                Username = demoUser.Email,
                Email = demoUser.Email,
                FirstName = firstName,
                LastName = lastName,
                UserType = userType,
                Role = "admin"
            },
            Organization = new OrganizationDTO
            {
                Id = demoUser.OrgId,
                Name = orgName,
                Slug = orgSlug
            }
        };
    }
}
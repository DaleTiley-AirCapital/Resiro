using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RezDNA.API.Services;
using RezDNA.Models.DTOs;
using System.Security.Claims;

namespace RezDNA.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest request)
    {
        try
        {
            var response = await _authService.SignupAsync(request);
            if (response == null)
            {
                return BadRequest(new { error = "User already exists with this email" });
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to create account", details = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            if (response == null)
            {
                return Unauthorized(new { error = "Invalid credentials" });
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (userIdClaim == null)
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            // Handle demo users
            if (userIdClaim == "00000000-0000-0000-0000-000000000001")
            {
                return Ok(new
                {
                    user = new
                    {
                        id = "00000000-0000-0000-0000-000000000001",
                        username = "dale.tiley@email.com",
                        email = "dale.tiley@email.com",
                        firstName = "Dale",
                        lastName = "Tiley",
                        userType = "homeowner",
                        role = "admin"
                    },
                    organization = new
                    {
                        id = "00000000-0000-0000-0000-000000000003",
                        name = "Dale Tiley Properties",
                        slug = "dale-tiley-properties"
                    }
                });
            }

            if (userIdClaim == "00000000-0000-0000-0000-000000000002")
            {
                return Ok(new
                {
                    user = new
                    {
                        id = "00000000-0000-0000-0000-000000000002",
                        username = "info@millenniumroofing.co.za",
                        email = "info@millenniumroofing.co.za",
                        firstName = "Millennium",
                        lastName = "Roofing",
                        userType = "supplier",
                        role = "admin"
                    },
                    organization = new
                    {
                        id = "00000000-0000-0000-0000-000000000004",
                        name = "Millennium Roofing (Pty) Ltd",
                        slug = "millennium-roofing"
                    }
                });
            }

            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                return BadRequest(new { error = "Invalid user ID" });
            }

            var user = await _authService.GetCurrentUserAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "User not found" });
            }

            return Ok(new { user });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }
}
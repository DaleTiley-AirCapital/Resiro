using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RezDNA.API.Services;
using RezDNA.Data;
using RezDNA.Data.Repositories;
using RezDNA.Data.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

builder.Services.AddDbContext<RezDNADbContext>(options =>
    options.UseNpgsql(connectionString));

// Add repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Add services
builder.Services.AddScoped<IDnaIdGenerator, DnaIdGenerator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPropertyService, PropertyService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// JWT Authentication
var jwtKey = builder.Configuration["JWT:SecretKey"] ?? Environment.GetEnvironmentVariable("JWT_SECRET") ?? "development-secret-change-in-production";
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5000", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

var ensureDatabaseCreated =
    builder.Configuration.GetValue<bool>("Database:EnsureCreated") ||
    string.Equals(Environment.GetEnvironmentVariable("DATABASE__ENSURE_CREATED"), "true", StringComparison.OrdinalIgnoreCase);

if (ensureDatabaseCreated)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<RezDNADbContext>();
    dbContext.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

var webRootPath = app.Environment.WebRootPath;
if (!string.IsNullOrWhiteSpace(webRootPath) && Directory.Exists(webRootPath))
{
    app.UseStaticFiles();
}



var indexPath = !string.IsNullOrWhiteSpace(webRootPath)
    ? Path.Combine(webRootPath, "index.html")
    : string.Empty;

if (File.Exists(indexPath))
{
    app.MapFallbackToFile("index.html");
}

app.Run();

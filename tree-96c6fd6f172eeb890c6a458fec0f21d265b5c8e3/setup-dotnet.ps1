# RezDNA .NET Setup Script for Windows
# This script sets up the development environment for the C# team

Write-Host "=== RezDNA .NET Setup ===" -ForegroundColor Green

# Check if .NET SDK is installed
Write-Host "Checking .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version
    Write-Host "✓ .NET SDK $dotnetVersion is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ .NET SDK not found. Please install .NET 8.0 SDK from https://dotnet.microsoft.com/download" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is available
Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    # This assumes PostgreSQL is running on default port
    $pgTest = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet
    if ($pgTest) {
        Write-Host "✓ PostgreSQL is accessible on localhost:5432" -ForegroundColor Green
    } else {
        Write-Host "✗ PostgreSQL not accessible. Please ensure PostgreSQL is running" -ForegroundColor Red
    }
} catch {
    Write-Host "! Could not test PostgreSQL connection" -ForegroundColor Yellow
}

# Navigate to backend directory
Set-Location "backend\RezDNA.API"

# Restore packages
Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
dotnet restore

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Packages restored successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to restore packages" -ForegroundColor Red
    exit 1
}

# Check if Entity Framework tools are available
Write-Host "Checking Entity Framework tools..." -ForegroundColor Yellow
try {
    $efVersion = dotnet ef --version
    Write-Host "✓ Entity Framework Core tools are available: $efVersion" -ForegroundColor Green
} catch {
    Write-Host "Installing Entity Framework Core tools..." -ForegroundColor Yellow
    dotnet tool install --global dotnet-ef
}

# Create database (if connection string is configured)
Write-Host "Setting up database..." -ForegroundColor Yellow
$connectionString = (Get-Content "appsettings.json" | ConvertFrom-Json).ConnectionStrings.DefaultConnection

if ($connectionString -and $connectionString -ne "Host=localhost;Database=rezdna;Username=postgres;Password=password") {
    Write-Host "Database connection string is configured. Running migrations..." -ForegroundColor Yellow
    try {
        dotnet ef database update
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database created and migrations applied" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to apply migrations. Please check your connection string" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error running migrations: $_" -ForegroundColor Red
    }
} else {
    Write-Host "! Please update the connection string in appsettings.json" -ForegroundColor Yellow
    Write-Host "  Current: $connectionString" -ForegroundColor Gray
    Write-Host "  Update with your PostgreSQL credentials" -ForegroundColor Gray
}

# Build the solution
Write-Host "Building the solution..." -ForegroundColor Yellow
Set-Location "..\..\"
dotnet build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Solution built successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

# Setup frontend
Write-Host "Setting up frontend..." -ForegroundColor Yellow
Set-Location "frontend"

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion is installed" -ForegroundColor Green
    
    # Install npm packages
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install frontend dependencies" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
}

Set-Location ".."

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open RezDNA.sln in Visual Studio 2022"
Write-Host "2. Update connection string in backend/RezDNA.API/appsettings.json"
Write-Host "3. Set RezDNA.API as startup project"
Write-Host "4. Press F5 to run the API"
Write-Host "5. In a separate terminal, run 'npm run dev' in the frontend folder"
Write-Host ""
Write-Host "API will be available at: http://localhost:5001" -ForegroundColor Cyan
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Swagger UI: http://localhost:5001/swagger" -ForegroundColor Cyan
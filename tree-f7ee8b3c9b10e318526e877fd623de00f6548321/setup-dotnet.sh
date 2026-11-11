#!/bin/bash
# RezDNA .NET Setup Script for macOS/Linux
# This script sets up the development environment for the C# team

echo "=== RezDNA .NET Setup ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if .NET SDK is installed
echo -e "${YELLOW}Checking .NET SDK...${NC}"
if command -v dotnet &> /dev/null; then
    DOTNET_VERSION=$(dotnet --version)
    echo -e "${GREEN}✓ .NET SDK $DOTNET_VERSION is installed${NC}"
else
    echo -e "${RED}✗ .NET SDK not found. Please install .NET 8.0 SDK from https://dotnet.microsoft.com/download${NC}"
    exit 1
fi

# Check if PostgreSQL is available
echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is accessible on localhost:5432${NC}"
    else
        echo -e "${RED}✗ PostgreSQL not accessible. Please ensure PostgreSQL is running${NC}"
    fi
else
    echo -e "${YELLOW}! PostgreSQL client tools not found. Please install PostgreSQL${NC}"
fi

# Navigate to backend directory
cd backend/RezDNA.API

# Restore packages
echo -e "${YELLOW}Restoring NuGet packages...${NC}"
dotnet restore

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Packages restored successfully${NC}"
else
    echo -e "${RED}✗ Failed to restore packages${NC}"
    exit 1
fi

# Check if Entity Framework tools are available
echo -e "${YELLOW}Checking Entity Framework tools...${NC}"
if dotnet ef --version &> /dev/null; then
    EF_VERSION=$(dotnet ef --version)
    echo -e "${GREEN}✓ Entity Framework Core tools are available${NC}"
else
    echo -e "${YELLOW}Installing Entity Framework Core tools...${NC}"
    dotnet tool install --global dotnet-ef
fi

# Create database (if connection string is configured)
echo -e "${YELLOW}Setting up database...${NC}"
CONNECTION_STRING=$(grep -o '"DefaultConnection": "[^"]*"' appsettings.json | cut -d '"' -f 4)

if [ -n "$CONNECTION_STRING" ] && [ "$CONNECTION_STRING" != "Host=localhost;Database=rezdna;Username=postgres;Password=password" ]; then
    echo -e "${YELLOW}Database connection string is configured. Running migrations...${NC}"
    if dotnet ef database update; then
        echo -e "${GREEN}✓ Database created and migrations applied${NC}"
    else
        echo -e "${RED}✗ Failed to apply migrations. Please check your connection string${NC}"
    fi
else
    echo -e "${YELLOW}! Please update the connection string in appsettings.json${NC}"
    echo -e "  Current: $CONNECTION_STRING"
    echo -e "  Update with your PostgreSQL credentials"
fi

# Build the solution
echo -e "${YELLOW}Building the solution...${NC}"
cd ../..
dotnet build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Solution built successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# Setup frontend
echo -e "${YELLOW}Setting up frontend...${NC}"
cd frontend

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION is installed${NC}"
    
    # Install npm packages
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    else
        echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
    fi
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Open RezDNA.sln in Visual Studio 2022 or VS Code"
echo "2. Update connection string in backend/RezDNA.API/appsettings.json"
echo "3. Run the API: cd backend/RezDNA.API && dotnet run"
echo "4. In a separate terminal, run: cd frontend && npm run dev"
echo ""
echo -e "${CYAN}API will be available at: http://localhost:5001${NC}"
echo -e "${CYAN}Frontend will be available at: http://localhost:3000${NC}"
echo -e "${CYAN}Swagger UI: http://localhost:5001/swagger${NC}"
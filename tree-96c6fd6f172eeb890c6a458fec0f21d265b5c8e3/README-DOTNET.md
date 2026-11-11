# RezDNA Platform - .NET Migration

## Overview

This project has been successfully migrated from a Node.js/Express backend to a **Microsoft .NET stack** while maintaining the existing React frontend. The new architecture uses ASP.NET Core Web API with Entity Framework Core and PostgreSQL.

## Project Structure

```
RezDNA/
├── RezDNA.sln                     # Visual Studio Solution file
├── backend/
│   ├── RezDNA.API/                # ASP.NET Core Web API project
│   │   ├── Controllers/           # API controllers
│   │   ├── Services/              # Business logic services
│   │   ├── Program.cs             # Application entry point
│   │   └── appsettings.json       # Configuration
│   ├── RezDNA.Models/             # Shared models and DTOs
│   │   ├── Entities/              # Entity Framework models
│   │   ├── DTOs/                  # Data Transfer Objects
│   │   └── Enums/                 # Enumerations
│   └── RezDNA.Data/               # Data access layer
│       ├── RezDNADbContext.cs     # Entity Framework DbContext
│       ├── Repositories/          # Repository pattern implementation
│       └── Services/              # Data services
├── frontend/                      # React frontend application
│   ├── src/                       # React source code (unchanged)
│   ├── package.json              # Frontend dependencies
│   └── vite.config.ts            # Build configuration
└── README-DOTNET.md              # This file
```

## Technology Stack

### Backend (.NET)
- **Framework**: ASP.NET Core 8.0 Web API
- **Database**: PostgreSQL with Entity Framework Core
- **Authentication**: JWT Bearer tokens with BCrypt password hashing
- **Architecture**: Repository pattern with dependency injection
- **Logging**: Built-in ASP.NET Core logging with Serilog
- **Documentation**: Swagger/OpenAPI integration

### Frontend (React - Unchanged)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing

## Prerequisites

### Development Environment
- **Visual Studio 2022** (recommended) or **Visual Studio Code**
- **.NET 8.0 SDK** or later
- **PostgreSQL** database server
- **Node.js 18+** (for frontend development)

### Database Setup
1. Install PostgreSQL (if not already installed)
2. Create a new database named `rezdna`
3. Update the connection string in `appsettings.json`

## Getting Started

### Option 1: Visual Studio 2022
1. Open `RezDNA.sln` in Visual Studio 2022
2. Set `RezDNA.API` as the startup project
3. Update the connection string in `appsettings.json`
4. Run Package Manager Console: `Update-Database` (to create database schema)
5. Press F5 to start debugging

### Option 2: Command Line
```bash
# Clone the repository
git clone <repository-url>
cd RezDNA

# Restore .NET packages
dotnet restore

# Update database connection string in backend/RezDNA.API/appsettings.json
# Then run migrations
cd backend/RezDNA.API
dotnet ef database update

# Start the API
dotnet run
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Configuration

### Database Connection
Update `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=rezdna;Username=your_username;Password=your_password"
  }
}
```

### Environment Variables
The application supports these environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing key (change in production)
- `ASPNETCORE_ENVIRONMENT`: Development/Production

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Properties
- `GET /api/properties` - List user properties
- `POST /api/properties` - Create new property
- `GET /api/properties/{id}` - Get property by ID

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents/sign` - Generate signed upload URL
- `POST /api/documents` - Create document record

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/activity` - Get recent activity

## Development Workflow

### Backend Development
1. **Models First**: Define entities in `RezDNA.Models/Entities/`
2. **Update DbContext**: Add new DbSets to `RezDNADbContext.cs`
3. **Create Migrations**: `dotnet ef migrations add MigrationName`
4. **Update Database**: `dotnet ef database update`
5. **Implement Services**: Add business logic in `RezDNA.API/Services/`
6. **Create Controllers**: Add API endpoints in `RezDNA.API/Controllers/`

### Database Migrations
```bash
# Add new migration
dotnet ef migrations add MigrationName

# Update database
dotnet ef database update

# Remove last migration (if not applied)
dotnet ef migrations remove
```

## Key Architectural Decisions

### Repository Pattern
- All data access goes through repositories (`IRepository<T>`)
- Services contain business logic and orchestrate repositories
- Controllers are thin and handle HTTP concerns only

### Dependency Injection
- Services are registered in `Program.cs`
- Use interfaces for testability
- Scoped lifetime for database-related services

### Authentication & Authorization
- JWT Bearer tokens for stateless authentication
- Claims-based authorization with user and organization context
- Demo user accounts for testing (same as original)

## Testing

### Running Tests
```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"
```

### Test Structure
- Unit tests for services and business logic
- Integration tests for API endpoints
- Mock repositories for isolated testing

## Deployment

### Production Considerations
1. **Security**: Update JWT secret and use HTTPS
2. **Database**: Use managed PostgreSQL service
3. **Logging**: Configure structured logging with Serilog
4. **Health Checks**: Built-in health check endpoints
5. **CORS**: Configure appropriate CORS policies

### Docker Support
```dockerfile
# Example Dockerfile for API
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["backend/RezDNA.API/RezDNA.API.csproj", "RezDNA.API/"]
COPY ["backend/RezDNA.Models/RezDNA.Models.csproj", "RezDNA.Models/"]
COPY ["backend/RezDNA.Data/RezDNA.Data.csproj", "RezDNA.Data/"]
RUN dotnet restore "RezDNA.API/RezDNA.API.csproj"
COPY backend/ .
WORKDIR "/src/RezDNA.API"
RUN dotnet build "RezDNA.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "RezDNA.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "RezDNA.API.dll"]
```

## Migration Notes

### What Was Migrated
- ✅ All database models and relationships
- ✅ Authentication system (signup, login, JWT)
- ✅ Core API endpoints (properties, documents, dashboard)
- ✅ Demo user accounts
- ✅ Multi-tenant architecture with row-level security concept
- ✅ DNA ID generation logic
- ✅ CORS configuration for frontend integration

### What Needs Implementation
- 🔄 Google Cloud Storage integration (currently stubbed)
- 🔄 OpenAI policy analysis (service interface ready)
- 🔄 Email services for vendor invitations
- 🔄 Advanced maintenance and vendor management features
- 🔄 Audit logging middleware
- 🔄 Billing and usage tracking

### Breaking Changes
- API base URL changed from `http://localhost:5000/api` to `http://localhost:5001/api`
- Some response formats may have minor differences (all DTOs created for consistency)
- Error handling follows ASP.NET Core conventions

## Support & Resources

### Learning Resources
- [ASP.NET Core Documentation](https://docs.microsoft.com/en-us/aspnet/core/)
- [Entity Framework Core Documentation](https://docs.microsoft.com/en-us/ef/core/)
- [C# Programming Guide](https://docs.microsoft.com/en-us/dotnet/csharp/)

### Development Tools
- **Postman/Insomnia**: For API testing
- **Azure Data Studio**: For PostgreSQL database management
- **NuGet Package Manager**: For dependency management
- **Entity Framework Power Tools**: Visual Studio extension for EF

## Team Handoff Checklist

- [ ] Verify Visual Studio 2022 can open solution
- [ ] Confirm database connection and migrations work
- [ ] Test all API endpoints with Swagger UI
- [ ] Verify frontend connects to new backend
- [ ] Review authentication flow
- [ ] Check error handling and logging
- [ ] Validate demo user accounts work
- [ ] Confirm build and deployment process

---

**Note**: The original Node.js backend code is preserved in the `server/` directory for reference during the transition period. Once the C# team is fully operational, these files can be removed.
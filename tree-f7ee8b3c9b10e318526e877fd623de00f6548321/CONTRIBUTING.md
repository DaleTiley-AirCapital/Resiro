# Contributing to Property DNA Platform

Thank you for your interest in contributing to the Property DNA Platform! This document provides guidelines and information for contributors.

## Development Philosophy

### Modular Architecture
- The platform uses a modular design with separate user experiences for different account types
- Individual Users (Home Owners & Investors) and Company Users have distinct code paths
- Never delete existing functionality unless explicitly requested
- Add new features without breaking existing workflows

### User-Centric Design
- Simple, everyday language for non-technical users
- Progressive disclosure of advanced features
- Mobile-responsive design throughout
- Focus on homeowner benefits and ease of use

## Getting Started

### Prerequisites
- Node.js 18+ with npm
- PostgreSQL database (local or cloud)
- Basic understanding of React, TypeScript, and Express

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/property-dna-platform.git
   cd property-dna-platform
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   npm run db:seed  # Optional: populate with demo data
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

### Frontend (`client/src/`)
```
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   └── dashboard/       # Dashboard-specific components
├── pages/
│   ├── marketing/       # Public marketing pages
│   ├── dashboard.tsx    # Main properties overview
│   ├── property-*.tsx   # Property-related pages
│   └── auth/           # Authentication pages
├── hooks/              # Custom React hooks
├── lib/                # Utilities and API client
└── main.tsx           # Application entry point
```

### Backend (`server/`)
```
├── routes.ts          # API route definitions
├── db.ts             # Database connection
├── storage.ts        # Data access layer
├── auth.ts           # Authentication middleware
└── index.ts          # Server entry point
```

### Shared (`shared/`)
```
└── schema.ts         # Drizzle database schema and types
```

## Coding Standards

### TypeScript
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use Zod for runtime validation
- Prefer type-safe database queries with Drizzle

### React Components
- Use functional components with hooks
- Implement proper loading and error states
- Follow the existing component structure
- Use shadcn/ui components when possible

### Database
- All tables must include `org_id` for multi-tenancy
- Use Row-Level Security (RLS) for data isolation
- Implement comprehensive audit logging
- Never use destructive operations without explicit user request

### API Design
- RESTful endpoints with consistent naming
- Proper HTTP status codes
- JWT-based authentication
- Input validation with Zod schemas

## Feature Development Guidelines

### Individual User Features
These are the current focus and should receive priority:

1. **Properties Management**
   - Properties overview dashboard
   - Property creation and editing
   - Document upload and management
   - AI compliance checking

2. **User Experience**
   - Demo property for onboarding
   - Intuitive navigation flows
   - Mobile-responsive design
   - Clear error messages and feedback

### Company User Features
These are marked as "Coming Soon" and should not be developed yet:

- Property Manager tools
- Contractor workflows
- Developer bulk operations
- Insurance Agent integrations
- Supplier management

## Testing Guidelines

### Frontend Testing
- Test user interactions and flows
- Verify responsive design on mobile devices
- Test authentication and authorization
- Validate form submissions and error handling

### Backend Testing
- API endpoint testing
- Database query testing
- Authentication middleware testing
- File upload functionality

### Integration Testing
- End-to-end user workflows
- Database operations
- External API integrations (OpenAI, file storage)

## Database Migrations

Use Drizzle migrations for schema changes:

```bash
# Create migration
npm run db:generate

# Apply migration
npm run db:push
```

Never manually edit the database schema in production.

## Security Considerations

### Data Protection
- All uploaded documents verified with SHA-256 hashing
- Multi-tenant data isolation with RLS
- Secure file upload to cloud storage
- Comprehensive audit logging

### Authentication
- JWT tokens with proper expiration
- Password hashing with bcrypt
- Role-based access control
- Secure session management

## Pull Request Process

1. **Branch Naming**
   - Feature: `feature/property-dashboard-improvements`
   - Bug fix: `fix/auth-token-expiration`
   - Documentation: `docs/api-documentation-update`

2. **Commit Messages**
   - Use descriptive commit messages
   - Reference issue numbers when applicable
   - Follow conventional commit format

3. **Code Review**
   - All changes require code review
   - Test your changes thoroughly
   - Update documentation if needed
   - Ensure no breaking changes

4. **Documentation Updates**
   - Update README.md for new features
   - Add API documentation for new endpoints
   - Update user guides for UI changes

## Release Process

### Version Numbering
- Major: Breaking changes or significant feature additions
- Minor: New features, backwards compatible
- Patch: Bug fixes and minor improvements

### Deployment
- Staging environment testing required
- Database migration testing
- Performance impact assessment
- User experience validation

## Getting Help

### Resources
- Project documentation in `/docs`
- API documentation at `/api/docs` when running locally
- Database schema in `shared/schema.ts`

### Communication
- Use GitHub issues for bug reports and feature requests
- Include steps to reproduce for bug reports
- Provide context and use cases for feature requests

## Code of Conduct

### Professional Standards
- Respectful communication in all interactions
- Constructive feedback and code reviews
- Focus on solutions rather than problems
- Inclusive and welcoming environment

### Quality Standards
- Write clean, maintainable code
- Follow established patterns and conventions
- Test your changes thoroughly
- Document complex logic and decisions

Thank you for contributing to Property DNA Platform!
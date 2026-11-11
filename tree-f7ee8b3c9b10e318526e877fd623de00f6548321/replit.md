# RezDNA Platform

## Overview

RezDNA is a comprehensive multi-tenant platform that creates unique digital identities for properties in South Africa. Each property receives a permanent DNA code (like DNA-7841-CT, simple as a number plate) that travels with the property throughout its lifetime, documenting everything related to it. The platform addresses three critical needs: preventing insurance claim rejections through AI compliance checking, protecting against expropriation through secure off-site documentation, and connecting property owners with verified service providers.

## Core Concept

**Digital Property Identity**: Every property gets a unique, permanent identifier that cannot be duplicated. This DNA code serves as the property's digital identity throughout ownership transfers, maintaining complete documentation history, compliance records, and service provider connections.

**Revenue Model**: 
- **Homeowner-Centric Approach**: Free tier for single property with basic AI analysis and document storage
- **Premium Homeowner Access**: R99/year for maintenance reminders, supplier database access, and advanced features
- **Developer Revenue**: Developers pay to create property DNA files and access bulk documentation tools
- **Supplier Revenue**: Contractors and suppliers pay subscription fees to upload warranties and connect with property owners
- **Key Strategy**: Marketing focuses entirely on homeowner benefits - clients will naturally demand developers and suppliers join the platform

**Target Market Expansion**: Platform serves both new construction (developers create DNA files) and existing properties (homeowners create retrospective DNA files). Existing property owners represent significant market opportunity for documentation consolidation and future-proofing.

## User Experience Architecture

**Modular User Types**: The system provides tailored experiences based on signup categories:
- **Individual Users**: Home Owners & Real Estate Investors - Complete property management dashboard
- **Company Users**: Professional tools marked "Coming Soon" for future development

**Individual User Flow**:
1. Properties Overview Dashboard - View all properties with demo property included
2. Add New Property Form - ERF/Township/Municipality details with optional document uploads
3. Individual Property Dashboard - Complete property management within each property DNA
4. Modular architecture maintains separation between user types for focused development

## User Preferences

Preferred communication style: Simple, everyday language.
Never delete existing functionality unless directly instructed - only modify what is specifically requested.

## System Architecture

### Frontend Architecture
The frontend is built as a React single-page application using TypeScript and modern React patterns:

- **Framework**: React 18 with TypeScript and Vite for development tooling
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
The backend follows a REST API pattern with Express.js and Node.js:

- **Runtime**: Node.js with TypeScript and ESM modules
- **Framework**: Express.js for API routes and middleware
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **File Uploads**: Uppy integration for direct-to-cloud storage uploads

### Database Design
PostgreSQL database with multi-tenancy enforced through Row-Level Security (RLS):

- **Multi-tenancy**: Every table includes an `org_id` column for organization isolation
- **Core Entities**: Organizations, Users, Properties, Documents, Policies, Vendors, Maintenance Items
- **Audit Trail**: Comprehensive audit logging for all CRUD operations
- **Document Tracking**: SHA-256 hashing and provenance tracking for all uploaded files

### Security Architecture
Multi-layered security approach with several key principles:

- **Row-Level Security**: Database-level tenant isolation using PostgreSQL RLS policies
- **Authentication**: JWT tokens with role-based access control
- **File Security**: Signed upload URLs for direct-to-storage uploads with ACL policies
- **Audit Logging**: Append-only audit trail for all system actions
- **Data Integrity**: SHA-256 verification for all document uploads

### AI Integration
OpenAI GPT-4o integration for intelligent policy analysis:

- **Document Analysis**: Automated extraction of policy details, coverage amounts, and key dates
- **Finding Classification**: Categorization of policy findings into evidence, exclusions, maintenance requirements, and endorsements
- **Risk Assessment**: Severity scoring and confidence levels for identified issues

## External Dependencies

### Cloud Services
- **Neon Database**: PostgreSQL database hosting with serverless scaling
- **Google Cloud Storage**: Object storage for document files with ACL-based access control
- **OpenAI API**: GPT-4o model for document analysis and policy intelligence

### Core Libraries
- **Database**: Drizzle ORM with Neon serverless driver for PostgreSQL connectivity
- **Authentication**: JSON Web Tokens (jsonwebtoken) with bcrypt for secure password handling
- **File Upload**: Uppy dashboard and AWS S3 integration for seamless file management
- **UI Framework**: Radix UI primitives with Tailwind CSS for accessible, responsive design

### Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **Type Safety**: TypeScript with strict configuration across frontend and backend
- **Code Quality**: ESLint and Prettier for consistent code formatting
- **Schema Validation**: Zod for runtime type validation and form schemas

### Monitoring and Development
- **Error Tracking**: Replit error overlay integration for development debugging
- **Performance**: TanStack Query for optimized data fetching and caching
- **Development**: Hot module replacement and fast refresh for rapid iteration
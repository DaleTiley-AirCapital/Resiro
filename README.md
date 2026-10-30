# Resiro: Rust property platform

The active Railway application uses the Rust service in `rust/`, PostgreSQL and private S3-compatible storage. The public marketing page is built from the existing marketing archive without changing its source. The final server image contains the Rust binary and document-reading tools; it does not run the legacy Node or .NET application.

The property workspace is designed for phones, with private document records, original-folder provenance, checksum verification, source-grounded AI analysis, reviewable facts, assets, reminders, appointments and supplier workflows. Large document analyses save each completed section so an interruption can resume without discarding completed work. Protected PDFs retain their encrypted originals and can create a private readable copy; passwords are not retained.

Native iOS and Android clients are in [mobile](mobile/README.md). Cloud preview builds and emulator/simulator checks run in GitHub Actions. Preview binaries are not App Store or Play Store releases. Publisher accounts, production signing, physical-device acceptance and store review remain separate release gates.

Production uses `Dockerfile.rust.production`; the root `Dockerfile` has the same Rust build. Railway cache mounts are scoped to the production service. `Dockerfile.rust` is the separate preview-service configuration. Required variables are `DATABASE_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_URL_STYLE`, `OPENAI_API_KEY`, `OPENAI_MODEL` and `PRIVATE_OWNER_EMAIL`. Keep secrets in Railway, never in source or mobile clients. `IMPORT_TOKEN` is a temporary intake-only capability and should be disabled after import.

Personal property documents and intake manifests are runtime data. They must not be committed, bundled into mobile apps, or copied into shared demo accounts. Native CAD/design formats are excluded; PDF plans remain supported.

## Legacy implementation notes

The earlier implementation and its original documentation remain below for migration and rollback context. They are not the active production runtime.

---

# Property DNA Platform

A comprehensive digital property management platform that creates unique, lifelong digital identities for properties in South Africa.

## Overview

Property DNA is a multi-tenant platform that assigns each property a permanent DNA code (like DNA-7841-CT) that travels with the property throughout its lifetime. The platform addresses three critical needs:

- **Insurance Compliance**: AI-powered compliance checking to prevent claim rejections
- **Expropriation Protection**: Secure off-site documentation storage
- **Service Provider Connection**: Verified contractor and supplier network

## Key Features

### Individual User Experience (Current Focus)
- **Properties Overview Dashboard**: Manage multiple properties with visual cards
- **Demo Property System**: DNA-DEMO-CT for new user onboarding
- **Property Creation**: ERF/Township/Municipality form with document uploads
- **Individual Property Dashboard**: Complete property management per DNA code
- **Document Management**: Secure storage with SHA-256 verification
- **AI Analysis**: Policy compliance checking and recommendations

### Company Features (Coming Soon)
- Property Manager tools
- Main Contractor workflows
- Developer bulk operations
- Insurance Agent integrations
- Specialized Contractor access
- Supplier warranty management

## Revenue Model

- **Free Tier**: 1 property with basic AI analysis
- **Premium Individual**: R99/year for multiple properties and advanced features
- **Developer Revenue**: Bulk DNA creation and documentation tools
- **Supplier Revenue**: Warranty uploads and property owner connections

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query for state management
- Wouter for routing
- React Hook Form + Zod validation

### Backend
- Node.js + Express with TypeScript
- Drizzle ORM with PostgreSQL
- JWT authentication
- Uppy file uploads to cloud storage

### Infrastructure
- Neon PostgreSQL database
- Google Cloud Storage for documents
- OpenAI GPT-4o for document analysis
- Multi-tenant architecture with Row-Level Security

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/property-dna-platform.git
cd property-dna-platform
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your database and API credentials
```

4. Run database migrations
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Running Locally With Docker

This repository includes a Docker Compose setup for PostgreSQL, the current .NET API, and the preserved Replit marketing frontend from `attached_assets/React-Marketing-Site-master_1755526798974.zip`.

```bash
docker compose up --build
```

Local URLs:

- Frontend: `http://localhost:3000`
- API Swagger: `http://localhost:5001/swagger/index.html`
- API base URL: `http://localhost:5001`

The frontend matches the original Replit marketing/webpage experience. The Postgres database is available to the API inside Docker as `db:5432` and is not exposed on the host, which avoids conflicts with any local Postgres installation. Data is stored in the `postgres-data` Docker volume.

For a clean database reset:

```bash
docker compose down -v
docker compose up --build
```

## Project Structure

```
├── client/src/           # React frontend application
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and API client
├── server/              # Express backend API
│   ├── routes.ts        # API route definitions
│   ├── db.ts           # Database connection
│   └── storage.ts      # Data access layer
├── shared/             # Shared types and schemas
│   └── schema.ts       # Drizzle database schema
└── package.json        # Dependencies and scripts
```

## User Flow

### Individual Users (Home Owners & Investors)

1. **Registration**: Select "Individual" account type
2. **Properties Dashboard**: View all properties including demo property
3. **Add Property**: Fill ERF/Township/Municipality details
4. **Property Management**: Access individual property dashboard
5. **Document Upload**: Store title deeds, certificates, policies
6. **AI Analysis**: Get compliance insights and recommendations

### Navigation Architecture

- **Level 1**: Properties Overview (all user properties)
- **Level 2**: Individual Property Dashboard (property-specific features)
- **Modular Design**: Separate experiences for different user types

## Development Guidelines

### Modular Architecture
- Individual and Company user types have separate code paths
- Never delete existing functionality unless explicitly requested
- Add new features without breaking existing workflows

### Data Integrity
- All documents verified with SHA-256 hashing
- Comprehensive audit logging for all operations
- Multi-tenant isolation with PostgreSQL RLS

### User Experience
- Simple, everyday language for non-technical users
- Progressive disclosure of advanced features
- Mobile-responsive design throughout

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout

### Properties
- `GET /api/properties` - List user properties
- `POST /api/properties` - Create new property
- `GET /api/properties/:id` - Get property details
- `PUT /api/properties/:id` - Update property

### Documents
- `GET /api/properties/:id/documents` - List property documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/:id` - Download document

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support inquiries, please contact [support@propertydna.co.za](mailto:support@propertydna.co.za)

---

**Property DNA Platform** - Creating permanent digital identities for South African properties.

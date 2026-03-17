# EV Charging Logbook

A full-stack web application for tracking and visualizing EV charging sessions on an interactive map.

## Features

- **Interactive Map**: Full-screen MapLibre GL map with clickable markers for each charging session
- **Session Details**: Side panel with photo gallery and technical summary (station name, operator, kW, battery %)
- **New Log Modal**: Form with validation for logging new charging sessions with photos
- **Spatial Queries**: PostGIS support for nearby session searches
- **Authentication**: Supabase Auth with Google OAuth
- **Photo Storage**: Multi-file photo upload to Supabase Storage

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Maps**: MapLibre GL (free, no API key needed)
- **Styling**: Panda CSS
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for local development)
- Supabase account (or use local Docker setup)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ev-log
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Generate Panda CSS:
```bash
npm run prepare
```

### Local Development with Docker

Run the full stack locally with PostgreSQL + PostGIS:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL with PostGIS on port 5432
- MinIO (S3-compatible storage) on ports 9000/9001
- Next.js dev server on port 3000

### Production Deployment (Unraid)

1. Copy `docker-compose.prod.yml` to your Unraid server

2. Create a `.env` file with production values:
```env
DB_PASSWORD=your-secure-password
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
APP_PORT=3000
```

3. Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Database Setup

Run the migrations on your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL files in supabase/migrations/
```

Required migrations:
- `001_initial_schema.sql`: Creates sessions table with PostGIS support
- `002_storage_setup.sql`: Creates photos bucket with RLS policies

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | For admin operations |
| `DATABASE_URL` | PostgreSQL connection string | For migrations |

## Project Structure

```
ev-log/
├── app/                 # Next.js App Router
│   ├── layout.tsx      # Root layout with MapLibre CSS
│   ├── page.tsx        # Main page with map & side panel
│   └── index.css       # Panda CSS entry
├── components/
│   ├── Map.tsx         # MapLibre GL map component
│   ├── SidePanel.tsx   # Session detail side panel
│   └── NewLogModal.tsx # New session form modal
├── lib/
│   ├── supabase.ts     # Supabase client
│   ├── database.types.ts # TypeScript types
│   └── validation.ts   # Zod schemas
├── supabase/
│   └── migrations/     # Database migrations
├── docker-compose.yml  # Local dev stack
├── docker-compose.prod.yml # Production stack
└── panda.config.ts     # Panda CSS config
```

## Database Schema

### sessions table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| station_name | TEXT | Charging station name |
| operator | TEXT | Charging network operator |
| max_kw | DECIMAL | Max kW observed |
| battery_start | INTEGER | Starting battery % |
| battery_end | INTEGER | Ending battery % |
| location | GEOGRAPHY | PostGIS point (lat/lng) |
| photos | TEXT[] | Array of photo URLs |
| notes | TEXT | Optional notes |
| created_at | TIMESTAMPTZ | Creation timestamp |

## Spatial Queries

The database includes a `nearby_sessions` function for finding sessions within a radius:

```sql
SELECT * FROM nearby_sessions(1.3521, 103.8198, 5000);
-- Returns sessions within 5km of the given coordinates
```

## License

MIT

# EV Charging Logbook

A personal EV charging session tracker with map visualization.

## Features

- 🗺️ Interactive MapLibre GL map with charging session markers
- 📸 Photo gallery for each charging session
- 📊 Technical data tracking (kW, battery %, operator)
- 🔐 User authentication (email magic links)
- 🏠 Fully self-hosted with local Supabase

## Quick Start (Local Development)

### 1. Start Local Supabase

```bash
cd ~/ev-log
supabase start
```

This starts:
- PostgreSQL + PostGIS database
- Supabase Auth (with email magic links)
- Supabase Storage (for photos)
- Supabase Studio UI at http://127.0.0.1:54323
- Mailpit (catch-all email) at http://127.0.0.1:54324

### 2. Install Dependencies

```bash
npm install
npm run prepare  # Generate Panda CSS
```

### 3. Start Next.js Dev Server

```bash
npm run dev
```

Open http://localhost:3000

### 4. Sign In

1. Click "Sign In with Email"
2. Enter any email address
3. Check Mailpit at http://127.0.0.1:54324 for the magic link
4. Click the link to authenticate

## Production Deployment (Unraid)

### Option 1: Supabase CLI on Unraid

1. SSH into your Unraid server
2. Install Supabase CLI
3. Clone the repo and run `supabase start --ip 0.0.0.0`
4. Update `.env.local` with your Unraid server IP
5. Build and run the Next.js container

### Option 2: Docker Compose Stack

For a simpler setup, use the included `docker-compose.unraid.yml`:

```bash
# On your Unraid server
docker-compose -f docker-compose.unraid.yml up -d
```

**Note:** You'll need to set up Supabase separately or use the cloud version for production.

## Environment Variables

Copy `.env.local.example` to `.env.local` and update:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For local development, these are auto-configured by `supabase start`.

## Database Schema

The app uses two migrations:

1. **001_initial_schema.sql** - Sessions table with PostGIS support
2. **002_storage_setup.sql** - Storage bucket for photos

Run migrations with:
```bash
supabase migration up
```

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Panda CSS
- **Maps:** MapLibre GL (OpenStreetMap tiles)
- **Database:** PostgreSQL + PostGIS
- **Backend:** Supabase (Auth, Database, Storage)
- **Forms:** React Hook Form + Zod

## License

MIT

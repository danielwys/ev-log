# EV Charging Logbook

A personal EV charging session tracker with map visualization and public sharing.

## Features

- 🗺️ Interactive MapLibre GL map with charging session markers
- 📸 Photo gallery for each charging session  
- 📊 Technical data tracking (kW, battery %, operator, hardware model)
- 🔐 OAuth authentication with whitelist-based access control
- 🤖 Agent service for conversational session creation
- 🏠 Fully self-hosted (PostgreSQL + PostgREST + Next.js)

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────→│  PostgREST  │────→│  PostgreSQL │
│  (Port 3000)│     │  (Port 3001)│     │+ PostGIS    │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ↓
┌─────────────┐
│   Agent     │ ← Conversational session creation
│  (API Key)  │   via Telegram/OpenClaw
└─────────────┘
```

## Quick Start (Local Development)

### 1. Start Database Stack

```bash
cd ~/ev-log
docker-compose up -d db postgrest
```

This starts:
- PostgreSQL 17 + PostGIS on port 5432
- PostgREST API on port 3001

### 2. Initialize Database

```bash
npm run db:init
```

### 3. Configure Environment

Copy `.env.local.example` to `.env.local` and update:

```bash
# Required secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
AGENT_API_KEY=$(openssl rand -hex 32)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
```

### 4. Install & Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Authentication

### User Sign-In
1. Click "Sign In" → Google OAuth
2. User is added to database on first login
3. Admin must whitelist user for write access

### Agent Service
- API key authentication for automated session creation
- Conversational interface via OpenClaw/Telegram
- Vision/OCR for extracting data from photos

## Production Deployment (Unraid)

### Using Docker Compose

```bash
# On your Unraid server
docker-compose up -d
```

This starts:
- PostgreSQL + PostGIS (persistent storage)
- PostgREST (REST API)
- Next.js app

### Manual Steps

1. **Generate secrets:**
   ```bash
   openssl rand -base64 32  # NEXTAUTH_SECRET
   openssl rand -base64 32  # JWT_SECRET  
   openssl rand -hex 32     # AGENT_API_KEY
   ```

2. **Set up Google OAuth:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `https://ev.yourdomain.com/api/auth/callback/google`

3. **Configure Cosmos Cloud:**
   - Route `/` to Next.js container (port 3000)
   - Enable SSL with Let's Encrypt

4. **Add first whitelisted user:**
   ```sql
   INSERT INTO user_whitelist (user_id, email) 
   VALUES ('your-google-id', 'you@example.com');
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_SECRET` | NextAuth encryption key | Yes |
| `NEXTAUTH_URL` | App URL for OAuth callbacks | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Yes |
| `JWT_SECRET` | PostgREST JWT signing key | Yes |
| `AGENT_API_KEY` | API key for agent service | For agent |
| `DATABASE_URL` | PostgreSQL connection string | Yes |

See `.env.local.example` for full list.

## Database Schema

### Tables

- **sessions** - Charging session records with PostGIS location
- **user_whitelist** - Authorized users for write access
- **plugshare_cache** - External location metadata
- **vehicle_config** - User vehicle specifications

### Migrations

Located in `postgres/init/`:
- `01_schema.sql` - Core tables and types
- `02_roles.sql` - PostgREST roles and permissions
- `03_seed.sql` - Initial data
- `04_service_account.sql` - Agent service account

## Agent Service

Create sessions via conversation:

1. Send photos (dashboard, charger) to agent
2. Agent extracts data via vision/OCR
3. Confirms details before creation
4. Creates session via `/api/sessions/agent-create`

**API Endpoint:** `POST /api/sessions/agent-create`
**Auth:** `X-API-Key` header

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React + TypeScript |
| Styling | Panda CSS + Tailwind |
| Maps | MapLibre GL |
| Backend API | PostgREST |
| Database | PostgreSQL 17 + PostGIS |
| Auth | NextAuth.js (Google OAuth) |
| Validation | Zod |
| Agent | OpenClaw + Vision API |

## Documentation

- [`MIGRATION.md`](./MIGRATION.md) - Migration from Supabase guide
- [`references/production-checklist-v2.md`](./references/production-checklist-v2.md) - Production deployment checklist
- [`references/ev-logbook-documentation.md`](./references/ev-logbook-documentation.md) - Full technical documentation

## License

MIT

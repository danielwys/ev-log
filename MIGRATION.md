# EV Logbook - PostgREST + NextAuth Migration

This is the migrated version of the EV Logbook app, using:
- **PostgreSQL + PostGIS** for database (instead of Supabase)
- **PostgREST** for REST API (instead of Supabase client)
- **NextAuth.js** with Google OAuth (instead of Supabase Auth)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App    │────▶│   PostgREST      │────▶│   PostgreSQL    │
│   (Port 3000)    │     │   (Port 3001)    │     │   (Port 5432)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### 1. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
4. Copy the Client ID and Client Secret

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `JWT_SECRET` - Generate with `openssl rand -base64 32`

### 3. Start the Services

```bash
# Install dependencies
npm install

# Start PostgreSQL and PostgREST
docker-compose up -d db postgrest

# Wait for database to be ready, then run migrations
npm run db:init

# Start the Next.js app
docker-compose up -d app
# OR for development:
npm run dev
```

### 4. Whitelist Users

The app uses a whitelist to control who can create/edit sessions. To add users:

```sql
-- Connect to the database
psql $DATABASE_URL

-- Add user to whitelist (use actual Google OAuth sub after first login)
INSERT INTO user_whitelist (user_id, email) 
VALUES ('google-oauth-sub', 'user@example.com');
```

## Key Changes from Supabase

### Authentication
- **Before**: Supabase Auth with magic link
- **After**: NextAuth.js with Google OAuth

### Database Access
- **Before**: Supabase client with RLS policies
- **After**: PostgREST REST API with role-based access

### File Storage
- **Before**: Supabase Storage
- **After**: Local file storage in `public/uploads/`
- For production, use S3/Cloudflare R2/etc.

### Schema Changes
- `user_id` column changed from `UUID REFERENCES auth.users` to `TEXT` (stores Google OAuth sub)
- Added `user_email` column for easier user identification
- RLS policies removed in favor of PostgREST role switching

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `POSTGREST_URL` | Internal PostgREST URL | Yes |
| `NEXT_PUBLIC_POSTGREST_URL` | Public PostgREST URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Yes |
| `NEXTAUTH_URL` | App URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `JWT_SECRET` | PostgREST JWT secret | Yes |
| `DB_PASSWORD` | PostgreSQL password | Yes |

## Files Changed

### New Files
- `postgres/init/01_schema.sql` - Database schema
- `postgres/init/02_roles.sql` - PostgREST roles
- `postgres/init/03_seed.sql` - Initial data
- `auth.ts` - NextAuth.js configuration
- `app/api/auth/[...nextauth]/route.ts` - Auth API routes
- `app/api/upload/route.ts` - File upload handler
- `lib/db.ts` - PostgREST client

### Modified Files
- `package.json` - Removed Supabase, added NextAuth
- `docker-compose.yml` - Postgres + PostgREST + App
- `app/page.tsx` - Uses NextAuth and new DB client
- `app/layout.tsx` - SessionProvider wrapper
- `app/api/sessions/[id]/route.ts` - Uses new auth
- `app/api/plugshare/route.ts` - Uses PostgREST
- `components/NewLogModal.tsx` - Uses new DB client
- `components/SidePanel.tsx` - Uses new types
- `components/Map.tsx` - Uses new types
- `lib/validation.ts` - Cleaned up

### Removed Files
- `lib/supabase.ts` - Supabase client
- `lib/database.types.ts` - Supabase generated types

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs db
```

### PostgREST Not Working
```bash
# Check PostgREST logs
docker-compose logs postgrest

# Test API directly
curl http://localhost:3001/sessions
```

### Auth Issues
- Make sure Google OAuth redirect URI is correct
- Check `NEXTAUTH_URL` matches your actual URL
- Verify `NEXTAUTH_SECRET` is set

### Can't Create Sessions
- User must be whitelisted
- Check `user_whitelist` table in database
- Verify `user_id` matches Google OAuth `sub`
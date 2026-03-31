# EV Logbook Production Checklist (PostgREST + NextAuth)

*Updated for new architecture: PostgreSQL + PostgREST + NextAuth.js*

## Infrastructure

### Local Development → Production Server (Unraid)
- [ ] **PostgreSQL**: Move from local Docker to Unraid
  - Persistent storage on Unraid array/cache
  - Automated backups (daily snapshots)
- [ ] **PostgREST**: Deploy to Unraid
  - Port mapping: 3001 (or custom)
  - JWT secret secured in Unraid environment
- [ ] **Next.js App**: Containerized deployment
  - Production build (not dev server)
  - Environment variables configured
- [ ] **Reverse Proxy**: Cosmos Cloud setup
  - Route `/` → Next.js (port 3000)
  - Route `/api/postgrest/*` → PostgREST (port 3001) - optional
- [ ] **SSL/HTTPS**: Let's Encrypt certificates
- [ ] **Domain**: ev.dawo.me → Unraid IP (Cosmos Cloud reverse proxy + SSL)

## Security

### Critical Secrets (Unraid Environment)
- [ ] `NEXTAUTH_SECRET` — Generate with `openssl rand -base64 32`
- [ ] `JWT_SECRET` (PostgREST) — Separate secret, same generation
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — See below
- [ ] `DB_PASSWORD` — Strong password, not default

**Why Google OAuth?**
NextAuth.js needs an OAuth provider for authentication. Google is the simplest option:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials (takes 2 minutes)
3. Add `https://ev.dawo.me/api/auth/callback/google` as authorized redirect URI
4. Copy Client ID and Secret to Unraid environment variables

**Alternative**: If you prefer not using Google, we can set up:
- GitHub OAuth (similar process)
- Authelia/Keycloak on Unraid (more work, fully self-hosted)

### Access Control
- [ ] **PostgREST**: `web_anon` role for public reads only
- [ ] **PostgREST**: `web_user` role for writes (requires JWT)
- [ ] **Next.js**: API routes enforce whitelist before PostgREST calls
- [ ] **CORS**: Restrict PostgREST to your domain only

### File Uploads
- [ ] **Local filesystem** (`public/uploads/`)
  - Mounted to Unraid array for persistence
  - Included in daily backups
  - Simple, no external dependencies

## Operations

### Backups
- [ ] **PostgreSQL**: Daily automated dumps
  - Unraid User Scripts plugin or cron
  - Store on array + offsite (Wasabi/Backblaze)
  - Keep 30 days local + 90 days offsite
- [ ] **Uploads**: Included in Unraid array (already redundant)
  - Array parity protects against drive failure
  - Optional: sync to offsite for disaster recovery
- [ ] **Test restore**: Quarterly drill

### Monitoring
- [ ] **Uptime**: Ping monitoring (Uptime Kuma on Unraid)
  - Next.js app health endpoint
  - PostgREST health check
  - PostgreSQL connectivity
- [ ] **Logs**: Centralized logging
  - Docker logs → Unraid syslog or Loki
  - Retention: 30 days
- [ ] **Alerts**: Telegram/Discord on downtime

### Performance
- [ ] **CDN**: Cloudflare in front of custom domain
  - Static assets caching
  - DDoS protection
- [ ] **Database**: Connection pooling (PgBouncer) if needed
  - Probably overkill for single-user app
- [ ] **Build**: Optimized Next.js production build
  - Tree shaking, code splitting
  - Image optimization

## DevOps

### CI/CD
- [ ] **GitHub Actions**: Auto-deploy on push to main
  - Build Docker image
  - SSH to Unraid, pull, restart
  - Or: Watchtower on Unraid for auto-pull

### Database Migrations
- [ ] **Schema changes**: Versioned migrations
  - `postgres/migrations/001_*.sql` pattern
  - Run before app deploy
  - Backup before migration

### Rollback Strategy
- [ ] **App**: Previous Docker image tag ready
- [ ] **Database**: Pre-migration backup restoreable
- [ ] **Config**: Environment variables versioned

## Data Migration (from local dev)

### Current State
- [ ] Export local sessions: `pg_dump --data-only ...`
- [ ] Export local whitelist entries
- [ ] Copy local uploads to production

### Import to Production
- [ ] Import to Unraid PostgreSQL
- [ ] Verify data integrity
- [ ] Add your Google account to whitelist (after first login)

## Cost Estimates

| Component | Cost (SGD) | Notes |
|-----------|------------|-------|
| Domain (dawo.me) | $0 | Already owned |
| Cloudflare | Free | Already configured |
| Google OAuth | Free | Required for sign-in |
| File Storage | $0 | Local on Unraid |
| Unraid | $0 | Your hardware |
| Backups | ~$2/mo | Wasabi/Backblaze for DB dumps |
| **Total** | **~$2/year** | vs $300+/year Supabase Cloud |

## Priority Order

### Phase 1: Basic Production (This Weekend)
1. Deploy to Unraid with persistent storage
   - ev.dawo.me DNS → Unraid IP (Cloudflare already done)
   - Cosmos Cloud reverse proxy + SSL
2. Google OAuth configured
   - 2-minute setup in Google Cloud Console
3. Basic backups
   - Daily PostgreSQL dumps to Unraid array

### Phase 2: Hardening (Week 2-3)
5. Offsite backups for DB dumps
6. Monitoring/alerting (Uptime Kuma)
7. CI/CD pipeline (GitHub Actions or Watchtower)

### Phase 3: Nice-to-Have (Later)
9. PgBouncer connection pooling
10. Multi-region backups
11. Automated integration tests

## Pre-Launch Checklist

- [ ] App boots without errors
- [ ] Google OAuth sign-in works
- [ ] Whitelist restricts writes correctly
- [ ] Map displays all sessions
- [ ] Can create new session with photos
- [ ] Photos display correctly
- [ ] Edit session works
- [ ] Delete session works
- [ ] Mobile responsive
- [ ] SSL certificate valid
- [ ] Backup job running
- [ ] Monitoring alerts working

## Architecture Diagram (Production)

```
User → Cloudflare (SSL + CDN)
            ↓
      ev.dawo.me
            ↓
    Cosmos Cloud (Unraid)
            ↓
    ┌─────────────────┐
    │   Next.js App   │ ← Docker container (port 3000)
    │   (Port 3000)   │   - Serves UI + API routes
    └────────┬────────┘   - Local uploads mounted
             │
    ┌────────▼────────┐
    │   PostgREST     │ ← Docker container (port 3001)
    │   (Port 3001)   │   - REST API for database
    └────────┬────────┘   - Internal only
             │
    ┌────────▼────────┐
    │   PostgreSQL    │ ← Docker container (port 5432)
    │   + PostGIS     │   - Persistent on Unraid array
    └─────────────────┘   - Daily backups
             │
    ┌────────▼────────┐
    │  Unraid Array   │ ← Photos + DB backups
    │  (/mnt/user/)   │
    └─────────────────┘
```

## Notes

- **Domain**: ev.dawo.me (Cloudflare + Cosmos Cloud SSL already configured)
- **Storage**: Images stay local on Unraid array (parity protected)
- **Simpler than Supabase Cloud**: 3 containers vs 12+ managed services
- **Trade-off**: You own the ops (but it's minimal)
- **Single point of failure**: Unraid server (acceptable for personal use)

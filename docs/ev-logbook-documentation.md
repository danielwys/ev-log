# EV Charging Logbook

A self-hosted web application for tracking and visualizing electric vehicle charging sessions.

## Overview

The EV Charging Logbook enables EV owners to document charging experiences across different networks, track reliability of charging hardware, and build a personal database of charging locations with performance metrics.

### Core Purpose

- **Log charging sessions** with location, power output, and success/failure data
- **Visualize charging history** on an interactive map
- **Track charger reliability** by hardware model and operator
- **Calculate charging efficiency** from delivered vs. stored energy
- **Public sharing** of charging location data with personal control over submissions

## Features

### Session Logging
- Record charging location (GPS coordinates)
- Track power output (kW observed)
- Log battery state of charge (start/end percentages)
- Document charger hardware model and firmware
- Record connector attempts and successes
- Calculate energy efficiency (delivered vs. stored kWh)
- Photo attachments for documentation
- Price per kWh tracking

### Map Visualization
- Interactive MapLibre GL map with charging markers
- Location clustering for multiple sessions at same site
- Color-coded pins indicating reliability:
  - **Green**: High success rate (>75%)
  - **Yellow**: Mixed results or requires technique
  - **Red**: Frequent failures
- Sidebar with session history per location
- Detailed session view with technical data

### Data Analysis
- Per-location reliability tracking
- Hardware/firmware compatibility notes
- Efficiency calculations per session
- Charging speed analysis
- Cost tracking per operator

### Access Control
- **Public read**: Anyone can view the map and charging data
- **Authenticated write**: Only whitelisted users can add/edit sessions
- OAuth-based authentication (Google/GitHub)

### Agent Service Role

An alternative input method for data entry via conversational agent (OpenClaw), designed for quick mobile capture while charging.

**Use Case:**
- User is at charging station, takes photos of dashboard and charger
- Sends photos + location via Telegram to agent
- Agent extracts data via OCR/vision, asks clarifying questions
- Agent creates session via API on user's behalf

**Architecture:**
```
User (Telegram) → OpenClaw Agent → Next.js API → PostgREST → PostgreSQL
                        ↓
                Vision/OCR processing
                (dashboard readings, charger model)
```

**Security Model:**
- API key authentication (`X-API-Key` header)
- Service account pre-whitelisted in database
- Gateway pattern: Agent → Next.js API → PostgREST (PostgREST not publicly exposed)
- Confirmation required before record creation

**Data Collection Flow:**
1. User initiates: "Charged at [location]" or sends photos
2. Agent requests: Dashboard photo, charger photo, location (if not provided)
3. Agent extracts: Voltage, current, kW, SoC from dashboard (OCR/vision)
4. Agent asks: Missing required fields (price, errors, notes)
5. Agent confirms: Reads back all data for verification
6. Agent creates: POST to `/api/sessions/agent-create`
7. Agent replies: Success message with link to view session

**Photo Handling:**
- Photos uploaded via `/api/upload` (same as web UI)
- Stored in `public/uploads/`
- URLs included in session record

**Benefits:**
- Faster data entry while charging (no web form navigation)
- Leverages mobile camera + Telegram location sharing
- OCR reduces manual data entry errors
- Natural conversation interface

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (React, TypeScript) |
| Styling | Panda CSS + Tailwind |
| Maps | MapLibre GL |
| Backend API | PostgREST (REST API over PostgreSQL) |
| Database | PostgreSQL 17 + PostGIS |
| Auth | NextAuth.js with OAuth providers |
| Forms | React Hook Form + Zod validation |

### Database Schema

#### Core Tables

**`sessions`** — Charging session records
```
id (UUID, PK)
user_id (TEXT) — OAuth provider ID
user_email (TEXT)
station_name (TEXT)
operator (TEXT)
max_kw (DECIMAL) — Observed power output
battery_start/end (DECIMAL) — State of charge %
location (GEOGRAPHY POINT) — GPS coordinates
photos (TEXT[])
notes (TEXT)

-- Technical details
charger_hardware_model (TEXT)
charger_software (TEXT)
cable_amp_limit (INTEGER)
stall_id (TEXT)
plug_id (TEXT)
connectors_tried (TEXT[])
successful_connectors (TEXT[])
attempts (INTEGER)
successes (INTEGER)
error_code (TEXT)
failure_type (ENUM: handshake, derating, interruption, incompatible, other)
technique_required (BOOLEAN)
technique_notes (TEXT)

-- Calculated fields
price_per_kwh (DECIMAL)
pin_color (ENUM: green, yellow, red)
kwh_delivered (DECIMAL)
created_at, updated_at (TIMESTAMPTZ)
```

**`user_whitelist`** — Authorized editors
```
user_id (TEXT, PK) — OAuth provider ID
email (TEXT)
created_at (TIMESTAMPTZ)
```

**`plugshare_cache`** — External location metadata
```
id (UUID, PK)
plugshare_id (TEXT, UNIQUE)
name, address, operator (TEXT)
latitude, longitude (DECIMAL)
created_at, updated_at (TIMESTAMPTZ)
```

**`vehicle_config`** — User vehicle specifications
```
id (UUID, PK)
user_id (TEXT)
vehicle_name (TEXT)
battery_capacity_kwh (DECIMAL)
max_charging_kw (DECIMAL)
platform_voltage (INTEGER)
```

### Authentication Flow

```
User → Google/GitHub OAuth → NextAuth.js
                              ↓
                    Session cookie issued
                              ↓
                    User attempts write
                              ↓
                    Next.js API route checks
                    user_whitelist table
                              ↓
                    Whitelisted? → PostgREST call
                    Not whitelisted? → 403 Forbidden
```

### API Structure

**Public Endpoints (PostgREST)**
- `GET /sessions` — List all sessions (public read)
- `GET /sessions?id=eq.{id}` — Single session details
- `GET /plugshare_cache` — Location metadata

**Protected Endpoints (Next.js API Routes)**
- `POST /api/sessions` — Create session (whitelist check)
- `PUT /api/sessions/{id}` — Update session (whitelist + ownership check)
- `DELETE /api/sessions/{id}` — Delete session (whitelist + ownership check)
- `POST /api/upload` — Photo upload (whitelist check)

**Authentication Endpoints**
- `GET/POST /api/auth/[...nextauth]` — NextAuth.js handlers

**Agent Service Endpoints**
- `POST /api/sessions/agent-create` — Create session via agent (API key auth)
- `POST /api/upload` — Photo upload (API key or session auth)

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Map View      │  │  Session Form   │  │  Auth State  │ │
│  │  (Public)       │  │ (Authenticated) │  │              │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
└───────────┼────────────────────┼──────────────────┼─────────┘
            │                    │                  │
            │  Public Read       │  Authenticated   │ OAuth
            │                    │  Write           │
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  OpenClaw Agent (Telegram)                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  - Vision/OCR processing                                │ │
│  │  - Conversational data collection                       │ │
│  │  - API key authentication                               │ │
│  └────────────────────────┬────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │ API Key (X-API-Key header)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App (Port 3000)                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  API Routes                                             │ │
│  │  - Whitelist check middleware                           │ │
│  │  - Session CRUD handlers                                │ │
│  │  - Photo upload handling                                │ │
│  │  - Agent service endpoint (/api/sessions/agent-create)  │ │
│  └────────────────────────┬────────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgREST API (Port 3001)                 │
│         (JWT-secured REST API over PostgreSQL)               │
│         (INTERNAL ONLY - not exposed to public)              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL + PostGIS (Port 5432)                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Tables: sessions, user_whitelist,                      │ │
│  │          plugshare_cache, vehicle_config                │ │
│  │                                                         │ │
│  │  Spatial queries via PostGIS                            │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Deployment

### Container Architecture

Three containers via Docker Compose:

1. **`ev-log-db`** — PostgreSQL with PostGIS extension
   - Port: 5432
   - Persistent volume for data
   - Includes PostGIS for spatial queries

2. **`ev-log-api`** — PostgREST REST API
   - Port: 3001
   - No persistent state (stateless)
   - Internal network only (or restricted external)

3. **`ev-log-app`** — Next.js application
   - Port: 3000
   - Production build or development server
   - Environment variables for configuration

### Environment Configuration

```bash
# Database
DATABASE_URL=postgres://postgres:password@db:5432/ev_log
DB_PASSWORD=secure_password

# PostgREST
POSTGREST_URL=http://postgrest:3000
NEXT_PUBLIC_POSTGREST_URL=http://localhost:3001
JWT_SECRET=random_secret_for_postgrest

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=random_secret_for_nextauth
GOOGLE_CLIENT_ID=oauth_client_id
GOOGLE_CLIENT_SECRET=oauth_client_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Reverse Proxy (Production)

Cosmos Cloud or similar handles:
- SSL termination (Let's Encrypt)
- Domain routing (ev.example.com)
- WebSocket support for dev mode

### File Storage

Photos stored locally in container filesystem:
- Path: `public/uploads/`
- Mounted to host volume for persistence
- Included in backup strategy

## Development

### Local Setup

```bash
# Clone repository
cd ev-log

# Install dependencies
npm install

# Start database and API
docker-compose up -d db postgrest

# Run database migrations
npm run db:init

# Start development server
npm run dev
```

### Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:init` | Initialize database schema |
| `docker-compose up -d` | Start all services |

## Data Model

### Efficiency Calculation

```
kWh_stored = (battery_end - battery_start) / 100 * battery_capacity
Efficiency = (kWh_stored / kWh_delivered) * 100
```

Example:
- 20% → 80% SOC on 75kWh battery = 45kWh stored
- 50kWh delivered by charger
- Efficiency = 90%

### Pin Color Logic

```
IF technique_required: yellow
ELSE IF success_rate > 0.75: green
ELSE IF success_rate >= 0.25: yellow
ELSE: red
```

### Location Clustering

Sessions within 100m radius are grouped as single map marker. Clicking reveals sidebar with session history for that location.

## Security Considerations

- **No sensitive data** in public endpoints
- **Whitelist enforcement** at application layer
- **Service role key** never exposed to client
- **File uploads** restricted by whitelist
- **OAuth only** — no password storage

## Technical Decisions

### Why PostgREST instead of a custom API?

**Decision:** Use PostgREST (automatic REST API over PostgreSQL) rather than building a custom Node.js/Express API.

**Rationale:**
- **Less code to maintain** — No hand-written CRUD endpoints
- **Automatic OpenAPI spec** — Self-documenting API
- **PostgreSQL-native** — RLS policies, stored procedures, PostGIS functions work out of the box
- **Performance** — Written in Haskell, handles connection pooling efficiently
- **Schema-driven** — API changes are just database migrations

**Trade-off:** Less flexible for complex business logic. Custom Next.js API routes handle auth and whitelist checks where needed.

### Why NextAuth.js with whitelist?

**Decision:** OAuth-only authentication with explicit whitelist for write access.

**Rationale:**
- **No password management** — OAuth providers handle security
- **Whitelist = simple access control** — No complex RBAC for single-user + occasional guests use case
- **Public read without auth** — Map data is useful to community

**Trade-off:** Requires manual whitelist management. No self-service signup for contributors.

### Why local file storage for photos?

**Decision:** Store uploaded photos on local filesystem rather than S3/R2.

**Rationale:**
- **Simplicity** — No external service dependencies
- **Cost** — $0 for personal use
- **Backup strategy** — Photos included in array backups

**Trade-off:** Not CDN-optimized. For high-traffic public sites, cloud storage would be better.

### Why MapLibre GL over Google Maps?

**Decision:** Use MapLibre GL (open-source) instead of Google Maps.

**Rationale:**
- **No API key required** — Uses free tile providers (OpenFreeMap)
- **Privacy** — No Google tracking
- **Self-hostable** — Can run map tiles locally if needed
- **Performance** — Vector tiles, smooth rendering

**Trade-off:** Less mature ecosystem. Some advanced features require more setup.

### Why PostgreSQL + PostGIS over MongoDB/document store?

**Decision:** Use relational database with spatial extensions.

**Rationale:**
- **Charging data is relational** — Sessions link to locations, users, vehicles
- **Spatial queries** — PostGIS enables "find sessions near point" efficiently
- **ACID compliance** — Data integrity for financial/usage tracking
- **Mature tooling** — Backup, migration, monitoring tools are battle-tested

**Trade-off:** Schema changes require migrations. Less flexible than schemaless for rapid iteration.

### Why gateway pattern for agent service?

**Decision:** Route agent requests through Next.js API rather than direct PostgREST access.

**Rationale:**
- **Security** — PostgREST stays on internal network only, not exposed to public
- **Consistency** — Same whitelist check as web UI
- **API key handling** — Centralized in Next.js, not scattered to agents
- **Audit trail** — All writes go through application layer

**Trade-off:** Additional hop adds ~5-10ms latency. Negligible for use case.

**Alternative considered:** Direct PostgREST access with JWT. Rejected because it would require exposing PostgREST or running agent on same machine.

### Why conversational agent for data entry?

**Decision:** Add OpenClaw agent as alternative input method alongside web UI.

**Rationale:**
- **Mobile convenience** — No browser navigation while charging
- **Vision capabilities** — OCR extracts dashboard readings automatically
- **Natural interface** — Conversation better than form-filling on phone
- **Telegram integration** — Location sharing, photo handling built-in

**Trade-off:** Requires agent availability. Web UI remains fallback.

**Architecture:**
- Agent processes photos via vision/OCR
- Collects missing fields conversationally
- Confirms before creating (no accidental entries)
- Uses API key auth to gateway endpoint

## Trade-offs & Constraints

### Current Limitations

| Area | Current State | Constraint |
|------|---------------|------------|
| **Auth** | Google/GitHub OAuth only | No email/password fallback |
| **Images** | Local filesystem | Single-server deployment |
| **Real-time** | Poll every 3s | No WebSocket updates |
| **Mobile** | Responsive web | No native app features |
| **Offline** | None | Requires connectivity |

### Scalability Boundaries

- **Photos:** ~10GB/year at 100 sessions/month (5 photos/session, 2MB each)
- **Database:** ~1GB/year at 100 sessions/month
- **Concurrent users:** PostgREST handles thousands of reqs/sec; Next.js is the bottleneck

### When This Architecture Breaks Down

- **Multi-region deployment** — Would need managed Postgres (RDS/Cloud SQL)
- **High photo traffic** — Would need CDN + object storage
- **Team collaboration** — Would need proper RBAC instead of whitelist
- **Mobile-first usage** — Would benefit from native app or PWA offline support

## Potential Improvements

### Technical Debt

1. **Type safety** — Generate TypeScript types from database schema (use kysely-codegen or similar)
2. **API client** — Replace raw fetch with generated client (openapi-typescript)
3. **Error handling** — Standardize error responses across PostgREST and Next.js routes
4. **Testing** — Add integration tests for API routes and database operations
5. **Monitoring** — Add structured logging (Winston/Pino) and error tracking (Sentry)

### Feature Enhancements

1. **Charging curves** — Track SOC over time during session, visualize power curve
2. **Route planning integration** — Import from A Better Route Planner
3. **Cost analytics** — Monthly/annual cost breakdown by operator
4. **Sharing** — Public profile pages with aggregated stats
5. **Notifications** — Email alerts for new charging locations nearby
6. **Import/Export** — CSV/JSON export for data portability
7. **Duplicate detection** — Auto-merge sessions at same location within time window

### Performance Optimizations

1. **Image optimization** — Convert uploads to WebP, generate thumbnails
2. **Database indexing** — Review query patterns, add composite indexes
3. **Caching** — Redis for session data, CDN for static assets
4. **Pagination** — Cursor-based pagination for large session lists
5. **Bundle size** — Code splitting, lazy load map component

## Roadmap to Production

### Phase 1: Basic Production (Complete)

- [x] Core application functional
- [x] Database schema finalized
- [x] Local development environment
- [x] Docker Compose setup

### Phase 2: Production Deployment (Next)

**Infrastructure:**
- [ ] Deploy to Unraid/Dedicated server
- [ ] Configure reverse proxy (Cosmos Cloud)
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure domain (ev.example.com)
- [ ] Set up automated backups (daily PostgreSQL dumps)

**Security:**
- [ ] Generate production secrets (NextAuth, JWT, DB)
- [ ] Configure OAuth providers (Google Cloud Console)
- [ ] Add initial user to whitelist
- [ ] Review and harden environment variables
- [ ] Generate agent API key

**Agent Service:**
- [ ] Create `/api/sessions/agent-create` endpoint
- [ ] Add service account to whitelist
- [ ] Build OpenClaw skill for conversational data entry
- [ ] Implement vision/OCR for dashboard reading
- [ ] Test photo upload flow
- [ ] Document agent usage

**Monitoring:**
- [ ] Set up uptime monitoring (Uptime Kuma)
- [ ] Configure log aggregation
- [ ] Add health check endpoints

### Phase 3: Hardening

- [ ] Implement offsite backups (S3/R2)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add integration tests
- [ ] Performance monitoring (Prometheus/Grafana)
- [ ] Security audit (dependency check, secret scan)

### Phase 4: Enhancement

- [ ] Image optimization pipeline
- [ ] Charging curve visualization
- [ ] Mobile app (PWA or native)
- [ ] Public API documentation
- [ ] Multi-vehicle support

### Production Checklist

**Pre-launch:**
- [ ] All environment variables configured
- [ ] SSL certificate valid
- [ ] Backups tested (restore from dump)
- [ ] OAuth flows tested end-to-end
- [ ] Whitelist working correctly
- [ ] Photo uploads functional
- [ ] Map displays correctly on mobile
- [ ] Domain DNS configured
- [ ] Monitoring alerts active

**Post-launch:**
- [ ] Monitor logs for errors
- [ ] Verify backup jobs running
- [ ] Test disaster recovery procedure
- [ ] Document admin procedures
- [ ] Plan upgrade strategy

## Agent Service Specification

### Overview

Conversational agent (OpenClaw) for creating charging session records via natural language interaction. Designed for mobile use while charging.

### User Flow

```
1. INITIATE
   User: "Charged at Shell Bukit Batok" or sends photos
   
2. COLLECT PHOTOS (if not provided)
   Agent: "Please send:
           1. Dashboard screenshot (showing V, A, kW, SoC)
           2. Charger photo (model name visible)"
   
3. EXTRACT DATA (vision/OCR)
   - Dashboard: Read voltage, current, power, battery %
   - Charger: Identify model, operator
   - Location: Parse from Telegram location pin or text
   
4. ASK MISSING FIELDS
   - Starting SoC (if not in photo)
   - Ending SoC (if not in photo)
   - Any errors? (handshake, derating, etc.)
   - Price per kWh
   - Notes
   
5. CONFIRM
   Agent: "Creating session:
           📍 Shell Recharge Bukit Batok (1.352, 103.819)
           ⚡ 81.2kW (207A × 387V)
           🔋 39% → 80%
           🏭 Starcharge Titan v3
           ✅ Success
           💵 $0.44/kWh
           
           Confirm? (yes / no / edit [field])"
   
6. CREATE
   On "yes": POST to /api/sessions/agent-create
   Response: Session ID + view URL
   
7. REPLY
   Agent: "✅ Created! View: https://ev.dawo.me"
```

### API Specification

**Endpoint:** `POST /api/sessions/agent-create`

**Headers:**
```
Content-Type: multipart/form-data
X-API-Key: <agent-api-key>
```

**Body:**
```typescript
{
  // Required
  station_name: string
  operator: string
  max_kw: number
  battery_start: number
  battery_end: number
  latitude: number
  longitude: number
  
  // Optional
  notes?: string
  charger_hardware_model?: string
  charger_software?: string
  cable_amp_limit?: number
  stall_id?: string
  plug_id?: string
  price_per_kwh?: number
  kwh_delivered?: number
  failure_type?: 'handshake' | 'derating' | 'interruption' | 'incompatible' | 'other'
  technique_required?: boolean
  technique_notes?: string
  
  // Photos (uploaded separately)
  photos: File[]  // Multipart file upload
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "url": "https://ev.dawo.me"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid API key | Missing required field: station_name | ..."
}
```

### Photo Upload Flow

1. User sends photo via Telegram
2. OpenClaw receives photo, saves to temp
3. Agent uploads to `/api/upload` (multipart form)
4. Server responds with URL: `/uploads/session-photo-uuid.jpg`
5. URL included in session create payload

### Authentication

- **API Key Location:** Environment variable `AGENT_API_KEY` on server, stored securely in agent memory
- **User Association:** Service account `user_id: "service-agent"` pre-whitelisted in database
- **Rate Limiting:** Consider implementing per-user limits if needed

### Error Handling

| Scenario | Agent Response |
|----------|----------------|
| API key invalid | "Authentication failed. Please contact admin." |
| Missing required field | "I need [field]. What was [field]?" |
| Photo upload fails | "Photo upload failed. Try again or skip?" |
| Database error | "Failed to save. Please try again later." |
| User not whitelisted | "Service account not authorized. Contact admin." |

### Security Considerations

- API key never logged
- Photo uploads validated (type, size)
- Confirmation step prevents accidental records
- All writes attributed to service account in DB
- PostgREST remains internal-only (no public exposure)

## Migration History

### Supabase to PostgREST (v2.0)

**Original stack:** Supabase (PostgreSQL + Auth + Storage + Realtime)

**Why migrated:**
- 12 containers vs 3 containers
- $300+/year potential cost vs $20/year
- Full data ownership
- Simpler mental model

**Migration process:**
1. Export schema from Supabase
2. Remove Supabase-specific features (auth.users RLS, storage buckets)
3. Add NextAuth.js for authentication
4. Create whitelist table for access control
5. Switch Supabase client to PostgREST fetch calls
6. Replace Supabase Storage with local filesystem

**Result:** Equivalent functionality, 75% cost reduction, simpler architecture.

## Future Architecture Considerations

### When to Move to Managed Services

Consider upgrading if:
- Daily active users > 100
- Storage exceeds 100GB
- Need 99.9% uptime SLA
- Team grows beyond 1-2 developers

**Upgrade path:**
- PostgreSQL → RDS/Cloud SQL
- File storage → S3/R2/Cloudflare Images
- Self-hosted → Kubernetes or managed platform (Railway, Fly.io)

### Alternative Architectures Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Supabase Cloud | Managed, fast setup | $25+/mo, vendor lock-in | Rejected |
| Firebase | Real-time, mobile SDK | Google lock-in, complex queries | Rejected |
| SQLite + Litestream | Simple, single file | No PostGIS, concurrency limits | Rejected |
| Custom Node API | Full control | More code to maintain | Rejected |
| **PostgREST + Next.js** | **Best balance** | **Some constraints** | **Chosen** |

## License

MIT

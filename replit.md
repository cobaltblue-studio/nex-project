# NEO — AI Music Platform

## Overview

NEO is an AI-generated music discovery and ranking platform. It allows AI music creators ("NEX creators") to submit tracks, get voted on by listeners, and appear on ranked leaderboards. The platform supports two content types: **Music** (audio tracks) and **Music Videos** (YouTube-embedded MVs). It features a Spotify-like music board, a video grid for MV content, creator profiles, and a Radio/Flow mode for continuous playback.

The app is a full-stack TypeScript monorepo with a React frontend and Express backend, sharing schema and route definitions.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend Architecture

- **Framework**: React (with Vite as the build tool)
- **Routing**: `wouter` for lightweight client-side routing
- **State/Data**: `@tanstack/react-query` for server state, with a shared `queryClient`
- **UI Library**: shadcn/ui components (Radix UI primitives + Tailwind CSS)
- **Animations**: `framer-motion` for page transitions and UI interactions
- **Styling**: Tailwind CSS with a dark futuristic theme; CSS variables for colors; custom fonts (Rajdhani for display, Space Grotesk for body)
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

**Key Pages**:
- `/` — Home (hero + two-column layout: Music list left, MV grid right)
- `/music` — Music-only board (Spotify-style row list)
- `/music-video` — MV-only board (grid with thumbnails)
- `/track/:id` — Audio track detail (no video embed)
- `/mv/:id` — Music video detail (YouTube embed only)
- `/profile` — Creator list
- `/profile/me` or `/profile/:name` — Creator profile view
- `/submit` — Track submission form

**Key Components**:
- `MusicRow` — Spotify-like row for music lists (rank, title, creator, tool badge, votes, play button)
- `MVCard` — Grid card for music video lists (thumbnail placeholder, YouTube icon, Watch MV)
- `Layout` — App shell with fixed header, navigation, and background effects
- `OnboardingModal` — Auto-shown after OAuth login if no profile exists
- `LeagueBadge` — Creator tier badge (Spark, Core, Ascendant, Sovereign)

**Radio/Flow Mode**:
- Started from a "Start Radio" button in the hero section
- Randomly plays from Top 50 tracks by neoScore
- Excludes the last 5 recently played tracks to avoid repetition

### Backend Architecture

- **Framework**: Express.js running on Node.js with `tsx` for TypeScript execution
- **Entry point**: `server/index.ts` → registers routes, seeds database, serves static files
- **API**: REST endpoints defined in `server/routes.ts`, route paths defined in `shared/routes.ts`
- **Storage layer**: `server/storage.ts` exposes a `DatabaseStorage` class implementing `IStorage` interface — all DB access goes through this layer
- **Seeding**: `server/seed.ts` seeds sample tracks and creator profiles on first run if the DB is empty

**Key API Endpoints**:
- `GET /api/auth/user` — current authenticated user
- `GET/POST /api/profiles` — profile management
- `GET /api/profiles/me` — current user's profile
- `GET /api/profiles/by-username/:name` — profile lookup by username
- `GET /api/tracks` — track list (supports `type`, `creatorId`, `limit` query params)
- `GET /api/tracks/:id` — single track detail
- `POST /api/tracks/:id/vote` — vote on a track
- `POST /api/tracks/:id/like` — like a track
- `POST /api/admin/tracks/:id/review` — admin review (approve/reject)

### Data Storage

- **Database**: PostgreSQL (via `DATABASE_URL` env variable)
- **ORM**: Drizzle ORM with `drizzle-kit` for schema migrations
- **Schema location**: `shared/schema.ts` (shared between frontend and backend)

**Core Tables**:
- `users` — Auth users (managed by Replit Auth integration)
- `sessions` — Session storage (required for Replit Auth, uses `connect-pg-simple`)
- `profiles` — Creator profiles (username, bio, role: listener/nex/founder, nexNumber, totalScore, isVerified)
- `tracks` — Music tracks (title, audioUrl, mvUrl, aiTool, genre, status, aiCraftScore, listenerVotes, neoScore, isFeatured)
- `likes` — Track likes (userId + trackId)
- `votes` — Track votes (userId + trackId)
- `follows` — Creator follows (followerId + creatorProfileId)

**Track scoring**: Each track has `aiCraftScore` (admin-assigned), `listenerVotes`, and a computed `neoScore`. Tracks go through statuses: `SUBMITTED` → `PUBLISHED` / `REJECTED`.

### Authentication

- **Provider**: Replit Auth (OpenID Connect / OAuth)
- **Library**: `openid-client` + `passport` with a custom Replit strategy
- **Sessions**: Server-side sessions stored in PostgreSQL (`sessions` table) via `connect-pg-simple`
- **Flow**: Login via `/api/login` → OIDC callback → upsert user → show onboarding modal if no profile → user picks role (listener or NEX creator)
- **Protection**: `isAuthenticated` middleware guards protected routes

### Build System

- **Client**: Vite builds React app to `dist/public/`
- **Server**: esbuild bundles `server/index.ts` to `dist/index.cjs`
- **Shared build script**: `script/build.ts` runs both builds sequentially
- **Dev mode**: `tsx` runs the server directly with Vite middleware for HMR

---

## External Dependencies

### Core Services

| Service | Purpose |
|---|---|
| PostgreSQL | Primary database (tracks, profiles, sessions, votes) |
| Replit Auth (OIDC) | User authentication via OpenID Connect |

### Key npm Packages

| Package | Role |
|---|---|
| `drizzle-orm` + `pg` | Database ORM and PostgreSQL driver |
| `drizzle-kit` | Schema migrations (`db:push`) |
| `express` + `express-session` | HTTP server and session management |
| `passport` + `openid-client` | Authentication |
| `connect-pg-simple` | PostgreSQL session store |
| `@tanstack/react-query` | Client-side data fetching and caching |
| `wouter` | Client-side routing |
| `framer-motion` | UI animations |
| `shadcn/ui` (Radix UI + Tailwind) | Component library |
| `zod` + `drizzle-zod` | Schema validation shared between client and server |
| `memoizee` | Memoizing OIDC config fetch |

### Environment Variables Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `REPL_ID` | Replit app identifier (for OIDC) |
| `ISSUER_URL` | OIDC issuer (defaults to `https://replit.com/oidc`) |

### External Media

- **YouTube**: Music video embeds on `/mv/:id` pages (YouTube iframe embed using video ID extracted from `mvUrl`)
- **Suno**: Audio track URLs stored in `audioUrl` field (external Suno links, not self-hosted audio)
- **Google Fonts**: Rajdhani, Space Grotesk (loaded via CDN in `index.html` and `index.css`)
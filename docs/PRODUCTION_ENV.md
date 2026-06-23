# NEX — Production environment checklist

Use when deploying with `NODE_ENV=production` (Railway, Fly.io, VPS + Docker, etc.).  
Vercel-style **serverless** is not assumed: this app is a **single long-lived Node server** (Express + static/Vite build).

## Required

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Set to `production`. |
| `DATABASE_URL` | PostgreSQL connection string (Drizzle). |
| `SESSION_SECRET` | **≥ 32 characters**, random. **Must not** be `nex-local-dev-secret` or empty. Server **throws on startup** if invalid. |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret. |
| `GOOGLE_CALLBACK_URL` | **HTTPS** callback — must match Google Cloud Console **exactly**. Production: `https://nexmusic.ai/api/auth/callback/google` **or** `https://nexmusic.ai/api/auth/google/callback` (both routes exist; pick one in Console + env). |

## Strongly recommended

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port (platforms often inject this, e.g. Railway). |
| `NEX_FOUNDER_ADMIN_EMAIL` | Founder Google email for admin RBAC (overrides default in `shared/constants.ts`). |
| `CORS_ORIGINS` | Comma-separated allowed origins if the SPA is on another origin. Defaults already include `https://nexmusic.ai` and `https://www.nexmusic.ai`. |
| `SESSION_COOKIE_SECURE` | Default: `true` when `NODE_ENV=production`. Set `0` / `false` only on HTTP dev tunnels (not for real prod). |
| `TRUST_PROXY` | Default `1` (trust first proxy hop). Use `2` if you have **two** reverse proxies, `true` if the platform docs require trust-all, `false` to disable. |

## Optional / feature flags

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | [Resend](https://resend.com/api-keys) API key — **required for creator emails** (approve/reject, like, battle win, follow, play). Without it, notifications are in-app only. |
| `NEX_EMAIL_FROM` | Verified sender, e.g. `NEX <notifications@nexmusic.ai>`. Domain must be verified in Resend. Default sandbox: `NEX <onboarding@resend.dev>` (only delivers to your Resend account email). |
| `RANKING_RECOMPUTE_DEBOUNCE_MS` | Debounce for ranking recomputation queue (default `5000`). |
| `RANKING_RECOMPUTE_MAX_BATCH` | Max tracks per batch (default `50`). |
| `ENABLE_SEED_ENDPOINT` | Set `1` only temporarily with `ADMIN_SEED_TOKEN` for staging dumps. |
| `ADMIN_SEED_TOKEN` | Token for `/api/tracks/seed`. |

## Generate `SESSION_SECRET`

On your machine (do **not** commit the value to git):

```bash
openssl rand -base64 48
```

Paste the output into the host’s secret manager as `SESSION_SECRET`.

## Domain coupling in code (manual follow-up)

- **CORS**: defaults include `http://localhost:5001` etc. Production **must** add real origins via `CORS_ORIGINS`.
- **Google OAuth**: `GOOGLE_CALLBACK_URL` and Console “Authorized redirect URIs” must match **your** domain.
- **Founder email**: `NEX_FOUNDER_ADMIN_EMAIL` or `shared/constants.ts` `NEX_FOUNDER_ADMIN_EMAIL` — not a hostname, but ops should align with the real admin account.

No hostname is hard-required in application logic beyond env configuration above.

## Google Cloud Console (nexmusic.ai)

1. **Authorized JavaScript origins**: `https://nexmusic.ai` (add `https://www.nexmusic.ai` if you use www).
2. **Authorized redirect URIs**: must equal `GOOGLE_CALLBACK_URL`, for example:
   - `https://nexmusic.ai/api/auth/callback/google`, or
   - `https://nexmusic.ai/api/auth/google/callback`

## Site URL for the Vite client (optional)

| Variable | Purpose |
|----------|---------|
| `VITE_SITE_URL` | Public origin, e.g. `https://nexmusic.ai` (exposed to client). |
| `NEXT_PUBLIC_SITE_URL` | Same value if you prefer Next-style naming; Vite is configured to expose both prefixes. |

## Vercel (static SPA) + Express on Railway (or similar)

If the browser loads **`https://nexmusic.ai`** from Vercel but API runs on another host, relative `/api/...` calls hit Vercel only — there is no Express there, so charts and login break (SPA 404 on `/api/auth/login`).

1. Run the **same** Express app on Railway (or Fly, Render, etc.) with a public HTTPS URL, e.g. `https://nex-project-production.up.railway.app`.
2. In **Vercel → Project → Settings → Environment Variables (Production)** add:
   - **`NEX_API_PROXY_ORIGIN`** = that base URL **without** a trailing slash (e.g. `https://nex-project-production.up.railway.app`).
3. Redeploy Vercel. `vercel.ts` rewrites `/api/*` to `${NEX_API_PROXY_ORIGIN}/api/*`, so the browser still talks to `nexmusic.ai` (cookies and OAuth redirects stay on one site).
4. On the **API host**, set `GOOGLE_CALLBACK_URL` to the **public nexmusic.ai** callback (e.g. `https://nexmusic.ai/api/auth/google/callback`), not the Railway hostname, so Google redirects through Vercel → proxy → Express.

**Alternative:** Do not split hosts — deploy `npm run start` (Express + built static) on one platform and point `nexmusic.ai` only there; then no proxy variable is needed.

## Transactional email (Resend)

1. Create a Resend account and add domain **`nexmusic.ai`** (DNS records in Resend dashboard).
2. Create an API key and set on **Railway** (API host, not Vercel):
   - `RESEND_API_KEY=re_...`
   - `NEX_EMAIL_FROM=NEX <notifications@nexmusic.ai>`
3. Run DB migration once (email dedupe tables): `npm run db:migrate-b2b` with production `DATABASE_URL`.
4. Redeploy Railway. Verify: `curl -s https://nexmusic.ai/api/health` → `"email":{"enabled":true}`.
5. As admin, `POST /api/admin/email-test` (or `npm run check:email` with `EMAIL_TEST_TO=you@example.com` locally).

Quick Railway setup (after `railway login`):

```bash
RESEND_API_KEY=re_xxx ./scripts/configure-railway-email.sh
```

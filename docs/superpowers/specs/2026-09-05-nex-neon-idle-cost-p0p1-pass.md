# NEX Neon Idle Cost — P0+P1 PASS Record

- Date: 2026-09-05 ~ 2026-09-06
- Status: **PASS (Founder confirmed)**
- Commit: `e31bdfb` (`fix(neon): daily session prune and worker cadence for scale-to-zero`)
- Rollback: `3afb4a6` (no schema change; revert + redeploy)
- Scope: P0 session prune 저빈도화 + P1 6h workers → 24h only
- Out of scope (not done): B안 client polling, Railway sleep, DB/plan changes, large refactor

## Cause (proven)

Production `connect-pg-simple` default session prune (~7.5–22.5 min) issued Railway → Neon `:5432` without `/api` traffic, defeating STZ (5 min ON).

## Changes shipped

| Item | Change |
|------|--------|
| P0 | `pruneSessionInterval: false` + daily `startSessionPruneScheduler` (`server/sessionPrune.ts`) |
| P1 | Announcement safety + playback audit intervals **6h → 24h** |

## Verification

| Check | Result |
|-------|--------|
| Unit | `npm run test:workers` 23/23 PASS |
| Smoke | health/home/battle/tracks/battles OK; auth/user 401 unauthenticated |
| Boot | `[session-prune] boot: ok` on Railway |
| 30m network | After settle, no repeating `:5432` (~15m prune pattern gone); `/api` 0 in window |
| Founder | **2026-09-06:** Production Primary **SUSPENDED** ~3h — Idle/scale-to-zero confirmed |

## Cost (estimate, Launch CU)

- Before (prune-driven high Active): Neon ~$15–40/mo + Railway ~$2–5
- After (low traffic): Neon ~$2–8/mo + Railway ~$2–5 → ~$4–13 combined

## Next actions

None without Founder approval. Hold current Production state.

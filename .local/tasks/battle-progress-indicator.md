# Battle Progress Indicator

## What & Why
Show users how many battles they've completed today on the battle screen, so they can see their daily progress at a glance (e.g. "Battle 2 / 3 today").

## Done looks like
- A progress indicator is visible on the battle screen showing the user's daily battle count (e.g. "Battle 1 / 3 today", "Battle 2 / 3 today", etc.)
- The count updates after each battle is completed (after a vote is cast)
- Unauthenticated users see a neutral state (no count shown, or a prompt to log in)
- The indicator does not block or alter the ability to start/play battles

## Out of scope
- Enforcing a hard daily battle limit (no gate or restriction added)
- Changing any existing battle voting, scoring, or promotion logic

## Tasks
1. **Backend: daily count endpoint** — Add a storage method that counts how many `battle_votes` a user has cast today (since midnight UTC). Expose it as `GET /api/battles/daily-count` (authenticated), returning `{ count: number, dailyMax: number }`. Use a constant of 3 for `dailyMax`.

2. **Frontend: progress indicator** — In the Battle page header area, fetch the daily count via React Query and render a small indicator (e.g. "Battle 2 / 3 today"). Invalidate the query after a successful vote mutation so the count updates in real time. Only display the indicator when the user is authenticated.

## Relevant files
- `server/storage.ts`
- `server/routes.ts`
- `client/src/pages/Battle.tsx`
- `shared/schema.ts`

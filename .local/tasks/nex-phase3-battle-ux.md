# NEX Phase 3 – Battle UX & Live Stats

## What & Why
Polish the Battle page UX, surface live platform activity stats, and strengthen creator identity across the app. Several items from the Phase 3 spec are already in place; this task covers only what is missing or incomplete.

## Done looks like
- Battle result countdown reads "Next battle in 5 / 4 / 3 / 2 / 1" instead of just a number with "Next battle starting…"
- Battle result screen shows the creator name beneath each track title in the vote bar section
- A `🔥 TODAY BATTLE STATS` panel appears on the Battle page showing: total votes today, battles played today, tracks in battle pool, new tracks submitted today — all fetched live from the backend
- Music chart shows "No tracks ranked yet." when the chart has zero entries (instead of 100 empty placeholder rows)
- Every creator name across the Battle result screen and both chart pages (Music, MV) has an "AI Music Creator" label displayed beneath it

## Out of scope
- Changing the battle header (already "GLOBAL AI MUSIC BATTLE")
- Changing the vote bar animated fill (already implemented)
- Changing the vote button glow/highlight (already implemented)
- Changing the daily battle counter logic (already correct)
- Adding thumbnails or rank to charts (already present)
- MV chart empty state (already implemented)

## Tasks
1. **Countdown label format** — In the Battle result phase, change the countdown display from a bare number + "Next battle starting…" to a single line reading "Next battle in [X]", keeping the existing per-second animation intact.

2. **Result screen creator attribution** — In the Battle result vote bar section, display the creator name in a small muted label beneath each track's title, matching the style of the winner block above.

3. **Live Battle Stats API** — Add a `GET /api/stats/today` endpoint that returns: total votes cast today, total battles played today, total tracks currently in the active battle pool, and total new tracks submitted today. Compute these from the existing database tables using today's UTC date boundary.

4. **Live Battle Stats panel (frontend)** — On the Battle page, render a `🔥 TODAY BATTLE STATS` panel (always visible, not phase-gated) that fetches `/api/stats/today` and displays the four stats in a grid. Refresh every 60 seconds.

5. **Music chart empty state** — In `Music.tsx`, add a check: if the API returns zero tracks (before slot-filling), show a centered "No tracks ranked yet." message instead of 100 empty placeholder rows.

6. **Creator Identity Label** — Below every creator name displayed on the Battle result screen and on both chart pages (Music, MV), add a small "AI Music Creator" label in a muted, uppercased style consistent with the platform's existing typography.

## Relevant files
- `client/src/pages/Battle.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/MusicVideo.tsx`
- `server/routes.ts`
- `server/storage.ts`
- `shared/schema.ts`

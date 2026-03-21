# NEX Battle System Update

## What & Why
Six interconnected improvements to the battle flow, start screen, vote transition, and chart pages to make the experience cleaner and more correct.

## Done looks like
- Battle start screen shows a centered "AI MUSIC DUEL" heading with a single "⚡ NOW START BATTLE ⚡" button below it — no genre selection buttons at all. Clicking it immediately starts a battle using any genre.
- After voting, a result screen appears for 5–7 seconds showing "Track A – 63% / Track B – 37%" style percentages plus a total votes count, before auto-advancing to the next battle.
- The yellow flash during vote transition is replaced with a smooth, subtle animation (no harsh color flash).
- MV Chart fetches tracks where `trackType = "video"`. If none exist, shows "No music videos ranked yet." placeholder text instead of empty slots.
- Music Chart fetches tracks where `trackType = "audio"` so video submissions do not appear in the audio chart.

## Out of scope
- Changing battle matchmaking logic or daily limits.
- Admin panel or submission form changes.
- Redesigning the vote or track-listening screens.

## Tasks

1. **Battle start screen** — Replace the entire genre selector block with a single centered "⚡ NOW START BATTLE ⚡" button that immediately calls `startBattle("ALL")`. Center the "AI MUSIC DUEL" heading and remove the genre description text. Remove any loading skeleton for genres.

2. **Vote flash transition** — Replace the abrupt yellow overlay flash with a smooth fade animation (e.g. a brief white/primary pulse at lower opacity using framer-motion with a longer, gentler easing curve) so the transition between voting and the result screen feels fluid rather than jarring.

3. **Result screen timing & display** — Confirm the result screen shows for at least 5 seconds before auto-advancing. Ensure vote percentages are displayed in the format "Track A – 63% / Track B – 37%" with track titles labeled clearly above each percentage, and total votes shown below. Adjust countdown and auto-advance timers if needed to match the 5–7 second range.

4. **Server: trackType filter** — Add a `trackType` query parameter to the `/api/tracks` route and the `getTracks` storage method, so callers can request `trackType=audio` or `trackType=video` specifically. Apply the filter in the DB query when the parameter is provided.

5. **Music Chart: audio-only filter** — Update `Music.tsx` to fetch `/api/tracks?sortBy=rankingScore&limit=100&trackType=audio` so that video submissions are excluded from the audio chart.

6. **MV Chart: video-only filter + empty state** — Update `MusicVideo.tsx` to fetch `/api/tracks?sortBy=rankingScore&trackType=video` instead of the current dual-fetch logic. Remove the legacy `mvUrl`-based fallback combining. If the result is empty, show a centered placeholder: "No music videos ranked yet." instead of rendering 100 empty slots.

## Relevant files
- `client/src/pages/Battle.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/MusicVideo.tsx`
- `server/routes.ts:110-145`
- `server/storage.ts:42-48`

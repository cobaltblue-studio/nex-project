# Branding Polish & AI DNA Data Logic

## What & Why
A focused polish pass to clean up visual artifacts on the Home page, focus the breathing animation on the primary CTA only, wire AI DNA badges to real user-submitted prompt data, give the Rising page a heatmap style, and enforce consistent neon titles and 100vh Battle Result across the platform.

## Done looks like
- The floating stats numbers (Battles Today, Votes Cast, Tracks in Pool) below the NEX logo are removed from the hero section.
- The "DISCOVER MORE" scroll guide sits on the same horizontal line as the Live Trends Graph widget — both are clearly visible above the fold without scrolling.
- The breathing / scale animation is applied **only** to the "Start Battle" / "ENTER BATTLE ARENA" button (scale 1.0→1.05, slow 4–5s cycle). No other element in the hero breathes (the NEX logo's `nex-breathe` animation is removed or replaced with a simpler static glow).
- The Submit Track form has a new optional textarea: "AI Prompt / Generation Info (Optional)".
- The `tracks` schema and database have an `aiPrompt` text column (nullable) to store that value.
- Every AI DNA badge tooltip shows the actual `aiPrompt` text submitted for that track; if none was provided, it falls back to `[RAW_DATA_SYNCED | SEED: 7721]`. The tooltip text uses a high-contrast mono-spaced font.
- The Rising page track list has a heatmap left-border glow: the top-growth tracks get an orange-to-red gradient glow on their left border (intensity scales with win rate / rank position).
- The Rising page empty state keeps its current message and gains a small, glowing "Check again in 24h" icon (e.g., Clock icon with neon pulse).
- All page titles across every page have the Green Neon Glow (`neon-text-green` or equivalent).
- The Battle Result phase renders as a single-screen 100vh experience with no overflow scroll.

## Out of scope
- Redesigning the overall Battle page flow or adding new battle features.
- Changes to the chart ranking logic or admin panel.
- Audio/video playback changes.

## Tasks
1. **Home hero cleanup** — Remove the three floating stats numbers block from the hero section. Reposition the "DISCOVER MORE" scroll guide element so it aligns horizontally with the Live Trends Graph widget, both remaining above the fold at typical viewport heights.

2. **Breathing animation — CTA only** — Remove the `nex-breathe` animation from the NEX logo (replace with a static strong neon glow). Add a slow breathing pulse animation (scale 1.0→1.05 over ~4s, infinite) to the "Start Battle" primary button only.

3. **AI Prompt field & schema** — Add a nullable `aiPrompt` text column to the `tracks` table in `shared/schema.ts` and run the migration. Add the optional textarea field to the `SubmitTrack.tsx` form, wired to this new column. Update the backend route/storage to accept and persist this field.

4. **AI DNA badge data logic** — Update all AI DNA badge tooltip implementations (`MusicRow.tsx`, `New.tsx`, `Music.tsx`, `MVCard.tsx`, `WorkCard.tsx`) to read `track.aiPrompt`. If the value exists, display it; otherwise display the fallback string `[RAW_DATA_SYNCED | SEED: 7721]`. Ensure the tooltip uses a high-contrast mono-spaced font.

5. **Rising page heatmap style** — Add an orange-to-red left-border gradient glow to each track row, with intensity proportional to its position/win-rate (top-ranked tracks glow brightest). Update the empty state to include a glowing Clock icon with a "Check again in 24h" label.

6. **Global polish pass** — Verify every page title carries the Green Neon Glow class. Confirm the Battle Result phase container enforces `height: 100vh; overflow: hidden` so it is a single-screen experience.

## Relevant files
- `client/src/pages/Home.tsx`
- `client/src/index.css`
- `client/src/pages/Rising.tsx`
- `client/src/pages/SubmitTrack.tsx`
- `client/src/components/MusicRow.tsx`
- `client/src/pages/New.tsx`
- `client/src/pages/Music.tsx`
- `client/src/components/MVCard.tsx`
- `client/src/components/WorkCard.tsx`
- `client/src/pages/Battle.tsx`
- `shared/schema.ts`
- `server/storage.ts`
- `server/routes.ts`

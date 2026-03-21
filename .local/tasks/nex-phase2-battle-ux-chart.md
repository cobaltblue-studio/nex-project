# NEX Phase 2 – Battle, UX & Chart Updates

## What & Why
A set of targeted improvements to the battle system, result screen, countdown, chart pages, and vote feedback. These changes improve clarity, visual polish, and data accuracy across the platform.

## Done looks like
- Battle counter correctly shows "Battle 1 / 3", "Battle 2 / 3", "Battle 3 / 3" and disables the start button after 3 battles with a "Daily battle limit reached. Come back tomorrow." message
- Result screen shows animated horizontal progress bars (Track A ████ 35% / Track B ████████ 65%) alongside track name, vote %, and total votes
- Countdown animates from 5 → 4 → 3 → 2 → 1 with each number displayed prominently, then auto-loads the next battle
- Battle page h2 title reads "GLOBAL AI MUSIC BATTLE" (was "AI MUSIC DUEL")
- Music chart (NEX TOP 100) fetches only tracks where track_type = "audio" and shows rank, thumbnail (coverImage), title, and creator name per row
- MV chart fetches only tracks where track_type = "video", shows the same thumbnail row layout, and displays "No music videos ranked yet." when empty
- Clicking a vote button triggers a 300ms highlight/pulse animation before the result screen appears

## Out of scope
- Any backend schema changes (coverImage already exists in schema)
- Genre selection UI (already removed in a previous task)
- Authentication or submission flow changes

## Tasks
1. **Fix battle daily limit** — Clamp the displayed battle counter to max 3. When `dailyCount.count >= dailyMax` (3), hide the start button and show "Daily battle limit reached. Come back tomorrow." in its place. Ensure the counter never displays a count above 3.

2. **Battle result visual bars** — Replace the side-by-side percentage text with animated horizontal progress bars for Track A and Track B. Each bar should show the track name, a filled bar proportional to its vote share, and the percentage. Keep total votes below the bars. Use Framer Motion to animate bar width from 0 to the final value on mount.

3. **Animated countdown (5→1)** — Change the countdown start value from 3 to 5. Replace the static "Next Battle in {countdown}..." text with a visually prominent animated number that counts down 5 → 4 → 3 → 2 → 1 using Framer Motion (scale/fade transition per step), then automatically triggers the next battle.

4. **Update battle header title** — Change the h2 in the battle page header from "AI MUSIC DUEL" to "GLOBAL AI MUSIC BATTLE".

5. **Charts: add thumbnail + verify filtering** — In both Music.tsx and MusicVideo.tsx, add `coverImage` to the track interface and include it in each chart row alongside rank, title, and creator name. Display a small square thumbnail using the `coverImage` URL; show a placeholder icon if absent. Confirm both pages already correctly filter by `track_type` via the existing query params. Ensure the MV chart shows "No music videos ranked yet." when the result set is empty.

6. **Vote button highlight animation** — When a user clicks a vote button (Track A or Track B), apply a 300ms highlight animation (e.g. a brightness/glow flash) to the clicked button before transitioning to the result phase. Use a local `votedId` state to drive the animation class.

## Relevant files
- `client/src/pages/Battle.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/MusicVideo.tsx`
- `shared/schema.ts`
- `server/routes.ts`

# NEX Visual & Logic Updates

## What & Why
Apply a set of visual and interaction improvements to the Battle Arena, Music Chart, and Home page, based on the NEX Platform Update Instructions document.

## Done looks like
- A new **ABOUT NEX** section appears at the bottom of the Home page, above the footer, with the platform description text and a "LEARN HOW NEX WORKS" button
- Chart zone colors updated: Legend Zone = `#FFD700`, Elite Zone = `#00D1FF` (cyan, replacing grey), Rising Zone = `#00FF9C`
- Battle result screen shows **percentage** for each track (e.g. "Track A 63% / Track B 37%"), **Total Votes: N**, and a "Next Battle in 3...2...1" countdown above the auto-advance
- Clicking a vote button triggers a **0.25-second neon yellow (`#FFD400`) flash effect** (scale 110% → flash → fade) before the result screen appears
- The voting phase shows a central **⚡ VS ⚡** label between the two track cards, making the battle identity clearer
- Chart page track playback correctly plays the full track (not the 20-second battle preview) when a user opens a track from the Music chart

## Out of scope
- Track Type field or routing changes (covered in a separate task)
- Country field on profiles (covered in a separate task)
- Any schema or database changes

## Tasks
1. **ABOUT NEX section** — Add a new section to `Home.tsx` above the footer area with the title "ABOUT NEX", the three-paragraph platform description, and a "LEARN HOW NEX WORKS" button that links to the About page.

2. **Chart zone colors** — Update `getZoneForRank` in `Music.tsx` to use inline hex colors (`#FFD700`, `#00D1FF`, `#00FF9C`) for Legend, Elite, and Rising zones respectively, replacing the current grey Tailwind classes for Elite.

3. **Battle result screen** — Update the result phase in `Battle.tsx` to compute and display percentages for each track, show a "Total Votes: N" line, and add a "Next Battle in 3...2...1" countdown text that counts down during the existing 7-second auto-advance timer.

4. **Vote flash effect** — In `Battle.tsx`, when the user clicks a vote button, show a full-screen neon yellow (`#FFD400`) overlay that plays a quick scale-up and fade animation (~0.25 seconds) before transitioning to the result screen.

5. **Battle VS visual** — In the voting phase of `Battle.tsx`, replace the single lightning bolt separator with a styled central "⚡ VS ⚡" element that clearly identifies the battle layout.

6. **Chart full playback fix** — Audit `WorkDetail.tsx` and `YoutubePlayer.tsx` to ensure tracks opened from the Music chart page play without the `battleMode` prop (i.e., no 20-second cap, starting from 0:00, with controls visible). Fix any path where `battleMode={true}` could be applied to chart context.

## Relevant files
- `client/src/pages/Home.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/WorkDetail.tsx`
- `client/src/components/YoutubePlayer.tsx`
- `client/src/pages/About.tsx`

# Viewport Optimization & UI Final Polish

## What & Why
Apply precise CSS and layout fixes across Home, Radio, Creators, Battle, and all track cards to ensure no scrolling is needed on primary views, the Creators grid uses a bento layout with featured sizing, AI DNA tags appear on every track card, and neon glow titles are consistent across pages.

## Done looks like
- Home page "DISCOVER MORE" scroll indicator is visible above the fold immediately on load (no need to scroll to see it), positioned absolutely at bottom 40px center.
- Radio page fits entirely on one screen — header, player/visualizer, song info, and queue list are all visible without scrolling.
- Creators page uses a 4-column bento grid where the first 3 creator cards span 2 columns × 2 rows (featured size) with a neon-green glowing border, and remaining slots are 1×1.
- Every music/video track card shows a small "[AI_DNA]" label in neon-green monospace, with a hover tooltip revealing `[MODEL: NEX_LYRIA_V3 | SEED: 882934 | STYLE: CYBER_SYNTH]`.
- Battle and Radio page titles use `text-shadow: 0 0 15px rgba(0, 255, 128, 0.7)` neon glow, consistent with other pages.

## Out of scope
- Any backend or data changes
- Changes to pages not listed (New, Music, Rising, Submit, Profile, etc.)
- Responsive/mobile layout changes beyond what these fixes address

## Tasks
1. **Home – Discover More indicator** — Change the scroll indicator container to `position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); z-index: 100` so it is always visible in the first viewport.
2. **Radio – Single-screen layout** — Cap the main player/visualizer at `45vh`, reduce header to `min-height: 10vh`, and set the song info + queue section to fill the remaining `~45vh` so all elements fit without scrolling.
3. **Creators – Bento grid overhaul** — Rewrite the grid to `grid-template-columns: repeat(4, 1fr)`, give the first 3 creator cards `grid-column: span 2; grid-row: span 2` with a `box-shadow: 0 0 10px rgba(0, 255, 128, 0.3)` glowing border, and keep remaining slots at `grid-column: span 1`.
4. **AI DNA tag on track cards** — Add a `[AI_DNA]` `<span>` in neon-green monospace font to every music and video track card component, with a CSS hover tooltip showing `[MODEL: NEX_LYRIA_V3 | SEED: 882934 | STYLE: CYBER_SYNTH]`.
5. **Neon title glow consistency** — Verify and apply `text-shadow: 0 0 15px rgba(0, 255, 128, 0.7)` to the Battle and Radio page title elements.

## Relevant files
- `client/src/pages/Home.tsx`
- `client/src/pages/Radio.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/Battle.tsx`

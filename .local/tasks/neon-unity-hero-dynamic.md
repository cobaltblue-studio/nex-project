# Neon Unity & Dynamic Hero Enhancement

## What & Why
Apply consistent neon green glow to all remaining page titles (Battle, Radio), add a CSS/JS audio visualizer background and animated voting stats widget to the Home page hero, polish the Creators bento grid with glassmorphism, and ensure everything is mobile-optimized. This completes the "AI command center" visual identity for NEX 2.0.

## Done looks like
- The "GLOBAL AI MUSIC BATTLE" heading on the Battle page glows with the same `text-shadow: 0 0 15px rgba(0, 255, 128, 0.7)` as every other page title
- The "NEX RADIO" heading on the Radio page has the identical neon green glow
- All other h1/h2 section headings on Home (and other pages) consistently carry the neon glow class
- The Home page hero section displays a subtle animated CSS/canvas visualizer in the background — bars or waveform reacting to a phantom beat loop, creating a living atmosphere without blocking readability
- Next to or below the main NEX title on the home hero, a compact data widget shows an animated line chart of dummy "live voting trends" — styled like a fintech/pro-gaming HUD with a pulsing "LIVE" badge
- Creators page cards have `backdrop-filter: blur(12px)` and `border: 1px solid rgba(255, 255, 255, 0.1)` applied, with 20px extra vertical spacing between the page header and the card grid
- On mobile, the visualizer is lightweight (fewer bars, reduced animation complexity), the data widget stacks cleanly, and neon glows do not cause layout overflow or performance lag

## Out of scope
- Actual audio playback integration for the visualizer (phantom/timer-driven animation only)
- Backend changes of any kind
- Changes to routing, auth, or data logic

## Tasks
1. **Neon glow title consistency** — Add the `neon-text-strong neon-text-green` class (or equivalent inline style) to the "GLOBAL AI MUSIC BATTLE" h2 in Battle.tsx and the "NEX RADIO" h1 in Radio.tsx. Audit all other section h2 headings across Home.tsx and any other pages that are missing the glow, and apply consistently.

2. **Home hero visualizer background** — Implement a canvas-based or CSS-only audio bar visualizer rendered behind the hero text. Use a `requestAnimationFrame` loop driven by a phantom sine-wave beat (no actual Web Audio API required). Bars should be green (`#00FF80`) with low opacity (~0.15–0.25) so they don't compete with the text. Make it responsive: fewer/shorter bars on mobile, full grid on desktop.

3. **Home hero live voting widget** — Add a compact "LIVE VOTING TRENDS" widget to the hero section. Use Recharts (already in the project or install if not) or a hand-rolled SVG path to render a small animated line chart with 8–10 dummy data points that shift every few seconds. Include a red pulsing "● LIVE" badge. Style it as a dark glass card (`bg-black/40 backdrop-blur border border-white/10`) to match the premium UI language.

4. **Creators bento grid polish** — In CreatorList.tsx, add `backdrop-filter: blur(12px)` and `border: 1px solid rgba(255, 255, 255, 0.1)` to real creator cards. Increase the gap between the page header block and the card grid by 20px (e.g., add `mt-5` or bump existing margin).

5. **Mobile optimization** — Ensure the visualizer canvas is hidden or simplified on small screens (e.g., halve bar count below `md` breakpoint). Confirm the voting widget collapses or shrinks gracefully. Verify neon text-shadow does not cause horizontal scroll on mobile.

## Relevant files
- `client/src/pages/Battle.tsx`
- `client/src/pages/Radio.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/index.css`

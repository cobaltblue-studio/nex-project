# UI Refinement & Scroll Trigger Integration

## What & Why
Deliver four interconnected UI improvements that elevate the NEX platform's visual quality and interactivity: fix the Creators bento grid so the top 3 creators get larger cards, simplify the Radio page into a focused single-station experience, add a scroll guide and parallax effect to the Hero, and stamp every Music/Video card with an "AI DNA" badge tooltip.

## Done looks like
- **Creators page**: Top 3 creator cards each span 2 columns (2:1 ratio vs standard cards). Hover triggers a smooth `transform` scale with `transition: transform 0.3s ease-in-out`.
- **Radio page**: Left station list is gone. The full UI is centered. Header reads "NEX TOP 100 RADIO" with the signature green neon glow. Subtext reads "Continuous AI stream from the global chart. Click to start the vibe." The centered "START RADIO" button remains the only primary action; the player and track info are still rendered after starting.
- **Home Hero**: An animated chevron-down icon with "SCROLL TO DISCOVER" text appears at the very bottom-center of the Hero section. As the user scrolls, the HeroVisualizer SVG shifts with a subtle parallax (moves slightly faster than the scroll, creating a depth effect).
- **AI DNA badge**: Every WorkCard and MVCard shows a small "AI DNA" badge chip in the corner. On hover, a tooltip reveals dummy metadata: `[PROMPT: SYNTH_WAVE_1988] [MODEL: SUNO_V4]`. The badge is minimal — icon + text, not intrusive.
- **Submit Track black screen**: The SubmitTrack page renders correctly with no black/blank screen on load. Any routing or rendering issue that causes the page to show nothing is resolved.
- **Breathing NEX logo**: The `nex-breathe` animation on the Home page logo is preserved unchanged.

## Out of scope
- Backend changes of any kind
- New pages or routes
- Audio functionality changes on the Radio page (player logic stays the same)
- AI DNA data being real or fetched from an API (dummy values only)

## Tasks
1. **Creators bento grid (2:1 ratio)** — Update `CreatorList.tsx` so the first three creator cards (index 0, 1, 2) each span 2 grid columns using a 4-column base grid, making them visually larger than the remaining standard-size cards. Apply `transition: transform 0.3s ease-in-out` on the hover scale.

2. **Radio page simplification** — In `Radio.tsx`, remove the genre station list sidebar entirely. Restructure the layout to a single centered column. Update the page title to "NEX TOP 100 RADIO" with `neon-text-strong neon-text-green`, and replace the description text with the new copy. The radio always runs in top-100 mode. Keep the player, track info, like/next controls, and queue view intact.

3. **Home scroll guide + parallax** — In `Home.tsx`, add an animated chevron-down + "SCROLL TO DISCOVER" label pinned to the bottom-center of the Hero section (fades in after a short delay, gently pulses or bounces). Add a `useEffect` scroll listener that offsets the `HeroVisualizer` SVG's translateY by a fraction of `window.scrollY` (e.g. `scrollY * 0.15`) to create a parallax depth effect.

4. **AI DNA badge on cards** — In `WorkCard.tsx` and `MVCard.tsx`, add a small badge in the top-right corner of the card thumbnail/art area that reads "AI DNA" with a DNA/code icon from lucide-react. Wrap it in a Tooltip (from `@/components/ui/tooltip`) that shows `[PROMPT: SYNTH_WAVE_1988] [MODEL: SUNO_V4]` on hover. Badge should be subtle — semi-transparent background, small text.

5. **Submit Track black screen fix** — Audit the `SubmitTrack.tsx` rendering path and its route registration in `App.tsx`. Ensure the page never renders a blank/black screen regardless of auth state or mutation state. If a loading flicker or blank mount issue exists, add a safe default render and ensure no uncaught error causes the component to bail out silently.

## Relevant files
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/Radio.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/SubmitTrack.tsx`
- `client/src/components/WorkCard.tsx`
- `client/src/components/MVCard.tsx`
- `client/src/App.tsx`
- `client/src/index.css`

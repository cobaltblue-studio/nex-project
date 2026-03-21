# Desktop Hero Title Size Fix

## What & Why
The "NEX" hero title in `Home.tsx` uses `md:text-[24rem]` (384px) on desktop, making it look like a billboard that dominates the entire screen. It must be reduced to a professional title size of ~90px. The header logo icon must also be confirmed at exactly 32px height.

## Done looks like
- The central "NEX" hero title on desktop is ~90px — large and impactful, but clearly a title, not a full-screen element
- The spinning disc icon in the top-left navigation header is exactly 32px (h-8) on desktop
- No vw-based, percentage-based, or transform-scale sizing remains on the hero title
- Mobile sizing (`text-[9rem]` at small screens) is left untouched

## Out of scope
- Any other page layout or styling changes
- Font weight, color, glow effects — only size is changed

## Tasks
1. **Fix hero title desktop size** — In `Home.tsx`, change the h1 class from `md:text-[24rem]` to `md:text-[5.625rem]` (90px). Remove any conflicting CSS overrides in `index.css` that apply `font-size` to `h1.neon-text-strong` or `h1.font-display` at non-mobile breakpoints if they interfere with this fixed value.

2. **Lock header logo to 32px** — In `Layout.tsx`, ensure the Disc3 icon uses exactly `md:h-8 md:w-8` and the "NEX" text span next to it uses `md:text-[1.5rem]` (24px) so the visual height of the entire logo unit stays clean and proportional at 32px.

## Relevant files
- `client/src/pages/Home.tsx:268-281`
- `client/src/components/Layout.tsx:63-67`
- `client/src/index.css:222-225`

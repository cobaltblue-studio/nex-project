# Mobile UI Urgent Fixes – 3 Pages

## What & Why
Apply targeted mobile-only CSS and layout fixes (max-width: 768px) across the Home page, Creators page, and Battle Arena page to resolve logo sizing, alignment, text clipping, scroll lock, and footer overlap issues reported from live device screenshots.

## Done looks like
- **Home:** The NEX main logo (header) is 20% larger on mobile than it currently is. The "Discover More" scroll indicator and the inline Live Voting Trends widget inside `hero-inline-row` are perfectly centered horizontally.
- **Creators:** The text beneath the "50% WIN RATE" section inside creator cards is no longer clipped. Bottom metadata and description font sizes are reduced and there is sufficient bottom padding so no text is cut off by the card boundary or the mobile nav bar.
- **Battle Arena:** The page can be scrolled vertically by touch (no frozen/fixed scroll). The `© 2026 NEX` copyright line and the footer/mobile nav do not overlap the "Track Info" or "Vote" buttons. The track preview image/video container is 15–20% shorter than its current mobile height to open space for title, artist, and vote buttons. The footer stays at the very bottom with a lower z-index than interactive battle content.

## Out of scope
- Desktop layout changes (all fixes must be inside `@media (max-width: 768px)` blocks or use mobile-only class overrides)
- Any new features, data changes, or backend modifications
- Changes to the Radio page or other pages not listed

## Tasks
1. **Home – logo size increase** — In `Layout.tsx`, increase the mobile size of the `.main-logo` Disc3 icon and "NEX" text by ~20% using a mobile media query in `index.css` or by adjusting the existing responsive Tailwind classes on the icon and span, targeting only screens ≤768px.

2. **Home – center scroll indicator and Live Voting widget** — In `index.css`, add or update the `@media (max-width: 768px)` rule for `[data-testid="hero-inline-row"]` to enforce `justify-content: center` and `width: 100%` so both the scroll guide and the inline LiveVotingWidget are horizontally centered. Also ensure `[data-testid="scroll-guide"]` has `margin: 0 auto` or is inside a centered flex container.

3. **Creators – fix text clipping in creator cards** — In `index.css`, inside `@media (max-width: 768px)`, update the `.creators-grid [data-testid^="card-creator"]` rules: remove or raise the `overflow: hidden` that cuts text, add enough `padding-bottom` to account for the mobile nav bar, and reduce the font size of bottom metadata/description text inside the cards so it fits without clipping.

4. **Battle Arena – fix scroll lock and overflow** — In `Battle.tsx`, the outermost wrapper `div.fixed.inset-0.z-40.bg-black.overflow-hidden` and the inner `div.h-full.overflow-hidden.battle-page-container` have `overflow-hidden` which blocks scroll. Add a `@media (max-width: 768px)` CSS rule in `index.css` (or a conditional inline style) to set `overflow-y: auto !important` and `height: auto` on `.battle-page-container` and its fixed parent so touch-scroll works on mobile.

5. **Battle Arena – reduce track preview height and fix footer z-index** — In `index.css`, reduce the `.battle-player-container` `max-height` on mobile from the current `25vh` down to approximately `20vh` (a ~20% reduction) to open vertical space for track title, artist, and vote buttons. Ensure the mobile nav (`.mobile-bottom-nav`) and any footer element have a `z-index` lower than the battle vote buttons and that they do not have `position: fixed` layering that causes overlap. Add bottom padding to the battle scroll container so content is not hidden behind the nav bar.

## Relevant files
- `client/src/index.css:179-395`
- `client/src/components/Layout.tsx:60-70`
- `client/src/pages/Home.tsx:320-352`
- `client/src/pages/Battle.tsx:117,353-354`
- `client/src/pages/CreatorList.tsx:133,157-230`

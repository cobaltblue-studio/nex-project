# Mobile CSS Hard-Fix – All Pages

## What & Why
Previous mobile passes left five areas broken on screens ≤768px: the bottom nav overflows and clips, the Home hero and scroll indicator don't fill the viewport correctly, Battle and Radio don't fit in one screen height, the Creators grid is two columns (too cramped), and neon titles are oversized. This task applies targeted CSS overrides inside `@media (max-width: 768px)` in `index.css` — no business logic changes.

## Done looks like
- Bottom nav sits fixed at exactly 65 px, icons at 20 px, labels at 10 px, all items visible in a single row with no overlap.
- Home hero fills 100 vh; the scroll indicator is anchored 70 px above the bottom nav and always visible; the trends graph is scaled down so it doesn't cover it.
- Battle and Radio pages fit entirely within one 100 vh screen — video player ≤ 25 vh, VOTE and START buttons are visible on first fold without scrolling.
- Creators page renders a single-column grid on mobile; all cards have uniform min-height of 200 px.
- Neon titles are 24 px, sub-texts 13 px on mobile.

## Out of scope
- Any changes to backend logic, API routes, or data models.
- Desktop layout changes.
- Adding new UI features or text content.

## Tasks
1. **Add `mobile-bottom-nav` class to the bottom nav element** — In `Layout.tsx`, add the class `mobile-bottom-nav` to the mobile `<nav>` element (line ~238) so it can be targeted by CSS without using fragile Tailwind compound selectors. This is the only JSX touch in this task.

2. **Write all mobile CSS overrides in `index.css`** — Inside the existing `@media (max-width: 768px)` block, add or update rules covering:
   - `.mobile-bottom-nav`: `height: 65px !important`, `display: flex !important`, `justify-content: space-around !important`, `align-items: center !important`, `flex-wrap: nowrap !important`.
   - `.mobile-bottom-nav svg`: `width: 20px !important; height: 20px !important`.
   - `.mobile-bottom-nav span` (label text): `font-size: 10px !important`.
   - Hero section (`[data-testid="section-hero"]`): `height: 100vh !important; display: flex; flex-direction: column; justify-content: center;`.
   - Scroll indicator (`[data-testid="scroll-guide"]` or `.mobile-discover-fixed`): `position: absolute !important; bottom: 70px !important; left: 50% !important; transform: translateX(-50%) !important; z-index: 9999 !important; display: block !important`.
   - Trends graph (`[data-testid="section-trending-today"]`): `transform: scale(0.6); margin-top: -20px;`.
   - Battle/Radio video player (`.battle-player-container`, radio player container): `max-height: 25vh !important; width: 90% !important; margin: 0 auto !important`.
   - Battle/Radio titles: `font-size: 20px !important; margin: 10px 0 !important`.
   - Vote/Action buttons (`button-vote-track-a`, `button-vote-track-b`, `button-start-radio` via `data-testid`): `height: 45px !important; margin: 5px 0 !important`.
   - Battle stats/result text (`.battle-stats-panel`): `font-size: 11px !important; line-height: 1.2 !important`.
   - Creators grid (`[data-testid^="card-creator"]` parent or `.creators-grid` if a class is added): `grid-template-columns: 1fr !important`.
   - Creator cards: `min-height: 200px; padding: 1.5rem !important`.
   - Neon titles (`.neon-text-green`, `.neon-text-strong`): `font-size: 24px !important; text-shadow: 0 0 10px rgba(0, 255, 128, 0.7) !important`.
   - Sub-texts (`.text-sm` inside mobile-scoped containers, or add a `.mobile-subtext` utility): `font-size: 13px !important`.

3. **Add `creators-grid` class to the CreatorList grid div** — In `CreatorList.tsx`, add `creators-grid` to the grid `<div>` class list (line ~146) so it can be cleanly targeted by CSS for the `grid-template-columns: 1fr` override. One-line JSX change, no logic change.

## Relevant files
- `client/src/index.css`
- `client/src/components/Layout.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/Radio.tsx`
- `client/src/pages/Home.tsx`

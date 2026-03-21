# Mobile UI Final Corrections

## What & Why
Apply precise mobile-only CSS fixes (max-width: 768px) to three areas: the Home hero section, the Creators card grid, and the Battle page. All changes must be wrapped in `@media (max-width: 768px)` and must not affect desktop styles.

## Done looks like
- **Home (홈):** Header NEX logo is 1.5× its current mobile size. The green NEX text and "AI MUSIC RANKING PLATFORM" headline are perfectly centered. The DISCOVER MORE text/arrow and LIVE VOTING TRENDS widget are centered horizontally, not skewed left.
- **Creators (크리에이터 카드):** The stats text (Tracks, Plays, Win Rate) under the 50% WIN RATE label is no longer clipped. Every creator card has 20px bottom padding, and the stat labels are 15% smaller than before.
- **Battle (배틀):** The `© 2026 NEX` footer no longer floats over VOTE TRACK buttons or track info. The music preview/artwork area is 20% shorter. Track title, artist name, and VOTE buttons are pushed up to be fully clear of the footer. Vertical scrolling works (overflow-y is not blocked). The full title "NEX BATTLE ARENA" is visible and centered on the first battle screen — not clipped on the left.

## Out of scope
- Any changes visible at desktop widths (> 768px)
- Logic, routing, or data changes
- Any page not mentioned (Radio, Submit Track, Charts, etc.)

## Tasks
1. **Home mobile centering & logo fix** — In `index.css` under `@media (max-width: 768px)`, increase `.main-logo-icon` and `.main-logo-text` sizes by 1.5× their current values. Add rules to center the hero headline block (`[data-testid="section-hero"]` title elements) and center `[data-testid="hero-inline-row"]` (DISCOVER MORE + LiveVotingWidget) horizontally using `justify-content: center` and `align-items: center`, removing any left offset.

2. **Creators card stats clipping fix** — In `index.css` under `@media (max-width: 768px)`, increase the bottom padding on `.creators-grid [data-testid^="card-creator"]` to `20px`, and reduce the font-size of the stats row (Tracks, Plays, Win Rate labels and values) by 15% relative to current values. Ensure the card has `overflow: visible` so no text is clipped.

3. **Battle page scroll, footer overlap & title fix** — In `index.css` under `@media (max-width: 768px)`: set `overflow-y: auto !important` on `.battle-outer-wrapper` and the battle page root to unfreeze scrolling; reduce `.battle-player-container` `max-height` by 20% (from current value); add sufficient `padding-bottom` to the scroll container so content clears the fixed footer; ensure `[data-testid="button-vote-track-a"]` and `[data-testid="button-vote-track-b"]` have a high enough `z-index` to stay above the footer. In `Battle.tsx`, ensure the page title renders as the full "NEX BATTLE ARENA" string and is `text-center` aligned.

## Relevant files
- `client/src/index.css:183-451`
- `client/src/pages/Home.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/components/Layout.tsx:63-66`

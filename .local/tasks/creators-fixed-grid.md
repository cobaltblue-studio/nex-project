# Creators Fixed 4×5 Grid with Placeholders

## What & Why
The Creators page should always display a fixed 4-column × 5-row grid (20 slots total). Any slots not occupied by a real creator should show a styled placeholder card labeled "Future Creator". This gives the page a consistent, structured look regardless of how many creators exist.

## Done looks like
- The grid is always 4 columns wide and 5 rows tall (20 cards total), on all screen sizes.
- Real creator cards appear first, sorted by total plays (existing logic unchanged).
- Remaining slots (up to 20) show a "Future Creator" placeholder card with a distinct muted/empty style.
- Placeholder cards are not clickable links.
- No layout toggle or responsive column-count change — always 4 columns.

## Out of scope
- Pagination or showing more than 20 creators.
- Changes to the creator card content or stats layout.
- Changes to how creator data is fetched.

## Tasks
1. Replace the responsive grid class with a fixed 4-column grid (`grid-cols-4`) and render exactly 20 slots, padding with placeholder entries if creators are fewer than 20.
2. Style placeholder cards with a muted, "empty slot" look — dimmed border, ghost avatar, and "Future Creator" label — to clearly distinguish them from real creator cards.

## Relevant files
- `client/src/pages/CreatorList.tsx`

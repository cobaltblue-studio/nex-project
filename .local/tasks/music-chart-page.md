# Dedicated Music Chart Page

## What & Why
The `/music` route currently renders the `Rising` component. Per the NEX_MASTER_SPEC, `/music` must display a dedicated Top 100 Music Chart — a completely separate page from Rising. This fix creates that page and corrects the routing.

## Done looks like
- Navigating to `/music` shows a "Top 100" music chart, not the Rising page
- 100 rank slots are always rendered (1–100), even if fewer than 100 tracks exist — empty slots appear as placeholder rows
- Each filled slot shows: rank number, track title, creator name, play count, win rate (if available), and a listen button linking to `/track/:id`
- The visual layout matches the row-based chart style used in the Rising component (dark rows, monospace rank number, hover states)
- `/rising` continues to render the Rising component unchanged
- The page header identifies this as the NEX Top 100 Music Chart

## Out of scope
- Pagination (all 100 slots render in one view)
- Filtering or sorting controls
- Any changes to the Rising page

## Tasks
1. **Create `Music.tsx` page** — Build a new page at `client/src/pages/Music.tsx` that fetches up to 100 tracks from `/api/tracks?sortBy=rankingScore&limit=100`, then renders exactly 100 rank rows. Real tracks fill their slot with title, creator name, play count, win rate, and a listen link; empty slots (ranks with no track) render a dim placeholder row with just the rank number.

2. **Fix App.tsx routing** — Import the new `Music` component and change the `/music` route from `Rising` to `Music`. The `/rising` route must remain mapped to `Rising`.

## Relevant files
- `client/src/App.tsx`
- `client/src/pages/Rising.tsx`
- `client/src/pages/Music.tsx`

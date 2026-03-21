# Three UI Precision Fixes

## What & Why
Three targeted corrections to the Header logo size, the Player page song title size, and the redundant TITLE field in the metadata grid.

## Done looks like
- Desktop header: the Disc3 icon and "NEX" text render at a professional 28–32px range; mobile renders at ~50% larger than desktop
- Player page: the song title below the video is noticeably smaller (~40% reduction), reading as a clean header rather than an overwhelming banner
- The metadata info grid below the player shows only RANK, ARTIST, and VOTES — the duplicate TITLE entry is gone

## Out of scope
- Any other layout, styling, or feature changes

## Tasks

1. **Header logo size fix** — In `Layout.tsx`, update the `<span>` holding "NEX" from `text-[1.875rem] sm:text-xl` to a value where desktop (sm+) is ~1.875rem (30px) and mobile base is ~50% larger (~2.8rem). Also update the `Disc3` icon classes to match proportionally if needed.

2. **Player title font reduction** — In `MVDetail.tsx`, reduce the `<h1>` song title classes from `text-4xl md:text-5xl` to approximately `text-2xl md:text-3xl` (roughly 40% smaller).

3. **Remove TITLE from metadata grid** — In `MVDetail.tsx`, delete the two `<div>` elements for the TITLE label and TITLE value from the metadata grid. Update the grid column count from `grid-cols-2 md:grid-cols-4` to `grid-cols-3` since only three items remain (RANK, ARTIST, VOTES).

## Relevant files
- `client/src/components/Layout.tsx`
- `client/src/pages/MVDetail.tsx`

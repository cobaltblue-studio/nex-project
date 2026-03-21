# NEX UI/UX Branding & Detail Fix

## What & Why
Four targeted visual corrections to tighten card containment, improve track detail hierarchy, simplify player controls, and restore the NEX logo size. No logic changes.

## Done looks like
- Creator cards on the Creators page fully contain all text and metadata — nothing overflows outside the card border on any screen size
- On the Track Detail page, the "BY [CREATOR]" line has noticeably more vertical space separating it from the song title, and its font is visibly smaller than the title
- The player control bar shows only ◀ and ▶ triangle icons — no "UP NEXT" text, no "NEXT" label
- The NEX logo in the top header bar is clearly legible at approximately 24–28px on both mobile and desktop

## Out of scope
- Any playback logic or routing changes
- Redesigning the layout of any page beyond the four specified elements
- Adding or removing any navigation items

## Tasks
1. **Creator card overflow fix** — Add `overflow: hidden` and `box-sizing: border-box` to the creator card's inline style so all metadata stays inside the card boundaries at every viewport size.

2. **Track Detail creator name refinement** — Increase the top margin between the song title and the "BY [CREATOR]" line, and reduce the creator name's font size by approximately 20% (from `text-xs` / 12px to ~10px) for better visual hierarchy.

3. **Player controls simplification** — Remove the "UP NEXT · [title]" text block from the controls bar. Replace the "NEXT" labeled button with a minimal pair of left (◀) and right (▶) triangle icon buttons only, keeping the autoplay toggle on the left.

4. **NEX logo size restore** — Ensure the NEX text in the header is rendered at `text-2xl` (24px) and the accompanying icon at `w-6 h-6`, with no mobile CSS overrides reducing it below that size.

## Relevant files
- `client/src/pages/CreatorList.tsx:152-211`
- `client/src/pages/WorkDetail.tsx:208-245,259-266`
- `client/src/components/Layout.tsx:63-67`

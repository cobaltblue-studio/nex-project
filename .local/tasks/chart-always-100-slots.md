# Chart Always Shows 100 Slots

## What & Why
Both the Music chart and MV chart should always display exactly 100 numbered rows. When a slot has no track, it shows a placeholder instead of hiding the row or collapsing to an empty-state screen.

## Done looks like
- Both charts always render 100 rows, even when zero tracks exist
- Filled slots render the track as before
- Empty slots show: rank number + `— empty` (e.g. `01 — empty`, `02 — empty`)
- The "No tracks ranked yet" / "No music videos ranked yet" full-page empty state is removed — the 100-slot list itself serves as the empty state
- Error state (failed to load) is still shown as before

## Out of scope
- Changing the visual design of filled track rows
- Zone labels / Legend-Elite-Rising zone banners (kept as-is on Music chart)
- Any backend or API changes

## Tasks
1. **Music chart — always show slots**: Remove the `tracks.length === 0` branch that renders the "No tracks ranked yet" message. Instead, always render the 100-slot list (the existing slots logic already fills empties with `null`). Update the empty slot placeholder to display the rank number followed by `— empty`.

2. **MV chart — add 100-slot system**: Add a `TOTAL_SLOTS = 100` constant and build the same slots array pattern as the Music chart. Replace the `tracks.map(...)` render with a `slots.map(...)` render, showing filled entries for existing tracks and `rank — empty` placeholders for missing ones. Remove the `tracks.length === 0` empty-state branch.

## Relevant files
- `client/src/pages/Music.tsx`
- `client/src/pages/MusicVideo.tsx`

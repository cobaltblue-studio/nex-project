# Battle Title Mobile Alignment Fix

## What & Why
The "BATTLE ARENA" title on mobile sits further left than "NEW ON NEX" because the `battle-page-container` class is on the same outer div as the title header. A mobile CSS rule targets `.battle-page-container h1, .battle-page-container h2` and applies `margin: 10px 0 !important`, which disrupts the natural alignment of the title block. The New.tsx outer wrapper has no such class, so its title renders correctly.

## Done looks like
- On mobile, the "BATTLE ARENA" title starts at exactly the same horizontal position as the "NEW ON NEX" title on the `/new` page.
- No manual `margin-left`, `padding-left`, or pixel-nudge hacks are used.
- All existing battle page mobile CSS (stats panel, vote grid, scroll behaviour, etc.) still works correctly.

## Out of scope
- Any visual changes beyond the title header alignment.
- Changes to the `/new` page or any other page.

## Tasks
1. **Restructure the Battle.tsx outer wrapper** — Change the outermost `<div className="max-w-3xl mx-auto battle-page-container">` so it matches New.tsx exactly: `<div className="max-w-3xl mx-auto">`. Then move the `battle-page-container` class to a new inner `<div>` that wraps only the content that comes **after** the `<div className="mb-10">` header block (i.e., the flash overlay, stats panel, vote grid, and everything below). This ensures the title header is never inside `battle-page-container` and is therefore free of the overriding margin CSS rule.

## Relevant files
- `client/src/pages/Battle.tsx:353-374`
- `client/src/pages/New.tsx:31-52`
- `client/src/index.css:278-283`

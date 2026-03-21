# Data Reset & Title Alignment Fix

## What & Why
Two things need to happen: (1) clear all rows from the `tracks` and `battles` tables so the platform starts with a clean slate, and (2) make the "BATTLE ARENA" and "SUBMIT TRACK" page title sections visually identical to the "NEW ON NEX" title section in terms of font size, spacing, and margins.

The `/new` page title block is the reference standard:
- Header wrapper: `<div className="mb-10">`
- Label row: `<div className="flex items-center gap-3 mb-2">`
- Label h1: `text-[11px] font-bold tracking-[0.4em] uppercase text-primary`
- Main h2: `text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green`

## Done looks like
- The `MUSIC` and `NEW` pages show no tracks (empty state) because all track data has been deleted.
- The `BATTLE ARENA` title on `/battle` is the same size, weight, and margin as `NEW ON NEX` on `/new`.
- The `SUBMIT TRACK` title on `/submit` is the same size, weight, and margin as `NEW ON NEX` on `/new`.
- All three main titles (NEW ON NEX, BATTLE ARENA, SUBMIT TRACK) appear visually in perfect vertical alignment when switching pages.

## Out of scope
- Seeding new dummy data
- Any other UI changes beyond the title header blocks
- Changes to the Music or Home pages

## Tasks
1. **Clear database tables** — Delete all rows from `tracks` and `battles` via a SQL `DELETE FROM` (or `TRUNCATE`) on both tables using the database connection.
2. **Fix Battle.tsx header** — Update the header wrapper div from `mb-2` to `mb-10`, update the label flex row from `mb-1` to `mb-2`, and ensure the h2 title uses `text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green` (matching New.tsx exactly).
3. **Fix SubmitTrack.tsx header** — Update the h1 title from `text-lg md:text-2xl font-black` to `text-3xl md:text-4xl font-display font-bold`, update the label row spacing to `mb-2` (matching New.tsx), and ensure the header wrapper uses `mb-10`.

## Relevant files
- `client/src/pages/New.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/SubmitTrack.tsx`
- `shared/schema.ts`
- `server/storage.ts`

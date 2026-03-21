# Title Alignment & Data Reset Fix

## What & Why
Two issues need correcting:
1. The page titles on BattleArena and SubmitTrack do not start at the same pixel position as the NEW ON NEX title. This is because their outer container wrappers use different max-width, padding, and structure than the New page.
2. The database is not empty on startup — seed data is being inserted, so the music lists are not empty as required.

## Done looks like
- The title area on the Battle Arena page and Submit Track page uses the exact same outer container structure and class names as the New page (`max-w-3xl mx-auto`), so all three page titles begin at an identical horizontal position.
- No `mt-*` margin hacks are used to compensate for structural differences.
- On server startup, all records in the Tracks and Battles tables are deleted before any other logic runs.
- The music lists on Battle Arena and Submit Track are completely empty when the app loads fresh.
- The seed function is skipped or not called after the clear, so no data is re-inserted automatically.

## Out of scope
- Changing any visual styling (neon glow, colors, fonts) on the titles.
- Resetting any other tables (users, profiles, etc.).
- Adding any admin UI for the data reset.

## Tasks
1. **Title structure copy** — In `client/src/pages/Battle.tsx`, replace the outer fixed-wrapper page structure with the same `max-w-3xl mx-auto` container pattern used in `New.tsx`, preserving all inner battle content and logic. Apply the identical change to `client/src/pages/SubmitTrack.tsx`, replacing its `max-w-xl mx-auto px-4 py-12` outer wrapper with the `max-w-3xl mx-auto` pattern from `New.tsx`.

2. **Data clear on startup** — Add a `clearAllData()` method to the storage interface and implementation in `server/storage.ts` that deletes all rows from the Tracks and Battles tables. In `server/index.ts`, call `clearAllData()` once at server startup, before the seed call. Then either skip the seed call entirely or guard it so it does not re-insert data after the clear.

## Relevant files
- `client/src/pages/New.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/SubmitTrack.tsx`
- `server/storage.ts`
- `server/index.ts`
- `server/seed.ts`

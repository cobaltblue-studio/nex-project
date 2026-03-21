# Header Toggle, Battle Hierarchy & Mobile Centering

## What & Why
Three precision UI corrections to improve the premium feel and usability of the platform: (1) a mode-switch toggle in the header replacing the current role + country display, (2) a cleaner information hierarchy on the Battle page removing redundant text, and (3) guaranteed X-axis centering of key elements on mobile.

## Done looks like
- Header shows a LISTENER / CREATOR toggle pill instead of "LISTENER · SOUTH KOREA". Clicking it switches the active mode. Default is LISTENER. Country is gone from the header entirely.
- Battle page top indicator is a single minimal line: "BATTLE ROUND X/5" at 10px. The "NEX BATTLE ARENA", "GLOBAL AI MUSIC BATTLE", "Any Genre Battle", and "Now Playing — Track A/B (20s Preview)" label blocks are removed. The player section order is: Media → Progress Bar → Title → Artist (already correct inside BattleTrackPlayer — just the redundant surrounding text is removed).
- The discovery ChevronDown arrow on the Home page and the voting result graphs on the Battle page are perfectly centered on the X-axis in mobile view.

## Out of scope
- Persisting the LISTENER/CREATOR mode to the database or changing any backend role logic. The toggle is a local UI state switch.
- Any redesign of the CREATOR dashboard environment beyond reflecting the toggled mode label in the header.

## Tasks
1. **Header mode-switch toggle** — Replace the `roleDisplay` text (which currently includes country) in `Layout.tsx` with a two-pill toggle (LISTENER | CREATOR). Store the active mode in local component state (default LISTENER). Show only the selected mode pill as active/highlighted. Remove country from all header display contexts.
2. **Battle page heading cleanup** — In `Battle.tsx`, remove the entire heading block containing "NEX BATTLE ARENA", "GLOBAL AI MUSIC BATTLE", "Any Genre Battle", and the "headphones + Battle X/5 today" row. Replace it with a single minimal "BATTLE ROUND {displayCount} / {dailyMax}" label at 10px in a high-end tracking font, centered. Also remove the "Now Playing — Track A/B" label rows that appear above the `BattleTrackPlayer` in the `track-a` and `track-b` phases.
3. **Mobile X-axis centering** — Ensure the `ChevronDown` discovery arrow in `Home.tsx` is wrapped in a centered flex container. Ensure the result-screen vote graphs (`max-w-md mx-auto`) in `Battle.tsx` have `items-center` and `w-full` applied correctly so bars and labels are flush-centered on mobile. Audit all affected containers for `items-center justify-center` or `mx-auto` as needed.

## Relevant files
- `client/src/components/Layout.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/Home.tsx`

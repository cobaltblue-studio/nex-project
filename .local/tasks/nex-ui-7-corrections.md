# NEX UI – 7 Precision Corrections

## What & Why
Apply seven targeted CSS/layout-only fixes across the NEX platform to resolve mobile layout breaking, font sizing issues, card asymmetry, and off-center elements. No logic changes — style overrides only.

## Done looks like
1. **Creators Grid**: All creator cards (including active ones) are the same size. No card uses extra `col-span` or `row-span`. Grid is 4 columns on desktop, 2 on mobile, perfectly symmetrical.
2. **Hero Buttons**: START BATTLE, SUBMIT TRACK, and RADIO buttons are ~30% smaller in padding/font. On mobile, all three appear in a single horizontal row (no wrapping). The "DISCOVER MORE" scroll indicator is visible on the first screen without scrolling (hero height reduced to accommodate).
3. **Trending List (MusicRow)**: Song title font reduced ~30%. Long titles wrap to two lines instead of truncating. VS badge in the Live Battle Arena section is vertically centered between the two competing track titles.
4. **Live Rankings (Trending Today section)**: "TRENDING TODAY" / "Trending Today" neon title is 30% smaller on mobile. Each `MusicRow` on mobile is restructured into 3 vertical layers: (1) Track title, (2) Artist + metadata tags (AI tool, AI DNA, etc.), (3) Win Streak badge at the very bottom.
5. **Music Chart**: Track title font in `Music.tsx` rows reduced ~30%. AI metadata/specification tag moved from inline (side) position to bottom of the track info block, placed next to the Win Streak badge.
6. **Radio View**: The center block (radio icon + "NEX TOP 100 RADIO" title + play button) is vertically centered on screen. Play button is repositioned so it does not overlap or sit directly under the title text.
7. **Global Neon Titles**: All elements using `neon-text-strong`, `neon-text-green`, or `.font-display` heading classes on `h1`/`h2` receive a `@media (max-width: 768px)` override that reduces font size by ~30% to prevent layout overflow on mobile.

## Out of scope
- Any logic, routing, data, or animation changes
- Desktop layout changes beyond what is specified
- New components or pages

## Tasks
1. **Creators Grid uniformity** — Remove `col-span-2 row-span-2` featured card overrides in `CreatorList.tsx` so all cards use the same single-cell size in the 4-column/2-column grid.
2. **Hero buttons: size + mobile row + hero height** — In `Home.tsx`, reduce button padding/font ~30%, change the button wrapper from `flex-wrap` to `flex-nowrap` on mobile so the three buttons stay in one row, and reduce the hero section's min-height so "DISCOVER MORE" is visible without scrolling on mobile.
3. **Trending List: title wrap + VS centering** — In `MusicRow.tsx`, change title from `truncate` to `break-words whitespace-normal leading-tight` and reduce its font size ~30%. In the Live Battle Arena section of `Home.tsx`, ensure the VS badge uses `self-center` or `items-center` so it is vertically centered between both track titles regardless of title line count.
4. **Live Rankings mobile restructure + title size** — In `Home.tsx`, reduce the "Trending Today" `h2` mobile font size ~30%. In `MusicRow.tsx`, add mobile-only (`md:hidden`) flex-column layout that stacks: title first, then artist + tool + AI DNA row, then Win Streak badge on its own bottom row.
5. **Music Chart: title font + AI metadata position** — In `Music.tsx`, reduce the track title font size ~30%. Move the AI DNA / aiPrompt display block from its current inline side position to a bottom row beneath the title/artist block, placed next to the Win Streak badge.
6. **Radio center block + play button positioning** — In `Radio.tsx`, adjust the center content container so the radio icon + title + play button block is truly vertically centered within the available screen height. Ensure the play button has sufficient top margin/padding so it does not overlap with "NEX TOP 100 RADIO" text.
7. **Global neon title mobile size reduction** — Add `@media (max-width: 768px)` CSS rules (in `index.css` or as Tailwind responsive overrides) that reduce all `neon-text-strong` / `font-display` `h1`/`h2` elements by ~30% from their current sizes to prevent overflow on small screens.

## Relevant files
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/Radio.tsx`
- `client/src/components/MusicRow.tsx`
- `client/src/index.css`

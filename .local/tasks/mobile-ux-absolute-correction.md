# NEX UI/UX Absolute Correction – Mobile First

## What & Why
Apply 8 precise layout corrections across the NEX platform to eliminate overlapping elements on mobile and improve readability. All changes are mobile-first and must keep every section within the viewport without horizontal or excessive vertical scrolling.

## Done looks like
1. **Creator Cards** — All 20 creator grid cells (both filled and empty "Future Creator") share the same uniform size. Filled cards show the avatar centered at the top, name centered below, and 3 metric icons (Tracks / Plays / Win Rate) in a single horizontal row at the bottom — matching the vertical stack style of the empty placeholder cards.
2. **Radio Page** — The pre-radio splash (icon + titles + button) is perfectly vertically centered on screen on mobile.
3. **New on NEX** — Song title font is 20% smaller and clipped to a single line. The [LISTEN] button and [AI_DNA] badge sit on a new dedicated row below the title, not inline with the creator name.
4. **Music Chart** — Song title font is 20% smaller. Artist name font is 10% smaller. [Genre], [AI_DNA], and the [LISTEN] button form a single third-line row beneath the artist name on all screen sizes.
5. **Trending Today (MusicRow)** — Song title font is 20% smaller. All inline badges and icons are downsized so nothing overflows or overlaps on mobile.
6. **Home Battle Component** — Song titles are 20% smaller. On mobile, Track A title, the "VS" badge, and Track B title stack vertically in a single column, with "VS" precisely centered between the two titles. On desktop the existing side-by-side layout is preserved.
7. **Hero Section** — The "DISCOVER MORE" / ChevronDown scroll indicator is repositioned so it is fully visible above the fold on the first screen on mobile (not pushed below 100vh).
8. **Global Typography** — All elements with neon-glow title classes (`neon-text-strong`, `neon-text-green`, `neon-text`) receive a 20% font-size reduction on mobile via the existing `@media (max-width: 768px)` block in `index.css`.

## Out of scope
- Changing any desktop layout beyond what is explicitly described above.
- Visual style changes (colors, glow effects, borders) beyond font sizing and stacking order.
- Any changes to pages not listed (Battle, Profile, Submit, Admin, etc.).

## Tasks
1. **Creator Card vertical layout** — Refactor the filled creator card JSX in `CreatorList.tsx` to use a vertical flex-column layout (avatar centered at top, name centered, metrics row at bottom) matching the proportions of the empty placeholder cards. Ensure both filled and empty cards use identical container sizing so the grid rows align uniformly.

2. **Radio pre-start centering** — Audit the Radio page pre-start `flex-col items-center justify-center flex-1` wrapper and add any necessary mobile CSS or structural fix to guarantee true vertical centering on mobile viewports.

3. **New on NEX row restructure** — In `New.tsx`, reduce the title's `text-sm` to 80% equivalent and force `truncate` single-line. Move the `[LISTEN]` button and `[AI_DNA]` badge out of the inline creator row and into a new second row directly below the title block.

4. **Music Chart row restructure** — In `Music.tsx`, shrink the track title class by 20% and artist name by 10%. Pull `[Genre]`, `[AI_DNA]`, and the `[LISTEN]` button out of the hidden-on-mobile flex areas and place them in a dedicated third-line row that is always visible.

5. **Trending Today MusicRow resize** — In `MusicRow.tsx`, reduce the title font by 20% and trim badge/icon sizes so the row never overflows on mobile. Remove the `transform: scale(0.6)` CSS override in `index.css` that was applied to `[data-testid="section-trending-today"]` if it causes clipping; replace with proper inline sizing instead.

6. **Home Battle vertical stack** — In `Home.tsx` battle component (around line 437–485), reduce both track title fonts by 20%, and on mobile switch the `flex items-center justify-center gap-8` row to a vertical column: Track A name → VS badge → Track B name, with VS visually centered between them. On `md:` breakpoints preserve the side-by-side layout.

7. **Hero DISCOVER MORE positioning** — In `Home.tsx`, adjust the `mobile-discover-fixed` / `scroll-guide` element so the "DISCOVER MORE" indicator sits visibly within the first 100svh on mobile — move it upward (e.g. reduce the `bottom` offset or restructure within the hero flex column) so it is not clipped or hidden below the fold.

8. **Global neon title mobile reduction** — In `index.css`, review and tighten the `@media (max-width: 768px)` neon-title rules so that `h1.neon-text-strong`, `h2.neon-text-green`, and related heading selectors are consistently 20% smaller than their desktop counterparts across all pages.

## Relevant files
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/Radio.tsx`
- `client/src/pages/New.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/Rising.tsx`
- `client/src/pages/Home.tsx`
- `client/src/components/MusicRow.tsx`
- `client/src/index.css`

# Mobile UX Overhaul – All Pages

## What & Why
Fix the broken mobile experience across Home, Battle, Radio, Creators, and Submit Track pages. The current layout overflows, clips buttons, and renders poorly on screens narrower than 768px. Apply targeted CSS overrides and minor JSX adjustments to make every page fit on a single mobile viewport without horizontal scroll or clipped UI.

## Done looks like
- All h1/h2 neon titles are 30% smaller on mobile and never overflow the screen width.
- On Home, the "DISCOVER MORE" arrow and text are always visible above the fold on all mobile resolutions (fixed position, bottom 20px, z-index 10000).
- On Battle (mobile), the "GLOBAL AI MUSIC BATTLE" heading has 10px top margin, the YouTube/iframe player is constrained to max-height 25vh, track info panels and the VS logo are grouped tightly, and both Vote buttons are fully visible on screen without scrolling.
- On Radio (mobile), the large "Start Radio" button is hidden. In its place, a pulsating neon green ▷ play icon sits inline with the "NEX TOP 100 RADIO" title, overlaid on the "O". It uses the existing "breathing" animation pattern to indicate it is alive and tappable.
- On Creators (mobile), all creator cards form a strict uniform 2-column grid — no cards span multiple columns or rows on mobile.
- On Submit Track (mobile), the h1 neon text-shadow is milder (0 0 8px) for sharp readability, and all input/textarea fields have 12px padding for comfortable touch targets.

## Out of scope
- Any changes to desktop layout (≥768px).
- Functional logic, voting, audio playback, or data-fetching changes.
- Any animation or visual design changes beyond what is specified above.

## Tasks
1. **Global mobile font scaling** — Add a `@media (max-width: 768px)` block in `index.css` that reduces h1 and h2 font sizes by 30% and softens the `.neon-text-green` / `.neon-text-strong` text-shadow to `0 0 8px` for sharpness. Also add a `@keyframes radio-breathe` animation for the Radio play icon.

2. **Home – fix DISCOVER MORE visibility** — On mobile, make the scroll indicator ("DISCOVER MORE" + chevron) `position: fixed`, `bottom: 20px`, `z-index: 10000` so it is always visible above the fold regardless of scroll position or viewport height.

3. **Battle – compact mobile layout** — On mobile: reduce the top-of-page header margin to 10px, constrain the `TrackPreviewPlayer` container to `max-height: 25vh` (overriding the current 40vh), tighten spacing between Track A info, VS logo, and Track B info panels, and ensure the vote button grid is visible within one screen without scrolling.

4. **Radio – replace Start Radio button with inline neon play icon** — On mobile, hide the full-width "Start Radio" button using `hidden sm:flex` (or equivalent). Render a small `▷` text character (or Play icon) that is absolutely positioned over the "O" in the "NEX TOP 100 RADIO" h2 title, styled with neon green color and the `radio-breathe` animation. Tapping it calls the same `startRadio` function.

5. **Creators – enforce uniform 2-column grid on mobile** — On mobile, override the featured creator cards' `col-span-2 row-span-2` so every card is `col-span-1 row-span-1`, producing a perfectly uniform 2-column grid with equal card dimensions and spacing.

6. **Submit Track – milder glow and touch-friendly inputs** — On mobile, reduce the h1 neon text-shadow to `0 0 8px` and apply `padding: 12px` to all input and textarea fields in the submission form.

## Relevant files
- `client/src/index.css`
- `client/src/pages/Home.tsx:316-350`
- `client/src/pages/Battle.tsx:107-160,365-410,560-638`
- `client/src/pages/Radio.tsx:128-155`
- `client/src/pages/CreatorList.tsx:146-165`
- `client/src/pages/SubmitTrack.tsx:166-180,299-415`

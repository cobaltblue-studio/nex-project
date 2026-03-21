# Logo, Player, Creator Card & Nav Fix

## What & Why
Four targeted UI bugs need to be resolved after the previous logo scaling task introduced regressions and left other issues unresolved. Fixes cover the header logo size, the broken Previous track button, creator card content overflow, and oversized bottom nav labels.

## Done looks like
- **Logo (desktop):** NEX logo is compact and professional at approximately 28–32px height — the icon is ~28px and text is sized to match. It does not dominate the screen.
- **Logo (mobile only):** Logo is 50% larger than the desktop default size but still fits neatly inside the header bar without overlapping other elements.
- **Previous track button:** The ◀ button is visible, styled with the same neon glow as the ▶ Next button, is clickable, and navigates to the previous track. It is disabled (not invisible or broken) only when there is no previous track.
- **Creator cards:** Avatar, name, and metrics are fully contained inside each card with no overflow. Card uses centered flex column layout.
- **Bottom nav labels:** Font size reduced by ~30% (from the current forced 10px down to approximately 7px). Icons remain sharp and properly aligned above their labels.

## Out of scope
- Any redesign of the player, creator list, header, or nav beyond these specific fixes.
- Changes to any other pages or components.

## Tasks
1. **Logo sizing** — In `Layout.tsx`, reduce the desktop logo to approximately 28–32px total height (icon `w-7 h-7`, text `text-xl` or equivalent). Add a responsive mobile-only override (via Tailwind `sm:` breakpoint or a scoped CSS class) that scales the logo to 1.5× the desktop size while remaining fully contained within the header.

2. **Previous track button** — In `WorkDetail.tsx`, implement a `goToPrev` function mirroring `goToNext` using a `prevTrack` derived value. Replace the static `<span>` placeholder with a `motion.button` that uses the same neon-glow and hover styling as the Next button. The button should be disabled (with `opacity-30`) only when there is no previous track, never `cursor-not-allowed` or permanently invisible.

3. **Creator card overflow fix** — In `CreatorList.tsx`, update the creator card's outer container class to enforce `flex flex-col items-center justify-center text-center` with `overflow-hidden`, `box-sizing: border-box`, and adequate padding so the avatar, name, and metrics grid never escape the card boundaries.

4. **Bottom nav label font reduction** — In `index.css`, update the forced `span` font-size inside `.mobile-bottom-nav` from `10px !important` to `7px !important`. Verify icon size remains at `20px !important` and that vertical alignment between icon and label stays correct.

## Relevant files
- `client/src/components/Layout.tsx`
- `client/src/pages/WorkDetail.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/index.css`

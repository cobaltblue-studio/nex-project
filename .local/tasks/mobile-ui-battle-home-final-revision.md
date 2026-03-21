# Mobile UI Final Revision – Battle & Home

## What & Why
Targeted mobile-only (max-width: 768px) layout fixes for the Battle page and Home page to improve usability and visual hierarchy. The main problem is that both Track A and Track B vote buttons are not visible on a single screen on mobile — requiring the user to scroll. Secondary issues are branding alignment on the Home page.

## Done looks like
- **Battle page (mobile):** The "(20s Preview)" text label next to "TRACK A" / "TRACK B" headings inside the track cards is removed. The music/video preview artwork area is visibly shorter (≈35% height reduction). The "Today Battle Stats" card and Track A/B cards have tighter vertical margins/padding. The site footer is completely hidden on the Battle page on mobile. Both "VOTE TRACK A" and "VOTE TRACK B" buttons are visible on one screen without scrolling after the preview finishes.
- **Home page (mobile):** The blue NEX header logo (top left) is visually scaled down to match the height of the "LOGIN" button beside it. The green NEX hero text in the center is 1.8× larger than its current size. "DISCOVER MORE" text/icon and the "LIVE VOTING TRENDS" widget are horizontally centered (not left-aligned).

## Out of scope
- Any changes to desktop layout (min-width: 769px and above must be untouched)
- Changes to any other pages beyond Battle and Home
- Logic or data changes — purely CSS/layout adjustments

## Tasks
1. **Battle page – remove "(20s Preview)" label from track cards** — In `Battle.tsx`, find where the "20S PREVIEW" / "(20s Preview)" text is rendered inside the TRACK A / TRACK B card headers (separate from the "NOW PLAYING — TRACK B (20S PREVIEW)" status bar) and remove it. Apply the change only for mobile via a CSS class or conditional render guarded by a `md:` breakpoint.

2. **Battle page – shrink preview artwork and tighten vertical spacing (mobile)** — Add mobile-only CSS (inside a `@media (max-width: 768px)` block) to reduce the YouTube/video preview container height by ~35%, and reduce top/bottom margin and padding on the "Today Battle Stats" card and the Track A/B cards.

3. **Battle page – hide footer on mobile** — In `Layout.tsx`, add `md:flex` (hidden on mobile) or equivalent Tailwind class to the `<footer>` element so it does not render on screens ≤ 768px when the user is on the `/battle` route. Alternatively, add a global `@media` CSS rule targeting the footer specifically on mobile with `display: none !important`.

4. **Home page – scale down header logo on mobile** — In `Layout.tsx`, add mobile-only Tailwind classes to the header NEX logo (the `<Link>` wrapping the logo) to reduce its size so it visually matches the height of the LOGIN button.

5. **Home page – enlarge hero NEX text on mobile** — In `Home.tsx`, increase the green "NEX" hero text font size by 1.8× on mobile using a responsive Tailwind class or a `@media (max-width: 768px)` CSS override.

6. **Home page – center "DISCOVER MORE" and Live Voting Trends widget on mobile** — In `Home.tsx`, add mobile-only centering (e.g., `text-center`, `justify-center`, `items-center`, `mx-auto`) to the container holding the "DISCOVER MORE" text/icon and to the `LiveVotingWidget` so they are horizontally centered rather than left-aligned on mobile.

## Relevant files
- `client/src/pages/Battle.tsx`
- `client/src/pages/Home.tsx`
- `client/src/components/Layout.tsx`

# Mobile UX & Country Selection Final Fix

## What & Why
A consolidated set of mobile UI corrections across four areas — Home, Battle, Creators, and post-login country selection — to improve visual balance, readability, and first-time user data collection on mobile viewports. All CSS changes are scoped to max-width: 768px and must not affect the desktop layout.

## Done looks like
- **Home (mobile)**: The header blue NEX logo is scaled down to visually match the height of the "LOGIN" button text. The "DISCOVER MORE" text/icon and the "Live Voting Trends" chart widget are horizontally centered (not skewed left).
- **Battle (mobile)**: The "(20s Preview)" sub-label next to TRACK A / TRACK B is on its own line below the track title and is 25% smaller in font size. The footer (© 2026 NEX, ABOUT NEX) is hidden entirely. The central music artwork/video preview is 35% shorter. Track A and Track B voting buttons are both visible on one screen without scrolling.
- **Login — Country Selection**: After a successful social login (via Replit Auth), if the user's profile has no country set, a mandatory "Select Your Country" modal or full-screen overlay appears before reaching the main app. The UI uses a dark-themed dropdown consistent with the NEX aesthetic. The selected country is saved to the user's profile via the existing PATCH `/api/profile` endpoint.
- **Creators (mobile)**: Creator card font sizes are reduced by ~15%. Each card has 25px of bottom padding added so text is not clipped at the bottom edge.

## Out of scope
- Any changes to desktop layout (min-width > 768px).
- Adding a new country field to the database schema (the `country` column already exists in profiles).
- Changing the login/auth provider or flow itself.
- Changing the main app navigation or routing outside of the country-gate logic.

## Tasks
1. **Home mobile centering & logo scale** — In `Home.tsx`, scope mobile-only styles to center the "DISCOVER MORE" row and the Live Voting Trends widget. Scale the header blue NEX logo image down so its visual height matches the LOGIN button text.
2. **Battle mobile compression** — In `Battle.tsx`, add mobile-only CSS to: force the "(20s Preview)" label onto its own line below the track title at 75% font size; hide the footer with `display: none`; reduce the artwork/video preview container height by 35%.
3. **Post-login country selection modal** — Add a `CountrySelectModal` component that appears when the authenticated user's profile has `country === null`. Show it as a blocking overlay on the home/app entry point. On submit, call `PATCH /api/profile` with the chosen country and dismiss the modal. Use a dark-themed select matching the NEX design system.
4. **Creators card mobile text fix** — In `CreatorList.tsx`, reduce font sizes inside creator cards by 15% on mobile and add 25px of bottom padding to each card.

## Relevant files
- `client/src/pages/Home.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/App.tsx`
- `server/routes.ts`
- `shared/schema.ts`

# Hero Layout Balance & Mobile Logo

## What & Why
Three targeted layout corrections on the Home page hero section to improve visual balance on both desktop and mobile: pull the hero content upward so the Trend Graph and "DISCOVER MORE" indicator are always visible within the first screen, enlarge the mobile header logo to 28px for clearer branding, and tighten the gap between the action buttons and the scroll indicator.

## Done looks like
- On a standard 100vh screen (desktop and mobile), the "DISCOVER MORE" text and the LiveVotingWidget trend graph are both visible without any scrolling.
- The hero `NEX` title and 3 action buttons sit higher on the page — roughly 10–15% higher than current position.
- The mobile header logo (top-left) renders at 28px height — bolder and clearly readable — while remaining vertically aligned with the Login button.
- The 3-button row and the "DISCOVER MORE" indicator are closer together (tighter gap), so the indicator is not pushed below the fold.

## Out of scope
- Any other pages beyond the Home hero and Layout header.
- Changes to desktop logo sizing.
- Changes to button styles, colors, or labels.

## Tasks
1. **Reduce hero top padding** — Lower the `paddingTop` on the hero section from `5vh` to approximately `2vh` (or a value that brings content 10–15% higher) and tighten internal spacing between the buttons div and the bottom inline row so the "DISCOVER MORE" indicator fits within 100svh on typical mobile screens.
2. **Mobile logo size** — In the Layout header, increase the logo `<span>` text size on mobile to render at 28px height (approximately `text-[1.75rem]`), keeping the Disc3 icon proportionally sized and the logo vertically centred with the Login button.

## Relevant files
- `client/src/pages/Home.tsx:244-360`
- `client/src/components/Layout.tsx:63-67`

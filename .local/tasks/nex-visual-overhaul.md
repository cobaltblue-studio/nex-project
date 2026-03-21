# NEX 2.0 High-End Visual Overhaul

## What & Why
Apply a comprehensive top-class visual upgrade to the NEX platform — covering typography, spacing, glassmorphism, bento card refinement, battle arena polish, and global transitions — to match the feel of a Silicon Valley unicorn's landing page. No functional logic (voting, ranking, navigation) is to be changed.

## Done looks like
- Inter (UI) and Montserrat (Headings) fonts are loaded and applied globally, replacing Rajdhani/Space Grotesk.
- All headings have `letter-spacing: -0.02em` and `line-height: 1.5`; padding/margin is scaled up 1.5× for a breathing, premium layout.
- The "NEX" logo uses uppercase, font-weight 900, and a subtle Electric Blue text-shadow glow.
- The hero background is a deep gradient (#050505 → #0A0A0A) with a subtle grainy texture SVG overlay.
- All CTA buttons use glassmorphism: semi-transparent background, frosted border, `backdrop-filter: blur(12px)`, and a neon border glow on hover.
- Creator and chart cards have `border-radius: 24px`, multi-layered box-shadows for depth, and a subtle inner glow.
- Empty/placeholder creator slots display a faint "NEX" SVG watermark instead of a plain dark box.
- The active battle track has a pulsating Neon Blue glow ring animation around its player.
- The 20s preview progress bar is redesigned to 4px height with a glowing animated tip.
- The "VS" divider uses bold italic typography with a CSS glitch effect on hover.
- Primary actions use #00D1FF (Electric Blue); secondary accents use #BD00FF (Neon Violet) throughout.
- Every hover/click interaction uses `transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1)`.
- The Creators bento grid stacks cleanly and spaciously on mobile.

## Out of scope
- Any changes to voting, ranking, matchmaking, or navigation logic.
- Backend or database schema changes.
- New pages or routes.
- Functional audio/video playback changes.

## Tasks
1. **Global fonts, spacing & color tokens** — Update `index.css` and `tailwind.config.ts` to import Inter + Montserrat, apply letter-spacing/line-height globally, update the color palette tokens to Electric Blue (#00D1FF) and Neon Violet (#BD00FF), and add the global `cubic-bezier` transition rule.

2. **Hero section & NEX logo** — In `Home.tsx`, apply the deep gradient + grainy texture overlay to the hero background, style the NEX wordmark with uppercase/900-weight/text-shadow glow, and convert all CTA buttons to glassmorphism style with neon hover glow.

3. **Bento cards & Creators grid** — In `CreatorList.tsx` and any shared card components, apply `border-radius: 24px`, multi-layered shadows, inner glow borders, and replace empty placeholder slots with a faint inline SVG "NEX" watermark. Ensure the grid stacks with premium spacing on mobile.

4. **Battle Arena polish** — In `Battle.tsx`, add a pulsating neon glow keyframe animation around the active track player, redesign the preview progress bar to 4px with a glowing animated tip, and apply the glitch hover effect to the VS typography.

## Relevant files
- `client/src/index.css`
- `tailwind.config.ts`
- `client/src/pages/Home.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/CreatorList.tsx`

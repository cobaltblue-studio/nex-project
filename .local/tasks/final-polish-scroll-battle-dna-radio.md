# Final Polish: Scroll, Battle VH, AI DNA & Radio

## What & Why
Four targeted UI refinements to sharpen the NEX platform's premium feel:
- Upgrade the Home hero scroll indicator to a more prominent animated "DISCOVER MORE" call-to-action.
- Fix the Battle page so all critical elements (VS logo, track info, Vote buttons) are visible on a 1080p screen with no scrolling required.
- Add an "AI DNA" glowing icon + hover popup to every Music and Music Video chart row.
- Make the Radio page's START RADIO button the true vertical/horizontal focal point of the viewport.

## Done looks like
- **Home**: At the bottom of the hero, a floating animated "DISCOVER MORE" label with a ChevronDown icon fades and slides in. The animation loops in a subtle pulse or bounce to invite scrolling. (The existing simple "Scroll to Discover" + bounce is replaced/upgraded.)
- **Battle**: On a 1080p (1920×1080) monitor, the full battle UI — title, player cards, VS logo, track names, creator names, and both VOTE buttons — fits within one viewport without any scrolling. The title top margin is reduced and the YouTube player is scaled down ~15%.
- **Music & Music Video charts**: Every track row/card has a small glowing `Dna` icon (from `lucide-react`) right next to the song title. On hover, a futuristic semi-transparent popup appears in monospaced font (Courier New / `font-mono`) showing: `MODEL: SUNO V4.2`, `MOOD: CYBERPUNK_SYNTH`, `STAMP: 2026-03-17_NEX`. The popup has a dark background with a neon cyan/green border glow.
- **Radio**: Before the radio starts, the entire pre-start block (icon, title, subtitle, START RADIO button) is vertically centered in the full viewport height, not just within its internal padding.

## Out of scope
- Changing any backend data or schema.
- Adding real AI model data to the database (all DNA popup values are static/cosmetic for now).
- Any changes to the Battle voting logic, timer, or matchmaking.

## Tasks
1. **Home scroll indicator upgrade** — Replace or enhance the existing "Scroll to Discover" + `animate-bounce` chevron at the bottom of the hero section in `Home.tsx` with a more prominent "DISCOVER MORE" label and a Framer Motion `fade & slide` looping animation.

2. **Battle page viewport fix** — In `Battle.tsx`, reduce the top/outer margins on the "GLOBAL AI MUSIC BATTLE" title area and tighten the stats panel spacing. In the YouTube player container inside `BattleTrackPlayer`, reduce the `aspect-video` / padding-based sizing by ~15% (e.g., wrapping with a scaled container or reducing max height) so the full vote UI fits in one 1080p viewport.

3. **AI DNA icon + hover popup** — In `Music.tsx` and `MusicVideo.tsx`, add a small glowing `Dna` icon from `lucide-react` immediately next to each track's title. Implement a hover-activated tooltip/popup with a dark glass background, neon border, and monospaced font displaying the three static AI DNA fields. Use Tailwind `group`/`group-hover` or a small inline state to trigger the popup visibility.

4. **Radio viewport centering** — In `Radio.tsx`, change the pre-start container so it fills `min-h-screen` (or uses `h-screen`) and centers its content with `flex items-center justify-center`, ensuring the START RADIO button is the absolute focal point of the full viewport on any screen size.

## Relevant files
- `client/src/pages/Home.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/MusicVideo.tsx`
- `client/src/pages/Radio.tsx`
- `client/src/components/YoutubePlayer.tsx`

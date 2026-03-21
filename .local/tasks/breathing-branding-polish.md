# NEX "Breathing" Branding & Critical Polish

## What & Why
Apply the final "Alive" branding pass to NEX 2.0: fix the broken Submit Track route, add a breathing animation to the NEX hero logo, refine the home chart visualization, and ensure neon green glow consistency + CTA hover pulses across all pages.

## Done looks like
- Clicking "Submit Track" (hero button and nav) navigates to a fully working form with Title, Creator, Genre, Track Link, and Originality Checkbox — no black screen
- The "SUBMIT YOUR AI TRACK" heading on that page glows with neon green
- The "NEX" hero text on the Home page gently scales and pulses in opacity on a slow ~6–8s loop, like a slow breath
- The Home page live-voting line chart has an ultra-thin 1.5px line (already done), a semi-transparent green gradient area fill (`rgba(0,255,128,0.1)`), and the chart card has `backdrop-filter: blur(12px)`
- All major headings across all pages (Submit, Battle, New, Music, Creators, Rising, Radio, Profile) carry the same neon green glow class
- The three hero CTA buttons (Start Battle, Submit Track, Radio) have a subtle pulse/scale hover effect

## Out of scope
- Any changes to backend routes, database, or data logic
- Redesigning page layouts or adding new pages
- Changes to the battle system or chart ranking logic

## Tasks
1. **Fix /submit route** — Change the `/submit` route in `App.tsx` to load the existing `SubmitTrack` component (currently only reachable at `/submit-track`). Ensure the `SubmitTrack` page heading has the neon green glow class (`neon-text-strong neon-text-green`).

2. **Breathing NEX logo animation** — In `Home.tsx`, add a keyframe CSS animation (or Framer Motion `animate` loop) to the "NEX" text element that slowly oscillates between `scale(1.0)` and `scale(1.03)` and subtly varies the text shadow glow intensity, with a 6–8 second duration and ease-in-out easing.

3. **Chart visual refinement** — In the live voting chart SVG on the Home page, add a gradient area fill path using `rgba(0,255,128,0.1)` below the line, and ensure the chart card wrapper has `backdropFilter: "blur(12px)"` applied via inline style or Tailwind.

4. **Global neon heading audit** — Scan all page components (SubmitTrack, Battle, New, Music, MusicVideo, Creators, Rising, NexRadio, ProfileMe, TrackDetail) and apply `neon-text-strong neon-text-green` (or equivalent) to any primary `h1`/`h2` headings that are missing it.

5. **CTA button hover pulse** — Add a subtle scale/glow pulse hover effect to the three hero CTA buttons on `Home.tsx` (Start Battle, Submit Track, Radio) — a gentle `scale(1.02)` + brightened shadow on hover, using Tailwind hover utilities or Framer Motion `whileHover`.

## Relevant files
- `client/src/App.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/SubmitTrack.tsx`
- `client/src/pages/Submit.tsx`
- `client/src/index.css`
- `client/src/pages/Battle.tsx`

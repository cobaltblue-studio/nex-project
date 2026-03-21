# Neon Glow Titles, MV YouTube Layout & Creators Bento Grid

## What & Why
Three visual refinements to elevate the NEX platform's design consistency and premium feel:
1. Apply a unified green neon glow to all main page titles so every page feels cohesive.
2. Restructure the Music Video chart to a YouTube-feed-style layout with large 16:9 thumbnails.
3. Upgrade the Creators page from a uniform grid to a true Bento Grid with varied card sizes and richer empty-slot visuals.

## Done looks like
- Every main page heading (Home, New, Music, Music Video, Rising, Submit Track, Creators, etc.) has the identical green neon glow (`text-shadow: 0 0 15px rgba(0, 255, 128, 0.7)`) applied consistently via a shared CSS utility class.
- On the Music Video page, each chart row shows a large 16:9 thumbnail on the left (with a play icon overlay) and structured track info (rank, title, creator, streak, Watch button) stacked on the right — both filled slots and empty placeholders follow this layout.
- On the Creators page, the top-ranked creator's card spans two columns. Empty "Future Creator" placeholder slots display a subtle geometric SVG background pattern instead of a plain box. All cards have a smooth 0.4s scale-up hover effect.
- No JavaScript logic is modified — only CSS/Tailwind classes and JSX structure.

## Out of scope
- Changing existing neon effects on the NEX logo or nav elements.
- Adding new pages or routes.
- Any backend or data changes.

## Tasks
1. **Add green neon glow utility & apply to all page titles** — Add a `neon-text-green` utility class to `index.css` with `text-shadow: 0 0 15px rgba(0, 255, 128, 0.7)`. Apply it to the primary `<h1>` or `<h2>` title on every page: Home, New, Music, MusicVideo, Rising, SubmitTrack, CreatorList, and any other pages with a main heading.

2. **Revamp Music Video page to YouTube-style list layout** — Restructure `MusicVideo.tsx` so each chart row (filled and empty) uses a two-column layout: a 16:9 thumbnail container on the left (with a semi-transparent Play icon overlay) and the rank, title, creator name, win streak badge, and Watch button stacked on the right. The thumbnail should be visually prominent — roughly 160-180px wide.

3. **Upgrade Creators page to Bento Grid** — In `CreatorList.tsx`, make the first (top) creator's card span two columns (`col-span-2`). Replace the empty placeholder's plain box with a subtle geometric SVG pattern (e.g., a repeating diagonal line or dot grid watermark). Add `hover:scale-[1.03]` with `transition-all duration-400` to every creator card for the smooth scale-up effect.

## Relevant files
- `client/src/index.css`
- `client/src/pages/Home.tsx`
- `client/src/pages/New.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/MusicVideo.tsx`
- `client/src/pages/Rising.tsx`
- `client/src/pages/SubmitTrack.tsx`
- `client/src/pages/Submit.tsx`
- `client/src/pages/CreatorList.tsx`

# Nav, Creators, MV Chart & YouTube Fix

## What & Why
Five improvements to complete the NEX platform's core navigation and content pages:
1. Fix navigation to match the required menu structure with NEW and CREATORS links.
2. Upgrade the CREATORS page with richer creator stats cards.
3. Build a proper MUSIC Top 100 layout (the existing page already has the structure — polish/confirm it is correct).
4. Build a proper MUSIC VIDEO Top 100 page at `/music-video` (currently that route renders a broken detail page).
5. Fix the YouTube player so it always renders at a strict 16:9 ratio.

## Done looks like
- Desktop and mobile nav shows exactly: HOME · NEW · MUSIC · MUSIC VIDEO · BATTLE · RISING · CREATORS · RADIO · SUBMIT TRACK (in that order).
- A `/new` page exists showing recently added tracks, sorted by newest first.
- A `/creators` page exists (replacing the old `/profile` list) showing creator cards with: avatar/image placeholder, creator name, featured track title, total play count, and battle win rate.
- The MUSIC page (`/music`) displays the NEX TOP 100 track list with all current fields — no changes needed if already correct, otherwise minor polish.
- The MUSIC VIDEO page (`/music-video`) displays a TOP 100 list of tracks that have a music video URL, each row linking to `/mv/:id`. Empty slots shown for ranks with no video yet.
- YouTube embeds in all pages (Battle, Track Detail, Music Video, Radio) maintain a strict 16:9 aspect ratio with no letterboxing or cropping.

## Out of scope
- Creator profile pages beyond the list card view.
- Authentication changes.
- New backend schema changes (use existing fields).

## Tasks
1. **Navigation update** — Update `Layout.tsx` navItems array to add NEW (`/new`) and CREATORS (`/creators`) in the correct order. Import a suitable icon for each. Update mobile bottom nav to match.

2. **NEW page** — Create `client/src/pages/New.tsx`. Fetch tracks from `/api/tracks?sortBy=createdAt&limit=50` (or whatever the API supports for newest-first). Display as a list similar to the Music chart, showing rank, title, creator, and genre. Add the `/new` route in `App.tsx`.

3. **CREATORS page upgrade** — Rewrite `client/src/pages/CreatorList.tsx` to show cards with: creator image (styled avatar with initials), creator name, featured track (title of the creator's highest-ranked track), total play count across all their tracks, and battle win rate. Aggregate this data from the existing `/api/tracks` response (each track already has `creatorName`, `playCount`, `winRate`). Register the page under `/creators` in `App.tsx`.

4. **MUSIC VIDEO Top 100 page** — Create `client/src/pages/MusicVideo.tsx`. Fetch all tracks from the existing API and filter client-side for those with a `musicVideoUrl` (or `mvUrl`) field, sorted by `rankingScore`, filling 100 slots. Each row shows rank, title, creator, and a "Watch" button linking to `/mv/:id`. Register the page under `/music-video` in `App.tsx` (replacing the current `MVDetail` route for that path only — keep `/mv/:id` for the detail view).

5. **YouTube 16:9 fix** — In `YoutubePlayer.tsx`, ensure the outer wrapper div uses `position: relative; width: 100%; padding-top: 56.25%` (the padding-top trick for 16:9) and the inner mounted div is positioned `absolute inset-0`. Remove the `maxWidth: 900px` constraint so the player fills its parent. Check the container elements in `Battle.tsx`, `WorkDetail.tsx`, `MVDetail.tsx`, and `Radio.tsx` to confirm they use `aspect-video` (Tailwind 16:9) or an equivalent, and fix any that do not.

6. **Backend: sort by date** — In `server/routes.ts`, add support for `sortBy=createdAt` to the `/api/tracks` GET handler so the NEW page can fetch newest-first tracks. In `server/storage.ts`, add the `createdAt` sort branch to `getTracks`.

## Relevant files
- `client/src/components/Layout.tsx`
- `client/src/App.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/MVDetail.tsx`
- `client/src/components/YoutubePlayer.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/WorkDetail.tsx`
- `client/src/pages/Radio.tsx`
- `server/routes.ts`
- `server/storage.ts`

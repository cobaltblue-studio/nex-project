# NEX Platform Feature Update

## What & Why
Implement six improvements defined in the NEX platform update document: two new Home page sections (Live Battle Arena and improved Trending Today), enhanced Chart Methodology page content, a 20-second battle audio preview system, a full playback fix for chart tracks, country display on creator profiles and the creator list, and chart ranking zone labels (Legend / Elite / Rising).

## Done looks like
- Home page shows a "Live Battle Arena" section with active battle matchups and a "Vote Now" button linking to `/battle`
- Home page "Trending Today" section ranks tracks by recent battle wins, play count, and vote activity (not just raw votes)
- Chart Methodology page contains the full description and factors from the spec (battle win rate, total votes, track play count, recent activity boost) plus the "Only the strongest tracks rise" closing line
- Battle page plays Track A first for up to 20 seconds (starting from the mid-highlight of the track), then automatically plays Track B for up to 20 seconds; no seeking or skipping is allowed
- Chart page and track detail pages use full playback (no 20-second restriction)
- Creator country is visible under creator names in the Creator List page
- Country is editable in the ProfileMe page (if no edit form exists, add one or hook into the existing onboarding-style flow)
- The Music/Chart page displays zone labels: #1–10 "Legend Zone", #11–50 "Elite Zone", #51–100 "Rising Zone"

## Out of scope
- Top Countries / regional rankings page (future)
- Chart expansion to Top 200 / Discovery Zone (future)
- Any changes to the battle matchmaking or promotion logic

## Tasks
1. **Home: Live Battle Arena section** — Add a new section below the hero on the Home page showing active battle matchups (two track titles with "VS" between them). Fetch a recent or currently active battle from the backend. Link the "Vote Now" CTA to `/battle`. If no live battles exist, show a fallback prompt to start one.

2. **Home: Trending Today ranking fix** — Update the Trending Today section to sort tracks by a composite of recent battle wins, play count, and vote count — matching the platform's ranking score logic — rather than sorting by votes alone. Add a short label explaining the ranking basis.

3. **Chart Methodology page enhancement** — Expand the existing page content to include all four ranking factors with brief descriptions, add the "Only the strongest tracks rise through the system and reach the official NEX charts" closing line, and generally improve the visual presentation to match the spec.

4. **Battle audio: 20-second highlight preview** — Rework the Battle page audio playback so that Track A begins playing from the mid-point of the track (approximated as 50% of duration or a fixed offset for YouTube) and stops after 20 seconds, then Track B plays automatically in the same way. For YouTube embeds, use the `start`/`end` URL parameters. For direct audio URLs, use an HTML `<audio>` element with `currentTime` set to mid-point and a 20-second auto-stop timer. Disable all seeking controls on the battle player.

5. **Chart track full playback fix** — Ensure the Music chart page, WorkDetail/TrackDetail pages, and MV detail pages use unrestricted full playback (remove any 20-second preview logic that may affect them, and confirm they pass no time-limiting parameters to the player).

6. **Creator country display and editability** — Display the `country` field under creator names/handles in the Creator List page. Add an editable country field to the ProfileMe page (the profile management screen) so creators can update their country after initial onboarding.

7. **Chart zone labels** — Add visual zone labels to the Music chart page: a "Legend Zone" header before rank #1, an "Elite Zone" header before rank #11, and a "Rising Zone" header before rank #51. Style each label distinctly (e.g., gold / silver / green accent color).

## Relevant files
- `client/src/pages/Home.tsx`
- `client/src/pages/Battle.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/ChartMethodology.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/ProfileMe.tsx`
- `client/src/pages/WorkDetail.tsx`
- `client/src/pages/MVDetail.tsx`
- `server/routes.ts`
- `server/storage.ts`
- `shared/schema.ts`

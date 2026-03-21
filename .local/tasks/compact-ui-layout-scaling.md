# Compact UI & Layout Scaling Update

## What & Why
Fix viewport overflow issues and refine layout across Battle, Home, Creators, New, Music, and Video pages. The Battle page must become fully scroll-free (100vh). Other pages need proportional size adjustments to improve density and visual hierarchy.

## Done looks like
- **Battle:** Daily limit is 5. Counter reads "Battle X / 5 today". The YouTube player, VS logo, vote buttons, and battle result stats all fit on one screen with no scrolling needed.
- **Home:** The "LIVE VOTING TRENDS" graph is visibly smaller (~40% reduction). The "DISCOVER MORE" scroll indicator is always visible at the bottom of the hero section, above or overlapping the graph, and is not hidden behind it.
- **Creators:** Exactly the top 2 creator cards span `col-span-2 row-span-2` as large featured tiles. All remaining cards are standard 1×1.
- **AI DNA badge:** Every track card across New, Music, and Video pages shows a glowing `[AI_DNA]` badge. The hover tooltip consistently reads `[MODEL: NEX_LYRIA] [SEED: 7721] [STYLE: AI_SOUL]` across all pages.

## Out of scope
- Changes to battle matchmaking logic or vote scoring
- Any changes to authentication or routing
- Adding new pages or navigation items

## Tasks
1. **Battle limit → 5:** Change `dailyMax` from 3 to 5 in the `/api/battles/daily-count` route. Update any hardcoded `3` references in the Battle page UI (counter text, limit-reached message).

2. **Battle compact viewport:** Cap the YoutubePlayer wrapper in Battle.tsx at `max-height: 40vh`. Reduce vertical margins/padding between all battle section elements (player → VS header → vote buttons → result stats) by ~50% so the full sequence fits in 100vh without scrolling. Set the outer battle container to `height: 100vh; overflow: hidden` (or equivalent).

3. **Home graph size & scroll indicator:** Wrap the `<LiveVotingWidget />` in a container that scales it down by 40% (use `transform: scale(0.6)` with matching `transform-origin` and negative margin compensation, or reduce explicit heights inside the widget). Ensure the "DISCOVER MORE" scroll indicator is positioned with `position: fixed` or `position: absolute; bottom: 20px; z-index: 200` so it is always visible and not covered by the graph.

4. **Creators bento grid:** Change `isFeatured = idx < 3` to `idx < 2` so only the top 2 cards are featured. Update the featured card className to always use `col-span-2 row-span-2` (remove the `sm:` responsive prefix for consistent large-tile behavior). Ensure the grid column count supports the 2-wide spans without breaking on smaller screens.

5. **AI DNA badge standardization (New page + tooltip consistency):** Add the `[AI_DNA]` glowing badge to the inline track rows in New.tsx. Update the tooltip metadata in WorkCard.tsx, MVCard.tsx, MusicRow.tsx, and MusicVideo.tsx to consistently read `[MODEL: NEX_LYRIA] [SEED: 7721] [STYLE: AI_SOUL]` (replacing any variant values).

## Relevant files
- `server/routes.ts`
- `client/src/pages/Battle.tsx`
- `client/src/components/YoutubePlayer.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/New.tsx`
- `client/src/components/WorkCard.tsx`
- `client/src/components/MVCard.tsx`
- `client/src/components/MusicRow.tsx`
- `client/src/pages/MusicVideo.tsx`

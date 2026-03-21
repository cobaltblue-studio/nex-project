# Battle Streak System

## What & Why
Add a `winStreak` counter to each track that increments when it wins a battle and resets to 0 when it loses. Display the streak as "🔥 WIN STREAK: N" in track cards, chart lists, and the battle result screen to gamify the platform and encourage repeated battles.

## Done looks like
- Each track stores a current win streak count in the database
- After a battle vote, the winner's streak goes up by 1 and the loser's streak resets to 0
- "🔥 WIN STREAK: N" appears on track cards (MusicRow, WorkCard, MVCard) when streak > 0
- "🔥 WIN STREAK: N" appears in the Music chart list and MusicVideo chart list rows when streak > 0
- "🔥 WIN STREAK: N" appears on both track panels in the Battle result screen when streak > 0

## Out of scope
- All-time best streak (historical high water mark)
- Streak-based rewards or badges
- Notifications when a streak is broken

## Tasks
1. **Schema update** — Add a `winStreak` integer column (default 0, not null) to the `tracks` table in `shared/schema.ts` and push the migration.

2. **Storage logic** — In `recordBattleVote` inside `server/storage.ts`, after determining the winner and loser of a battle, increment the winner's `winStreak` by 1 and reset the loser's `winStreak` to 0. Return both tracks' updated streak values in the response.

3. **Display streak on track cards** — Add the streak badge ("🔥 WIN STREAK: N", hidden when 0) to `MusicRow`, `WorkCard`, and `MVCard` components using the `winStreak` field already present on the `Track` type.

4. **Display streak in chart lists** — Add the streak badge to each row in `Music.tsx` (NEX TOP 100) and `MusicVideo.tsx` (MV TOP 100).

5. **Display streak on battle result** — In `Battle.tsx` phase "result", surface the updated win streak for both Track A and Track B panels. Ensure the streak values returned by the vote API are passed through to the result display.

## Relevant files
- `shared/schema.ts`
- `server/storage.ts`
- `client/src/components/MusicRow.tsx`
- `client/src/components/WorkCard.tsx`
- `client/src/components/MVCard.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/MusicVideo.tsx`
- `client/src/pages/Battle.tsx`

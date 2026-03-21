# Battle Matchmaking Pools

## What & Why
Replace the current fully-random battle matchmaking with a pool-aware system. Eligible tracks are classified into three pools — NEW, RISING, and CHART — and battles are drawn from these pools using smart random selection with fair distribution across all three.

## Done looks like
- Every battle is made up of two tracks from the **same genre** category (same behaviour as today for genre matching and fallback).
- Tracks are classified into exactly one pool before selection:
  - **NEW** — tracks in `BATTLE_POOL` status (approved by admin, not yet graduated).
  - **RISING** — tracks that meet the existing rising criteria (5+ battles, 60%+ win rate, not in the top-100 chart) regardless of their DB status.
  - **CHART** — tracks with `CHART` or `PUBLISHED` status that are not already classified as RISING.
- Pool selection is fair: each battle round picks a pool randomly with equal probability (~33% each). If the chosen pool has fewer than 2 genre-matching tracks, the next pool is tried in round-robin order until one succeeds; last resort falls back to the full eligible pool (existing fallback behaviour).
- Within the chosen pool, track selection is **smart random**: tracks are weighted by their `rankingScore` so higher-ranked tracks have a proportionally higher chance of being chosen, but lower-ranked tracks still have a chance.
- The voting UI, battle result screen, and all other existing behaviour remain unchanged.

## Out of scope
- Changes to any frontend component or page.
- Changes to battle voting, win/loss logic, or the chart promotion pipeline.
- Adding new DB columns or schema migrations.
- Admin tools or pool visibility in the UI.

## Tasks
1. **Classify eligible tracks into pools** — Inside `createBattle`, after fetching the genre-filtered eligible pool, classify each track as NEW, RISING, or CHART using the same criteria as `getRisingTracks` (re-use or extract the battle-stats lookup). Tracks should fall into at most one pool (RISING takes precedence over CHART; NEW covers BATTLE_POOL status).

2. **Pool-aware selection with fair distribution** — Randomly choose a starting pool (0, 1, or 2) using `Math.floor(Math.random() * 3)`, then attempt to pick two tracks from that pool for the requested genre. If the pool yields fewer than 2 genre-matching tracks, rotate to the next pool. If all three pools fail, fall back to the full genre-filtered eligible set (existing behaviour).

3. **Smart random (weighted by rankingScore) within a pool** — Replace the shuffle-and-take-first-two approach with a weighted random sampler. Assign each track a weight equal to `Math.max(1, track.rankingScore)`, compute cumulative weights, then pick two distinct tracks using a weighted draw. Apply this sampler both inside pool-based selection and in the final fallback.

## Relevant files
- `server/storage.ts:234-270`
- `server/storage.ts:272-320`

# Week 5 Extension — Friday Clash Night B + C (pool + rules)

**Date:** 2026-09-19  
**Parent:** `docs/superpowers/plans/2026-09-19-nex-arena-week5-friday-clash.md`  
**Founder decision:** Friday Clash Night = **B + C mix** (not visual-only)  
**Status:** LOCAL IMPLEMENTED — 2026-09-19 (스모크·커밋·push는 대표 지시 대기)

---

## WHY

Violet night frame alone is not enough. When Clash Night is active, Arena must **feel different in matchmaking and scoring** — exciting opponents (B) and a clear Friday win reward (C).

---

## Activation (server B/C)

| Source | Effect |
|---|---|
| KST Friday (`Asia/Seoul`) | Server `active: true` → B + C |
| `CLASH_NIGHT_FORCE=1` | Server always on → B + C (**권장 로컬 스모크**) |
| `CLASH_NIGHT_DISABLED=1` | Server always off |
| Client `?clashNight=1` | **UI only** unless request also sends preview flag |
| Body `clashNightPreview: true` or header `x-clash-night-preview: 1` | Honored **only** when `NODE_ENV !== "production"` **or** `CLASH_NIGHT_ALLOW_PREVIEW=1` |

Client preview (`?clashNight=1`) already paints Violet chrome. For B/C without waiting for Friday, either:

1. Restart server with `CLASH_NIGHT_FORCE=1`, **or**
2. Keep `?clashNight=1` — Battle POSTs send `clashNightPreview: true` (non-prod only).

---

## B — Friday pool (matchmaking weights)

When Clash Night is active, `createBattle` multiplies each candidate’s selection weight by an **excitement multiplier** (stacks with existing boost + fairness rotation).

### Formula (Founder-adjustable — `server/clashNight.ts` → `CLASH_NIGHT_POOL`)

```
excitementMul = 1
if winStreak >= streakMin (2):  excitementMul *= streakMul (2.25)
if createdAt within recentDays (7): excitementMul *= recentMul (2.0)
excitementMul *= 1 + min(activityCap (1.0), log1p(playCount) / activityDiv (10))
```

Final pick weight ≈ `max(ε, rankingScore × fairnessMul × excitementMul)`.

| Signal | Field | Default |
|---|---|---|
| Win streak | `tracks.winStreak` | ≥2 → **×2.25** |
| Recent / new | `tracks.createdAt` | ≤7d → **×2.0** |
| Activity | `tracks.playCount` | log scale, **cap +1.0** |

No separate ranking volatility column — playCount stands in for momentum/activity.

---

## C — Friday win bonus

When Clash Night is active and the user’s voted track is the battle winner after the vote:

| Rule | Default | Notes |
|---|---|---|
| Flat `rankingScore` bonus | **+25** | Tuned 2026-09-19 for mid-chart (~150–300) feel; was +15 |
| Applied to | Winner track | Immediate SQL bump + process Map so debounce recompute does not wipe it |
| Response fields | `clashNightWinBonus`, `rankingScoreAfterBonus` | Surfaced on vote JSON |
| Constant | `CLASH_NIGHT_WIN_RANKING_BONUS` | Founder-adjustable |

**Streak:** existing winner `winStreak + 1` / loser reset unchanged (B already weights high streaks).

**Persistence note:** Friday bonus accumulator is process-lifetime (`Map`). Survives ranking recompute within the same server process; restart clears the Map (base recompute score remains). DB column persistence = follow-up if Founder wants cross-restart durability.

---

## Client copy (no BTS wording)

When night ON (Violet chrome kept):

- Sub: `급등·연승 가중 매치 · 금요 승 보너스`
- Badges: `급등·연승 가중 매치` · `금요 승 보너스 +25`
- Verdict: `금요 보너스 +{{bonus}}` when `clashNightWinBonus` present

---

## Files

| Path | Role |
|---|---|
| `server/clashNight.ts` | Activation + B/C constants + Friday bonus Map |
| `server/storage.ts` | Pool excitement mul · win bonus on vote |
| `server/routes.ts` | Wire flag into `/battles/new`, vote, `/arena/clash-night` |
| `client/.../FridayClashNightChrome.tsx` | B/C badges |
| `client/.../Battle.tsx` | Preview flag on POST · bonus line on result |
| `client/locales/{ko,en}/translation.json` | Copy |

---

## Local smoke (B + C)

### Path A — server force (권장)

```bash
CLASH_NIGHT_FORCE=1 npm run server
```

1. Open `http://localhost:5001/battle` (Google OAuth — not `127.0.0.1`)
2. Expect Violet frame + badges (server `active`)
3. Start battle → match should lean exciting (streak/recent/active) — check network `POST /api/battles/new` → `clashNight.active: true`
4. Vote winner → response includes `clashNightWinBonus: 25`; Verdict shows 금요 보너스
5. Blind→Intent→Verdict→Share · playback intact

### Path B — client preview + non-prod flag

1. Server **without** force (normal `npm run server`)
2. `http://localhost:5001/battle?clashNight=1`
3. POSTs include `clashNightPreview: true` → non-prod server applies B/C (`reason: preview`)

### Off

- `?clashNight=0` or unset force → no badges / no B/C

---

## Acceptance

- [x] Plan documents exact B weights + C +15
- [x] Server Friday-aware pool pick when active
- [x] Server Friday win bonus + response fields
- [x] Client badges + win bonus copy
- [x] Handoff smoke steps for B+C
- [ ] 대표 로컬 스모크

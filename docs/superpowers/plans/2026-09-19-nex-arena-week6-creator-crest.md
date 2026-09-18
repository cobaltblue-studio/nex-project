# Week 6 Plan — Creator Crest

**Date:** 2026-09-19  
**Spec:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md` (W6 row)  
**Status:** LOCAL DONE — 2026-09-19  
**Goal:** Creator 프로필·차트/디렉터리에 **한눈에 보이는** Creator Crest. 새 스키마 없이 공개 통계로 클라이언트 집계. W1–W5 의식·재생·Friday B+C 불변.

---

## WHY

Arena는 승패가 남는 무대다. Crest는 크리에이터의 **증명(proof)** — resting Violet aura + 달성 시 Teal stamp.  
W4처럼 얇은 tint로 끝나지 않는다. Founder가 스모크에서 **즉시** 보여야 한다.

---

## Aggregation rules (earn logic — SoT)

Client computes from **already-fetched public stats**. No new DB columns.

### Inputs

| Field | Source |
|---|---|
| `battleWins` | Σ track `wins` (profile tracks) or directory `battleWins` |
| `maxWinStreak` | max track `winStreak` (profile / chart track). Directory may omit → treat as 0 |
| `bestChartRank` | best (lowest) official chart position among creator tracks; `null` if none on TOP 100 |

### Tiers (highest unlocked wins)

Unlock if **any** path matches. Evaluate Spark → Contender → Champion → Legend; keep max.

| Tier | id | Unlock (ANY of) |
|------|-----|-----------------|
| *(resting only)* | `null` | no path met — still show **Violet resting aura** |
| Spark | `spark` | `battleWins ≥ 3` **OR** `maxWinStreak ≥ 2` |
| Contender | `contender` | `battleWins ≥ 10` **OR** `maxWinStreak ≥ 5` **OR** `bestChartRank ≤ 50` |
| Champion | `champion` | `battleWins ≥ 25` **OR** `maxWinStreak ≥ 10` **OR** `bestChartRank ≤ 10` |
| Legend | `legend` | `battleWins ≥ 50` **OR** `bestChartRank ≤ 3` |

### Surfaces

| Surface | Mode | Notes |
|---|---|---|
| `/profile/:name` | **full** | Violet aura panel + Teal stamp when tier; optional Ember Share crest CTA |
| `/creators` | **compact** | Capsule next to name — Violet resting / Teal when tier (wins-based) |
| `/music` chart creator row | **compact** | Per-track hint: that track’s wins + streak + chart rank |

### Color (1 lead / moment)

| State | Lead |
|---|---|
| Resting crest | **Violet** |
| Earned stamp | **Teal** |
| Share crest CTA | **Ember** (ShareButtons `arena`) |

---

## Scope (IN)

1. Plan (this file) + earn rules documented first  
2. `creatorCrest.ts` resolver + `CreatorCrest` UI (full + compact)  
3. Wire ProfileMe · CreatorList · Music chart creator line  
4. CSS `.nex-creator-crest-*` + reduced-motion (static meaning kept)  
5. ko/en copy · handoff smoke steps  

## Scope (OUT)

- New schema / server crest API  
- Share v2 heavy OG canvas (light ShareButtons reuse only)  
- W1–W5 ritual / playback / Friday B+C changes  
- NEXI · main push · deletes · payment/login  

---

## Implementation outline

| Path | Action |
|---|---|
| `docs/superpowers/plans/2026-09-19-nex-arena-week6-creator-crest.md` | 본 플랜 |
| `client/src/lib/creatorCrest.ts` | tier resolver |
| `client/src/components/CreatorCrest.tsx` | full + compact |
| `client/src/index.css` | visible Violet/Teal crest utilities |
| `client/src/pages/ProfileMe.tsx` | full crest + share |
| `client/src/pages/CreatorList.tsx` | compact crest |
| `client/src/pages/Music.tsx` | compact on creator name row |
| `client/src/locales/{ko,en}/translation.json` | crest labels |
| `CURRENT_AGENT_HANDOFF.md` | W6 + smoke |

---

## Acceptance

- [x] Profile: Violet resting crest **obvious** (not subtle glow)
- [x] Tier unlock → Teal stamp with tier label (text + color)
- [x] Optional Ember share crest CTA on profile when tier ≥ spark
- [x] Creators directory + chart show compact crest
- [x] Works with/without `CLASH_NIGHT_FORCE=1`
- [x] `prefers-reduced-motion`: static crest, meaning preserved
- [x] W1–W5 untouched
- [ ] 대표 로컬 스모크

---

## Follow-ups

- ~~**W7:** Polish / a11y / Rising copy alignment~~ → **LOCAL DONE** (`docs/superpowers/plans/2026-09-19-nex-arena-week7-polish.md`)  
- Optional later: persist crest on server for share OG  
- Optional later: Music/New title neon-green → triad (out of W7)  

**Playback note:** Crest is DOM/CSS only. No player remount.

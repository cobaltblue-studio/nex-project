# Post-W7 — Music / New Arena triad align

**Date:** 2026-09-19  
**Status:** LOCAL DONE — 2026-09-19  
**Goal:** Music + New에서 네온그린 / cyan-primary hero 잔재를 제거하고 Rising과 같은 정신으로 Arena Wow triad에 맞춘다. **1 lead / surface.** 새 ritual 없음.

---

## WHY

W7에서 Rising은 Ember lead로 한눈에 Arena가 되었다. Music·New는 아직 `neon-text-green` + `text-primary`(레거시 cyan) + `#00FF9C` 존 마커가 남아 라이브러리 차트처럼 보인다. Founder는 미묘한 tint를 놓친다 — 헤더 Ember glow가 보여야 Pass.

---

## Color (1 lead / surface)

| Surface | Lead | Support |
|---|---|---|
| `/music` header · Rising zone · climb cues | **Ember** | Rank digits **Teal** (confirmed place). Elite zone Teal. Legend zone already Ember. |
| `/new` header · fresh/momentum cues | **Ember** | No equal-loud Violet. Loader/search focus Ember. |

No neon green. No cyan-as-primary hero. RankSpike / Crest compact / playback / Battle untouched.

---

## Scope (IN)

1. Plan (this file)
2. `Music.tsx` + `New.tsx` hero accents → Arena tokens
3. Light CSS utilities (Ember eyebrow/title) + zone hex → triad
4. Light KO/EN eyebrow copy (Arena tone, no BTS)
5. `CURRENT_AGENT_HANDOFF.md` next update

## Scope (OUT)

- TrackNewBadge / MusicVideo / site-wide primary recolor
- RankSpike · Crest · Battle · playback changes
- NEXI · commit/push · deletes

---

## Acceptance

- [x] `/music` — Ember eyebrow + title glow; no neon-green title; Rising zone Ember; Elite Teal; ranks Teal
- [x] `/new` — same Ember header spirit
- [x] RankSpike / Crest compact / play modal untouched in logic
- [ ] 대표 로컬 스모크

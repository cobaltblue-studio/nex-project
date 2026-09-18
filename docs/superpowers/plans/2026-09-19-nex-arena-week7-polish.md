# Week 7 Plan — Polish / a11y / Rising alignment

**Date:** 2026-09-19  
**Spec:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md` (W7+ row)  
**Status:** LOCAL DONE — 2026-09-19  
**Goal:** Ratio-only polish. Rising을 Arena 톤에 한눈에 정렬. a11y(reduced-motion · aria) 보강. W1–W6 의식·재생·Friday B+C·Crest 불변. **새 ritual 없음.**

---

## WHY

W1–W6으로 의식·밤·증명 레이어는 올라왔다. W7은 **같은 무대처럼 보이게** 맞추는 주.  
Founder는 미묘한 tint를 놓친다 — Rising 헤더가 라이브러리 차트처럼 보이면 Fail. Ember 리드 한 점 + Arena 카피로 즉시 정렬.

---

## Color (1 lead / surface)

| Surface | Lead | Notes |
|---|---|---|
| `/rising` header · CTA · accent | **Ember** | Climb / spike family (stem). No equal-loud Teal+Violet |
| Crest / Clash Night | unchanged | Violet / Teal earn / Ember share — W5–W6 SoT |

80/20 ink 유지. 무지개·네온 그린 타이틀 글로우 퇴장(Rising만).

---

## Scope (IN)

1. Plan (this file)  
2. Rising page: Ember lead accents · Arena eyebrow/copy · Battle CTA Arena tone  
3. a11y: reduced-motion for pulse / clash glow / crest (verify + gaps) · aria on Crest compact + Clash banner if missing  
4. Light KO/EN copy consistency (Rising · Crest tiers · Clash night gaps only)  
5. `CURRENT_AGENT_HANDOFF.md` — W7 done; W1–W7 local complete  

## Scope (OUT)

- New ritual / schema / server feature  
- Full-site recolor of Music/New/Creators titles  
- W1–W6 ritual / playback / Friday B+C / Crest earn logic changes  
- NEXI · main push · deletes · payment/login  

---

## Implementation outline

| Path | Action |
|---|---|
| `docs/superpowers/plans/2026-09-19-nex-arena-week7-polish.md` | 본 플랜 |
| `client/src/pages/Rising.tsx` | Ember lead UI + Arena copy keys |
| `client/src/index.css` | `.nex-rising-*` utilities + reduced-motion gaps |
| `client/src/components/CreatorCrest.tsx` | compact `aria-label` |
| `client/src/components/FridayClashNightChrome.tsx` | aria/status verify |
| `client/src/locales/{ko,en}/translation.json` | Rising + light Crest/Clash consistency |
| `CURRENT_AGENT_HANDOFF.md` | W7 + smoke |

---

## Acceptance

- [x] Rising: Ember lead **obvious** at a glance (eyebrow + title glow + CTA) — not primary-cyan / neon-green library look  
- [x] Copy KO/EN Arena climb tone (no BTS)  
- [x] `prefers-reduced-motion`: pulse / clash frame / crest aura / Rising empty pulse static; meaning kept  
- [x] Crest compact + Clash night banner have accessible names  
- [x] W1–W6 untouched (rituals, Friday B+C, Crest earn, playback)  
- [ ] 대표 로컬 스모크  

---

## Follow-ups

- Optional later: Music/New page title neon-green → triad (out of W7 minimal scope)  
- Production: commit/push when Founder says  

**Playback note:** DOM/CSS/copy only. No player remount.

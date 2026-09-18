# Week 4 Plan — Arena Pulse + Home Arena glow

**Date:** 2026-09-19  
**Spec:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md` (W4 row)  
**Status:** LOCAL DONE — 2026-09-19 (스모크·커밋·push는 대표 지시 대기)  
**Goal:** Home에 ink glow 한 겹 + Arena Pulse(live feel). W1–W3 Battle 의식 불변. 전면 네온 금지.

---

## Scope (IN)

1. **Home Arena glow** — hero에 soft ink/radial 한 레이어만 (`#1A2036` 계열). 전 사이트 배경·네온 아님.
2. **Arena Pulse** — 기존 Home `LiveVotingWidget` 연장. **Lead = Ember live dot** (Teal ticker 미채택 — 표면당 1 lead).
3. **데이터** — 기존 `GET /api/stats/today` (Home 이미 사용). `refetchInterval`로 가벼운 live 갱신.
4. **Battle stats strip (optional)** — 동일 Ember live dot만 얇게 공유. 플레이어 remount/pause 없음.
5. **a11y** — `prefers-reduced-motion`: pulse 애니 off, LIVE 배지·수치는 정적 유지.

## Scope (OUT)

- Teal ticker (W4에서 Ember와 동시 사용 금지)  
- Friday Clash Night (W5), Crest, Share v2  
- W1–W3 재작업, NEXI/Higgsfield  
- main push / production / 파일 삭제  
- 결제·재생 경로 변경

---

## Lead pick (Founder-facing)

| Surface | Lead | Why |
|---|---|---|
| Home hero glow | Ink (무색 무대빛) | “한 점의 빛” — triad 아님 |
| Home live-voting card | **Ember** live dot | 기존 LIVE 배지 자연 승격; Crest/Action |
| Battle today-stats | Ember live dot only | Home과 동일 신호, 대시보드 신설 없음 |

---

## Implementation outline

| Path | Action |
|---|---|
| `docs/superpowers/plans/2026-09-19-nex-arena-week4-arena-pulse.md` | 본 플랜 |
| `client/src/index.css` | `.nex-home-arena-glow` · `.nex-arena-pulse-dot` · reduced-motion |
| `client/src/pages/Home.tsx` | hero glow layer · LiveVotingWidget Ember pulse · stats refetch |
| `client/src/pages/Battle.tsx` | stats strip Ember live badge (minimal) |
| `client/src/locales/{ko,en}/translation.json` | pulse aria / 짧은 LIVE 카피만 필요 시 |
| `CURRENT_AGENT_HANDOFF.md` | W4 상태 + 스모크 |

---

## Acceptance

- [x] Home hero: ink radial 1 layer visible; not full-site neon
- [x] Live-voting card: Ember LIVE pulse (not red/green dual-lead)
- [x] Stats from `/api/stats/today`; soft refetch
- [x] Battle sequence / players untouched
- [x] `prefers-reduced-motion`: static Ember badge
- [ ] 대표 로컬 스모크 (`http://localhost:5001/`)

---

## Follow-ups (not W4)

- **W5:** Friday Clash Night (Violet night frame)  
- Pulse 계측 / Teal ticker A/B (표면 분리 시에만)  
- Crest (W6)

**Playback note:** Pulse/glow는 DOM·CSS only. 오디오/비디오 게이트 금지.

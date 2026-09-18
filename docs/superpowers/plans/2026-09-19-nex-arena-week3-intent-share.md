# Week 3 Plan — Intent Duel + Share Card v1

**Date:** 2026-09-19  
**Spec:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md` (W3 row)  
**Status:** LOCAL DONE — 2026-09-19 (스모크·커밋은 대표 지시 대기)  
**Goal:** Blind→Verdict 시퀀스 위에 Intent(Violet) + Share(Ember CTA / navy+Teal bar) 한 겹. W1/W2 의식 유지. Motion은 ritual→share handoff만.

---

## Scope (IN)

1. **Intent Duel (light)** — 투표 직전 Violet clash-call 칩 행. 의미: “왜 이쪽에 걸었는지” (훅 / 분위기 / 보이스·톤 / 완성도). 선택 시 Teal 체크. 결과·공유 프리뷰에 동일 라벨 표시.
2. **Share Card v1** — 결과 화면 navy 프리뷰 카드 + Teal accent bar + Ember lead Share CTA. 기존 `ShareButtons` / `trackShareUrl` 연장. 1탭 native share·copy·X 유지. 모바일 우선.
3. **Motion handoff** — Verdict 닫힌 뒤 share 카드만 짧은 fade/rise (`nex-share-handoff-anim`). 전앱 모션 언어 통일은 OUT.
4. **Tokens / i18n** — clash/verdict/arena 유틸 재사용. ko/en 카피. BTS/ARMY 금지.

## Scope (OUT)

- Arena Pulse, Friday Clash, Crest, Share v2 (캔버스 OG 서버)  
- Intent 서버 API / DB  
- W1/W2 재작업, NEXI·Higgsfield  
- main push / production / 파일 삭제  
- 재생 경로 remount·pause

---

## Heuristic (Reality)

**Intent 백엔드 없음.**  
클라이언트만:

| Key | Role |
|---|---|
| React state `clashIntent` | 현재 배틀 칩 선택 (투표 전 필수 아님 — 미선택도 투표 가능) |
| `localStorage` `nex.battle.lastIntent` | 다음 배틀에서 같은 칩을 soft-preselect (UX 연속성) |
| Result / Share preview | 선택값이 있으면 Violet→Teal 확정 칩으로 표시 |

풀 듀얼 UX(양쪽 의도 대결·실시간 집계)는 W3에 과도 → **칩 행 + 결과 반영**으로 선적. 집계·서버 persist는 후속.

**Share:** 기존 `BattleStoryCardButton` + canvas PNG는 레포에 있으나 Battle에 미연결. W3는 **인페이지 프리뷰 + ShareButtons**를 주 경로로 둔다. PNG 스토리 저장은 선택 secondary로 프리뷰 하단에 얇게 연결 가능(동일 결과 데이터). 병렬 공유 시스템 신설 금지.

**Color sequence (한 판):** Blind Violet → Intent Violet chips → Verdict Teal → Share Ember CTA (카드 본체는 navy + Teal bar).

---

## Implementation outline

| Path | Action |
|---|---|
| `docs/superpowers/plans/2026-09-19-nex-arena-week3-intent-share.md` | 본 플랜 |
| `client/src/components/IntentDuelChips.tsx` | Violet 칩 + Teal confirm |
| `client/src/components/ArenaShareCard.tsx` | navy+Teal bar 프리뷰 · ShareButtons · handoff |
| `client/src/components/ShareButtons.tsx` | `variant="arena"` Ember lead |
| `client/src/pages/Battle.tsx` | vote stage chips · result share card · reset on next |
| `client/src/index.css` | chip / share-card / handoff + reduced-motion |
| `client/src/locales/{ko,en}/translation.json` | intent + share 카피 |
| `CURRENT_AGENT_HANDOFF.md` | W3 상태 + 스모크 |

---

## Acceptance

- [x] Vote-ready: Violet intent chips visible; pick shows Teal check; optional (미선택 투표 OK)
- [x] Result: selected intent label visible; Share card navy + Teal bar; Ember Share CTA
- [x] One-tap share path unchanged (native / copy / X)
- [x] Blind → Verdict → Share lead colors do not collide in one moment
- [x] Rituals do not remount/pause players
- [x] `prefers-reduced-motion`: static chips / instant share appear
- [ ] 대표 로컬 스모크 (`http://localhost:5001/battle`)

---

## Follow-ups (not W3)

- **W4:** Arena Pulse (Ember live dot *or* Teal ticker — pick one)  
- Intent server aggregate / duel heat  
- Share Card v2 / OG image pipeline  
- Friday Clash Night (W5), Creator Crest (W6)

**Playback note:** Share/Intent are DOM-only. Do not gate audio/video on intent or share state.

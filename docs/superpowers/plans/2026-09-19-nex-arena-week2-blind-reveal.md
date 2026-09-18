# Week 2 Plan — Typographic Hierarchy + Blind Reveal

**Date:** 2026-09-19  
**Spec:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md` (W2 row)  
**Status:** LOCAL DONE — 2026-09-19 (스모크·커밋은 대표 지시 대기)  
**Goal:** Battle 헤더 타이포 한 겹 + 기존 Blind 토글을 Violet veil / Reveal 의식으로 확장. W1 Verdict·Spike·Ember CTA 유지.

---

## Scope (IN)

1. **Typographic hierarchy (Battle only)** — ARENA / BATTLE ARENA Montserrat display: weight · size · letter-spacing 명확화. ink-first (네온 그린 히어로 글로우 제거). Inter 스왑·전앱 리디자인 없음.
2. **Blind Reveal** — 기존 `blindMode` / `isRevealed` / `BattleBlindCard` 연장.
   - Blind ON + 미공개: Violet lead veil (커버·플레이어 장막, 카피 “장막 뒤…” 수준)
   - 투표로 장막이 걷힐 때: Violet→clear reveal ≤800ms → 이어서 W1 `ClashVerdictRitual` (Teal)
   - Ember = 기존 Next Battle CTA만 (Share W3 out)
3. **Tokens / utilities** — `--nex-wow-violet` / `.text-clash` / veil CSS. `--primary` 전역 교체 없음.

## Scope (OUT)

- Intent Duel, Share Cards, Arena Pulse, Friday Clash, Crest  
- W1 재작업 / NEXI·Higgsfield  
- main push / production / 파일 삭제  
- 서버 blind 데이터 모델 신설 (없으면 토글 휴리스틱만)

---

## Heuristic (Reality)

서버에 별도 blind 플래그 API 없음.  
**클라이언트 `nex.battle.blindMode` localStorage + 투표 시 `setIsRevealed(true)`** 가 단일 의미.

- Reveal 트리거 = 투표 확정 순간 (기존 의미와 동일). 토글 Off만으로는 full-screen ritual 없음.
- 재생: reveal/verdict 포털은 visual-only. iframe/audio remount·pause 금지.

---

## Implementation outline

| Path | Action |
|---|---|
| `client/src/index.css` | `.text-clash` / veil / reveal anim + reduced-motion |
| `client/src/components/BlindRevealRitual.tsx` | New — Violet flash ≤800ms, skip 가능 |
| `client/src/pages/Battle.tsx` | Veil lead · vote → reveal then verdict · header typo |
| `client/src/locales/{ko,en}/translation.json` | `blindVeil` / reveal aria 카피 |
| `CURRENT_AGENT_HANDOFF.md` | W2 상태 |

---

## Acceptance

- [x] Blind ON: Violet lead on identity veil (covers + player shroud)
- [x] Vote while blind: reveal ≤800ms then Teal verdict (no painful double full ritual)
- [x] `prefers-reduced-motion`: static veil / instant reveal; meaning kept
- [x] Battle headers: clearer Montserrat hierarchy, ink-first
- [x] Playback path untouched (no player remount in ritual)
- [ ] 대표 로컬 스모크 (`http://localhost:5001/battle`)

---

**Playback note:** Rituals portal to `document.body` only. Do not gate audio/video on reveal state beyond existing title/cover masking.

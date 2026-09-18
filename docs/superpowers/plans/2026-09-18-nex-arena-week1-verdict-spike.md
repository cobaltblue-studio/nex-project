# Week 1 Plan — Yurika Tokens + Clash Verdict + Rank Spike

**Date:** 2026-09-18  
**Spec:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md`  
**Status:** LOCAL DONE — 2026-09-19 (스모크·커밋은 대표 지시 대기)  
**Goal:** Yurika triad의 첫 겹(Teal+Ember) + 판정 의식 + 급등 배지. 레이아웃 전면 개편 없음. Violet은 토큰만 예비.

---

## Scope (IN)

1. **Design tokens** — Teal `#1BC4CC` / Violet `#8A5AF2` / Ember `#FE9135` + ink neutrals  
   - CTA / Spike → Ember  
   - Verdict stamp → Teal  
   - Violet → CSS only (no UI lead yet)
2. **Clash Verdict Ritual** — 투표 확정 직후 ≤1.5s Teal 판결 오버레이 (스킵 가능)
3. **Rank Spike** — 차트 급등 행 Ember 배지 (+ 짧은 모션). 데이터 없으면 mock/heuristic 명시 또는 W1.5로 이관
4. **(권고) Logo pairing** — Founder가 `logo-explorations` A/B/C를 골랐으면 W1에 파비콘·헤더 마크만 후보로 묶음. **미선택 시 로고 스왑 금지**, 토큰만.

## Scope (OUT)

- Blind Reveal, Intent Duel, Share, Pulse, Friday Clash, Crest UI  
- Violet as lead accent on screens  
- 전 페이지 리디자인 / `--primary` 전역 교체  
- 로고 방향 미선택 상태에서의 앱 전면 마크 교체  
- NEXI / Higgsfield · main push / production  

---

## Implementation outline

### Task 1 — Tokens
- `client/src/index.css`: `--nex-wow-teal|violet|ember`, ink scale, `--nex-cta-primary` → ember, `--nex-verdict-accent` → teal
- `tailwind.config.ts`: `arena` / `clash` / `verdict` extend (don’t overwrite `primary`)
- `button.tsx`: `variant: "arena"` (Ember fill + ink text)

### Task 2 — Clash Verdict Ritual
- `ClashVerdictRitual.tsx` portal to `document.body`
- Hook: Battle vote success → open once; Teal stamp; Ember winner flash ≤300ms optional
- `prefers-reduced-motion` → static stamp → quick `onDone`
- Do not pause/remount Suno/YouTube players

### Task 3 — Rank Spike
- `RankSpike.tsx`: show if `delta >= threshold` (default 5) else null
- Mount on chart rows (`Music.tsx`); replace hardcoded gold if present
- If no rank-delta API: document heuristic or ship badge behind fixture only

### Task 4 — Verify
- Vote → ritual once; Spike on qualifying row  
- Playback regression: Work Detail / Battle  
- Screenshots for Founder  

---

## Acceptance

- [x] Ember on ≥1 primary CTA; Teal on verdict stamp  
- [x] Vote → Verdict ritual (or skip) without breaking battle *(코드 연결 완료 — 로컬 스모크 대기)*  
- [x] Rank Spike on qualifying rows *(sessionStorage prev-rank heuristic; 2회째 차트 방문부터 Δ≥5)*  
- [x] Violet not used as lead UI color yet *(토큰만)*  
- [ ] No playback regressions *(대표 스모크)*  
- [x] Logo: B1 Strong Spark 로컬 헤더/파비콘  

---

**Week 1 go received 2026-09-19. Production push still gated.**

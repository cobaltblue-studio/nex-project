# Week 5 Plan — Friday Clash Night (Violet night frame)

**Date:** 2026-09-19  
**Spec:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md` (W5 row)  
**Status:** LOCAL DONE — 2026-09-19 UI; **B+C extension** → `2026-09-19-nex-arena-week5-friday-clash-pool-rules.md`  
**Goal:** Battle에 **한눈에 보이는** Violet 밤 프레임 + 이벤트 라벨. W1–W4 의식·재생 불변. OFF면 기존 Battle과 동일.

---

## WHY (Founder note)

W4 글로우/펄스는 “뭐가 바뀐지 모르겠다” 수준이었다.  
W5는 **켜졌을 때 극적으로 달라 보여야** 한다 — 얇은 tint가 아니라 **Violet night chrome/frame**.

---

## Scope (IN)

1. **Friday Clash Night UI (Battle)** — 두꺼운 Violet 테두리·코너 비네트·상단 이벤트 배너 (`FRIDAY CLASH` / `금요일 클래시`). 팬덤(BTS/ARMY) 카피 금지.
2. **Ember enter CTA** — 밤 모드 ON일 때 Start / Continue 계열 CTA를 Ember arena 스타일로 (Verdict 내부 Teal 유지).
3. **Activation** — product TZ = **Asia/Seoul (KST)** 금요일 서버 시계 **또는** feature/env force.  
   **Founder preview (any day):**
   - URL `?clashNight=1` (페이지 로드 시 `localStorage nex.clashNight.preview=1` 동기화)
   - `?clashNight=0` → preview off
   - `localStorage.setItem('nex.clashNight.preview','1')`
   - Client env `VITE_CLASH_NIGHT_FORCE=1`
   - Server env `CLASH_NIGHT_FORCE=1` / `CLASH_NIGHT_DISABLED=1`
4. **Home light cue** — 밤 ON일 때만 hero 근처 Violet 칩 (얇은 신호, Battle 프레임이 주연).
5. **a11y** — `prefers-reduced-motion`: 프레임 글로우 애니 off, **정적 Violet 프레임·라벨은 유지**.

## Scope (OUT)

- Crest (W6), Share v2  
- W1–W4 재작업 / 재생 경로 변경  
- NEXI/Higgsfield · main push · 파일 삭제  
- 전 사이트 Violet 오버로드 (OFF면 기존 UI)

---

## Lead color

| Surface | Lead | Support |
|---|---|---|
| Battle night frame + banner | **Violet** | — |
| Enter / start CTA (night ON) | **Ember** | — |
| Inner Verdict / Blind / Intent | unchanged (Teal / Violet chips as W1–W3) | — |
| Home cue | Violet chip only | Ember CTA 기존 유지 가능 |

---

## Implementation outline

| Path | Action |
|---|---|
| `docs/superpowers/plans/2026-09-19-nex-arena-week5-friday-clash.md` | 본 플랜 |
| `server/routes.ts` + `server/api-access.ts` | `GET /api/arena/clash-night` (KST Friday + env flags) |
| `client/src/lib/clashNight.ts` | preview key · query sync helpers |
| `client/src/hooks/use-clash-night.ts` | active 판정 (preview > server > force) |
| `client/src/components/FridayClashNightChrome.tsx` | banner + frame wrapper |
| `client/src/index.css` | `.nex-clash-night-*` + reduced-motion |
| `client/src/pages/Battle.tsx` | chrome wrap · Ember start CTA when ON |
| `client/src/pages/Home.tsx` | light Violet night chip when ON |
| `client/src/locales/{ko,en}/translation.json` | event label copy |
| `CURRENT_AGENT_HANDOFF.md` | W5 + **명확한 preview 스모크** |

---

## Preview how-to (Founder)

| Method | How |
|---|---|
| **URL (권장)** | `http://localhost:5001/battle?clashNight=1` |
| **끄기** | `?clashNight=0` 또는 DevTools → `localStorage.removeItem('nex.clashNight.preview')` |
| **Console** | `localStorage.setItem('nex.clashNight.preview','1'); location.reload()` |
| **Env** | `.env`에 `VITE_CLASH_NIGHT_FORCE=1` (client) 또는 `CLASH_NIGHT_FORCE=1` (server) |

자연 활성: **KST 금요일** (서버 `/api/arena/clash-night` → `active: true`).

---

## Acceptance

- [x] Battle ON: Violet frame + event banner 한눈에 구분 (tiny tint 금지)
- [x] Ember enter CTA when night ON; Verdict Teal 유지
- [x] Preview any day via query / localStorage / env
- [x] OFF: Battle = current (no permanent Violet overload)
- [x] Home: optional light Violet cue only when ON
- [x] `prefers-reduced-motion`: static frame, meaning preserved
- [x] W1–W4 rituals / playback untouched
- [ ] 대표 로컬 스모크 (`?clashNight=1`)

---

## Follow-ups (not W5 UI-only)

- **W5 B+C:** `docs/superpowers/plans/2026-09-19-nex-arena-week5-friday-clash-pool-rules.md` (Founder decision: pool weights + win bonus)
- **W6:** Creator Crest  
- Friday 계측 / 알림

**Playback note:** Chrome는 DOM·CSS only. 플레이어 remount/pause 금지.

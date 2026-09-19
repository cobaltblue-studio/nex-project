# Post-W7 Polish — UI residual · Crest Share v2 · Friday B+C tune

**Date:** 2026-09-19  
**Spec:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md`  
**Status:** LOCAL DONE — 2026-09-19  
**Goal:** Arena triad 잔여 정리 + Crest 공유 카드 v2 + 금요 B+C 차트 체감 튜닝. NEXI/Higgsfield 제외.

---

## WHY

W1–W7·Music/New 정렬 후에도 Home MusicRow·모달에 electric cyan/neon-green이 남아 Arena가 라이브러리처럼 보인다. Crest share는 ShareButtons만(light). +15는 rankingScore ~100–350 대비 차트 체감이 약하다.

---

## Scope

### 1. UI residual (IN)

| Surface | Change |
|---|---|
| `Home.tsx` | Hero wave `#00FF80` → Ember; section titles neon-green → Ember lead; hero glow green → Ember |
| `MusicRow.tsx` | `text-primary` / vote primary → Teal (verdict) + Ember play hover |
| `TrackPlayModal` · `TrackFeedModal` | Title `neon-text-green` → Ember lead |

OUT: Admin / Join / Verified cyan rosette / global `--primary` wholesale swap (spec: do not replace wholesale).

### 2. Crest Share v2

| Item | Notes |
|---|---|
| `CrestShareCard.tsx` | Navy canvas + Teal bar + tier medal + Ember ShareButtons (mirror ArenaShareCard) |
| Wire in `CreatorCrest` full mode | Replace bare ShareButtons row when earned |
| CSS `.nex-crest-share-*` | Reuse share card language; Violet resting hint optional |

### 3. Friday B+C tune (Founder-authorized adjust)

Scores mid-chart ~150–300. Defaults →:

| Constant | Was | Now | Rationale |
|---|---|---|---|
| `CLASH_NIGHT_WIN_RANKING_BONUS` | 15 | **25** | ~8–12% mid score — chart nudge without one-shot dominate |
| `streakMul` | 2.0 | **2.25** | Stronger exciting-opponent pull |
| `recentMul` | 1.75 | **2.0** | New tracks more Friday-visible |
| `activityCap` | 0.75 | **1.0** | Active tracks slightly more weighted |

Badge copy KO/EN: `+15` → `+25`. Verdict already uses `{{bonus}}`.

---

## Acceptance

- [ ] Home TOP row / section titles = Ember lead, no neon-green / #00FF80 waves
- [ ] MusicRow vote/title hover = Teal/Ember, not electric cyan
- [ ] Modals title Ember
- [ ] Profile Crest: share card preview + Ember CTAs
- [ ] `CLASH_NIGHT_FORCE=1` → badges +25 · vote bonus 25
- [ ] Playback / W1–W7 rituals untouched

---

## Files

- `client/src/pages/Home.tsx`
- `client/src/components/MusicRow.tsx`
- `client/src/components/TrackPlayModal.tsx`
- `client/src/components/TrackFeedModal.tsx`
- `client/src/components/CrestShareCard.tsx` (new)
- `client/src/components/CreatorCrest.tsx`
- `client/src/index.css`
- `client/src/locales/{ko,en}/translation.json`
- `server/clashNight.ts`
- `docs/.../week5-friday-clash-pool-rules.md` (constants note)
- `CURRENT_AGENT_HANDOFF.md`

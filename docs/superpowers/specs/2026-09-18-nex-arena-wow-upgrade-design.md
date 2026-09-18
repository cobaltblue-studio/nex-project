# NEX Arena Wow Upgrade — Design Spec

**Date:** 2026-09-18  
**Status:** DRAFT → awaiting Founder approval of weekly phases  
**Product:** NEX (nexmusic.ai)  
**Brand core (LOCKED):** Arena / Competition — not “another music library”  
**Palette LOCK (Founder direction):** Yurika Y-icon triad — Teal / Violet / Ember on deep navy  
**Ref asset:** `docs/superpowers/specs/yurika-icon-palette-ref.jpg` (inspiration only — not NEX logo)

**Agency pass:** Brand Guardian · UI Designer · UX Architect · Frontend Developer · Reality Checker  
(+ brand-guardian / ui-designer / visual-storyteller / whimsy-injector skill lenses)

---

## 1. WHY

Spotify·YouTube는 **보관·탐색**이다. NEX는 **승패가 있는 무대**다.  
사람들이 들어와 “와~~” 하게 만들려면:

1. **감탄 톤앤매너** — 한 방 리디자인 금지, 매주 한 겹씩 색·타이포·모션을 올린다.
2. **기억되는 의식(ritual)** — 듣기만 하는 곳이 아니라 판정이 남는 곳.
3. **공유되는 증거** — 결과·랭크·크레스트가 카드로 밖에 퍼진다.

NEXI / Higgsfield는 본 스펙 범위 밖 (재개 지시 전까지 미진행).

---

## 2. Brand Positioning (확정)

| 축 | 내용 |
|---|---|
| One-liner | The music arena — listen, clash, climb. |
| Differentiator | Chart + Battle + Ritual + Proof (share) |
| Not | Generic dark streaming clone / equally-loud rainbow dashboard / neon club |
| Tone | Competitive, cinematic, precise — “다크 잉크 위 세 스포트라이트” |

### Visual story (Y → Arena)

Y의 **두 팔이 맞서고, 줄기가 땅을 짚는** 형태 = 제품 서사:

| Icon arm | Signal | Arena meaning |
|---|---|---|
| Left (Teal) | **Verdict** | 판이 닫혔다 — 확정·판결·진실 |
| Right (Violet) | **Clash** | 지금 싸운다 / 아직 모른다 — 대결·장막·밤 |
| Stem (Ember/Orange) | **Crest / Action** | 올라섰다 — CTA·급등·증명 |

**절묘함:** 세 색이 동시에 같은 비중으로 만나지 않는다. 한 순간 = **주연 1색**.

### Sampled hex (icon grid sample 2026-09-18)

| Token | Hex (lock) | Sample notes |
|---|---|---|
| `--nex-wow-teal` | `#1BC4CC` | cluster avg ~`#1BC4CC` / arm `#23B3B7` |
| `--nex-wow-violet` | `#8A5AF2` | arm `#8A5AF2` / peak `#8E56FF` |
| `--nex-wow-ember` | `#FE9135` | stem `#FE9135` / `#FF9331` |
| `--nex-ink-950` | `#0B0E16` | canvas (deep navy-black) |
| `--nex-ink-900` | `#101423` | surface |
| Glow center | `#1A2036` | soft radial only on ritual/hero |

이전안(Arena Gold / Clash Magenta / Verdict Cyan)은 **본 triad로 치환**. 전환기 짧은 별칭만 허용 후 Gold 퇴장.

### Usage rules (80 / 20) — Reality Checker 반영

- **80%** Ink / charcoal / mist text only.
- **≤20%** triad on events · wins · CTAs · badges · stamps.
- **1 viewport = 1 lead color** (+ optional 1 support). Equal-loud triad = Fail (시각 소음).
- Glow = 무대 한 점의 빛. 전면 네온 금지.
- Pill/capsule radius on badges & CTAs (Y arm geometry hint) — panels stay 12px.

### Violet / “BTS affinity” (내부만)

대표님 농담·내부 직관으로 Violet이 팬덤 밤 공기와 겹칠 수 있음.  
**대외 카피·UI·마케팅에 BTS / ARMY / 방탄 언급·공식 연상 금지.**  
제품 프레이밍: **Clash violet / 밤의 아레나** only. (Brand + Reality: trademark/cringe 리스크)

### Whimsy (의식에만, 짧게)

- Verdict stamp 카피 예: “VERDICT” / “판정” — 위트는 1단어까지.
- Spike: `↑ +N` (색만으로 의미 전달 금지).
- Blind 로딩: “장막 뒤…” 수준. 팬덤 밈·크링지 금지.
- `prefers-reduced-motion`: 애니 제거, 의미는 정적 스탬프/배지로 유지.

---

## 3. Feature → Color map

| Feature | Lead | Support | Notes |
|---|---|---|---|
| Clash Verdict Ritual | Teal stamp/ring | Ember flash ≤300ms on winner | Purple off during verdict |
| Rank Spike | Ember badge | — | Teal only for confirmed rank digit if needed |
| Blind Reveal | Violet veil | → Teal on reveal | Orange = post CTA only |
| Intent Duel | Violet chips | Teal check on confirm | |
| Share Cards | Navy canvas + Teal bar | Ember Share CTA | Purple ≤ intent chip |
| Arena Pulse | Ember live dot *or* Teal ticker (pick one per surface) | — | Don’t dual-light |
| Friday Clash Night | Violet night frame | Ember enter CTA | Inner verdicts stay Teal |
| Creator Crest | Violet aura (resting) | Teal on earn stamp | Ember = share crest CTA |

**여정 시퀀스 (한 판):** Blind Violet → (Intent Violet) → Verdict Teal → Share Ember.

### Logo & icon (2026-09-18 LOCKED)

대표님 확정: **B1 Strong Spark** 아이콘 + **워드마크 LOCK** (Clash Gate N + white EX).

패키지: [`Brand/`](../../../Brand/README.md)  
아이콘: `Brand/icons/nex-icon-b1-strong-spark-hires.png`  
워드마크: `Brand/logo/nex-logo-wordmark-LOCKED.png` (자간 추가 축소 중단 — 2026-09-19)  
SVG 초안: `Brand/logo/nex-mark-b1-clash-gate.svg`  

| Dir | Name | Status |
|-----|------|--------|
| **B1** | Icon Strong Spark | **LOCKED** |
| **Wordmark** | N + white EX | **LOCKED** |
| A / C / B2 | — | Rejected |

**다음:** 대표 승인 시 `client/public` 파비콘·헤더·OG 교체 (W1 토큰 페어링 권고). 승인 전 라이브 스왑 없음.



---

## 4. Feature Inventory (전부 구현 대상)

### A. Core Rituals
1. Clash Verdict Ritual  
2. Blind Reveal  
3. Intent Duel  
4. Share Cards  

### B. Live Arena Feel
5. Arena Pulse  
6. Rank Spike  
7. Friday Clash Night  

### C. Creator Proof
8. Creator Crest  

### D. Supporting
9. Rising 카피 정렬  
10. AUTO / 재생 안정성 = 선행 유지보수 (별도 주간 피처 아님)

---

## 5. Weekly Rollout

한 주에 **디자인 한 겹 + 기능 1~2개**.  
주에 못 끝내면 넘긴다. Reality: W1이 빡세면 Spike를 W1.5로 미뤄도 됨.

| Week | Design layer | Features | Color focus |
|------|----------------|----------|-------------|
| **W1** | Triad tokens + Ember CTA (+ 확정 시 로고 페어링) | Clash Verdict Ritual + Rank Spike | Teal + Ember (Violet 변수만 예비) |
| **W2** | Typographic hierarchy | Blind Reveal | + Violet veil |
| **W3** | Motion language unified | Intent Duel + Share Card v1 | Full triad choreography |
| **W4** | Home Arena glow (one layer) | Arena Pulse | Ember or Teal ticker |
| **W5** | Night event tone | Friday Clash Night | Violet frame |
| **W6** | Crest system | Creator Crest + Share v2 | Violet + Teal earn |
| **W7+** | Polish / a11y / copy | Rising alignment | Ratio only |

---

## 6. Non-Goals

- NEXI / Higgsfield  
- Spotify-style 라디오 전면 개편  
- 결제/가격 변경  
- 한 번에 전 페이지 리디자인  
- Yurika Y를 NEX 로고로 복제  
- 타 CBSU 제품 브랜딩 혼입 (색 영감 ≠ 제품 병합)  
- 대외 BTS/ARMY 포지셔닝  

---

## 7. UX Principles

1. 한 화면에 한 의식  
2. Verdict ≤ ~1.5s, 스킵 가능  
3. 공유 1탭  
4. 모바일 우선  
5. Suno / YouTube / SoundCloud 재생 경로 불변  
6. 색 + 텍스트/아이콘 이중 채널 (a11y)

---

## 8. Technical Notes

- Front: Vite + React; tokens in `client/src/index.css` + Tailwind extend (`arena` / `clash` / `verdict`) — **do not replace global `--primary` wholesale**
- Semantic aliases: `--nex-cta-primary` → ember · `--nex-verdict-accent` → teal · `--nex-clash-accent` → violet  
- On-color: ink on Teal/Ember fills; white on Violet **700** only for body-size text  
- Share Cards: canvas or OG — choose simple path in W3  
- Friday Clash: feature flag + server clock  
- Crest: document aggregation rules first  

Week plans: `docs/superpowers/plans/`

### Week 1 file touch (Frontend handoff)

| Path | Action |
|---|---|
| `client/src/index.css` | Add triad + ink tokens, utilities, reduced-motion |
| `tailwind.config.ts` | Extend `arena` / `clash` / `verdict` |
| `client/src/components/ui/button.tsx` | `variant: "arena"` (Ember) |
| `client/src/pages/Battle.tsx` | Ritual trigger + arena CTA |
| `client/src/components/ClashVerdictRitual.tsx` | New portal |
| `client/src/components/RankSpike.tsx` | New badge |
| `client/src/pages/Music.tsx` | Spike + replace hardcoded gold if any |
| Players / youtube guards | **Do not touch** |

---

## 9. Acceptance — 「절묘한 반영」

1. Teal alone reads “확정”, Violet “가림/대결 밤”, Ember “지금 행동/급등”.  
2. Screenshot: lead triad color ≤1, support ≤1.  
3. Journey color sequence Purple → Teal → Orange when Blind→Verdict→Share.  
4. No full Y logo clone / no 3-color hero gradient.  
5. Active triad area ≤ ~20% of viewport.  
6. Reduced-motion still communicates state.  
7. W1 ships with Teal+Ember only; Violet reserved until W2+.

---

## 10. Approval Gates

- [ ] Founder: 본 스펙(브랜드 축 + **Yurika triad** + 주간 로드맵) 승인  
- [x] Founder: **로고 방향 B1 Strong Spark** (`logo-explorations/`) — SVG 폴리시 후 public 스왑은 별도 승인
- [ ] Founder: 주간 로드맵(W1~W7) 승인
- [ ] Founder: **Week 1** 착수 승인 → 그때 Week 1 implementation plan 코딩
- [ ] 주차별: 로컬 검증 → 보고 → 최종 승인 → commit/push/production (각각 별도 승인)  
- [ ] Founder: **Week 1** 착수 승인 → 코딩  
- [ ] 주차별: 로컬 검증 → 보고 → 최종 승인 → commit/push/production (각각 별도)  

**Reality Checker:** 코딩 전 가능하면 모바일 목업 3장(Home / Verdict / Spike) eye-test. “정신없다”면 Ember/Teal만 남기고 Violet 희소화.

---

## 11. Success Signals

- 첫 화면이 “대결/무대”로 읽힘  
- 배틀 후 Share 시도  
- Friday / Pulse 참여 (W4+ 최소 계측)

---

**Next:** Founder §10 체크 후 Week 1 코딩.

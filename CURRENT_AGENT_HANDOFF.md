# NEX — 이 방의 기억 (새 채팅용)

최종 갱신: 2026-09-19 KST  
독자: `nex-project`에서 열리는 다음 Cursor 채팅. 대표님에게 과거 맥락을 다시 묻지 마라.

## 너

- CBSU Blue. 사용자는 대표님.
- 이전 대화 로그는 없다. 문서·코드·이 파일만 있다.
- 중요한 결정을 새로 했으면 **이 파일의 「현재 상태」만 짧게 덮어쓴다.**

## 제품

NEX는 음악 플랫폼이다. 차트·트랙·커뮤니티·크리에이터 흐름이 코드에 있다.

- 라이브: https://nexmusic.ai
- GitHub: `cobaltblue-studio/nex-project`
- 로컬 코드: 이 폴더. 로컬 서버는 보통 `npm run server` (PORT 5001)
- UX 스펙: `NEX_MASTER_SPEC.md`
- 디자인: `../DESIGN_SYSTEM_READ_FIRST.md` → CBSU Master Design System → `NEX_NEXI_SPEC`
- 구 핸드오프: `../NEX-AI-HANDOFF-PACKAGE/README-START-HERE.md` (로컬 경로가 Archive로 적혀 있어도, 지금 작업 루트는 여기)

## Agency Agents

이 방에 설치됨. 디자인·프론트·검수가 필요하면 불러라.

- Brand Guardian / UI Designer / UX Architect / Frontend Developer / Reality Checker
- 위치: `.cursor/rules/*.mdc` (이 레포 `.gitignore`가 `.cursor/`를 무시할 수 있음. 로컬 Cursor에는 있다)

## 절대

- `main` push / Production 배포 = 대표 승인 전 금지
- 가격·결제·로그인·개인정보 처리 변경 = 승인 전 금지
- 파일·폴더 삭제 = 대표 사전 승인
- **NEXI/Higgsfield:** 대표가 재개 지시할 때까지 언급·진행 금지 (BLUE_HANDOVER)
- 다른 CBSU 제품 섞지 말 것

## 현재 상태

- **브랜드 축 LOCK:** Arena / Competition (스포티파이식 라이브러리 아님).
- **브랜드 폴더:** `Brand/` — 현재 확정본. 과거는 `Brand/history/` (핵심 이미지만).
- **아이콘 LOCK:** B1 Strong Spark hi-res `Brand/icons/nex-icon-b1-strong-spark-hires.png`
- **워드마크 LOCK (2026-09-19):** `Brand/logo/nex-logo-wordmark-LOCKED.png` (Clash Gate N + white EX). 자간 추가 축소 중단 — 대표 확정.
- **팔레트 LOCK:** Teal `#1BC4CC` / Violet `#8A5AF2` / Ember `#FE9135`. 레퍼런스 `Brand/palette/`
- **로컬 W1:** 헤더 아이콘·파비콘 → B1 Strong Spark (`client/public/brand/`, favicon PNG/SVG). **Production 반영 = 대표 승인 후.**
- **BTS/ARMY:** 내부만. 대외 카피 금지.
- **프로그램:** Arena Wow Upgrade — 매주 단계.
- **스펙:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md`
- **Week 1–3 로컬 완료:** Verdict · Blind · Intent · Share. Production `51a177f` = W1–W3만.
- **Week 4 로컬 완료:** Home Arena glow + Arena Pulse (Ember). 플랜: `docs/superpowers/plans/2026-09-19-nex-arena-week4-arena-pulse.md`
- **Week 5 로컬 완료 (2026-09-19):** Friday Clash Night — **Violet night frame** + **Founder B+C** (pool + win bonus).  
  - UI 플랜: `docs/superpowers/plans/2026-09-19-nex-arena-week5-friday-clash.md`  
  - B+C 플랜(수치): `docs/superpowers/plans/2026-09-19-nex-arena-week5-friday-clash-pool-rules.md`
  - Battle ON: 상단 배너 `금요일 클래시` / `FRIDAY CLASH` + 두꺼운 Violet 테두리·코너·글로우. Ember 입장 CTA.
  - **B:** 매칭 가중 — `winStreak≥2` ×2.0 · 7일 이내 생성 ×1.75 · playCount log 활동(최대 +0.75)
  - **C:** 승 시 `rankingScore` **+15** flat · vote 응답 `clashNightWinBonus` · UI「금요 승 보너스 +15」
  - 내부 Verdict Teal / Blind·Intent Violet 칩 유지. 재생 경로 불변.
  - 자연 활성: **KST(Asia/Seoul) 금요일** — `GET /api/arena/clash-night` (rules 포함)
  - 서버 env: `CLASH_NIGHT_FORCE=1` / `CLASH_NIGHT_DISABLED=1` / (옵션) `CLASH_NIGHT_ALLOW_PREVIEW=1`
  - Client env: `VITE_CLASH_NIGHT_FORCE=1`
  - Home: 밤 ON일 때만 Violet 칩 + Ember「입장」CTA (가벼운 신호)
  - OFF: Battle = 기존 UI (상시 Violet 과부하 없음)
  - `prefers-reduced-motion`: 프레임 애니 off, **정적 Violet 프레임·라벨 유지**
- **Week 6 로컬 완료 (2026-09-19):** Creator Crest — Violet resting + Teal earn stamp + Ember share CTA (light).  
  - 플랜·earn SoT: `docs/superpowers/plans/2026-09-19-nex-arena-week6-creator-crest.md`
  - 티어(최고 해금): Spark(승≥3|연승≥2) · Contender(승≥10|연승≥5|차트≤50) · Champion(승≥25|연승≥10|차트≤10) · Legend(승≥50|차트≤3)
  - 클라이언트 집계만 (`client/src/lib/creatorCrest.ts`) — 새 스키마 없음
  - UI: 프로필 **풀 패널** (`CreatorCrest`) · `/creators`·`/music` **compact 캡슐** (한눈에 보임)
  - Clash Night ON/OFF와 무관하게 Crest 동작
- **Week 7 로컬 완료 (2026-09-19):** Polish / a11y / Rising alignment — **새 ritual 없음**. Ratio only.  
  - 플랜: `docs/superpowers/plans/2026-09-19-nex-arena-week7-polish.md`
  - Rising: **Ember lead** (eyebrow「아레나 급등」·타이틀 Ember glow·배틀 CTA Ember). 네온그린/라이브러리 차트 톤 퇴장
  - a11y: Crest compact `aria-label` · Clash banner `aria-live` · reduced-motion에 pulse/clash chip-dot/rising fuel/crest 포함
  - KO/EN Rising·Clash 카피 정렬 (BTS 없음)
- **프로그램 W1–W7 로컬 완료.** Production 반영 = 대표 승인 후 commit/push.
- **스모크 W7 — Rising Arena 정렬:**
  1. `http://localhost:5001/rising` — 상단 **Ember「아레나 급등」** + RISING 타이틀 Ember glow + Ember「배틀 입장」CTA. 한눈에 Arena (구 cyan/네온그린 차트 느낌이면 Fail)
  2. OS 축소 모션 ON: Rising empty fuel / Home pulse / Clash frame / Crest aura = **정적**, 의미 유지
  3. Blind→Intent→Verdict→Share · Crest · Friday B+C · 재생 끊김 없음 (W1–W6 불변)
- **스모크 W6 — Creator Crest (Clash Night와 독립):**
  1. `http://localhost:5001/creators` — 이름 옆 **Violet「크레스트」캡슐** (또는 Teal 티어명). W4 수준 미세 글로우면 Fail
  2. 크리에이터 클릭 → `/profile/{username}` — **큰 Violet Crest 패널** (메달·제목·메타). 티어 있으면 Teal「획득」스탬프 + Ember Share
  3. `http://localhost:5001/` → Music/차트 — 크리에이터 이름 옆 compact Crest
  4. (선택) `CLASH_NIGHT_FORCE=1`인 서버에서도 Crest 동일 확인 — 밤 모드와 충돌 없음
  5. Blind→Intent→Verdict→Share · 재생 끊김 없음 (W1–W5 불변)
- **스모크 W5 UI — 강제 프리뷰 (요일 무관, chrome만):**
  1. 브라우저에서 **`http://localhost:5001/battle?clashNight=1`** 연다 (Google OAuth용 — `127.0.0.1` 금지)
  2. **극적으로 달라져야 함:** 상단 Violet 캡슐 배너「금요일 클래시」+ 배지「급등·연승 가중 매치」「금요 승 보너스 +15」+ **두꺼운 Violet 밤 프레임**. 입장 버튼 **Ember**
  3. Home도 `http://localhost:5001/?clashNight=1` — hero 아래 Violet 칩 · Start가 Ember
  4. **끄기:** `http://localhost:5001/battle?clashNight=0` → 프레임·배너 사라짐
  5. 콘솔 대체: `localStorage.setItem('nex.clashNight.preview','1'); location.reload()` / 끄기 `removeItem`
  6. Blind→Intent→Verdict→Share · 재생 끊김 없음 확인
  7. OS 축소 모션 ON: 프레임은 **정적** Violet으로 남음
- **스모크 W5 B+C — 서버 밤 강제 (매칭·점수, 권장):**
  1. 서버를 **`CLASH_NIGHT_FORCE=1 npm run server`** 로 재기동 (PORT 5001)
  2. `http://localhost:5001/battle` — Violet ON (server reason `force`)
  3. 배틀 시작 → Network `POST /api/battles/new` 응답에 `clashNight.active: true` · `poolWeighted: true`
  4. 투표 승 → `clashNightWinBonus: 15` · Verdict「금요 보너스 +15」
  5. (대체) force 없이 `?clashNight=1`만: non-prod에서 POST body `clashNightPreview: true`로 B/C 적용 (`reason: preview`)
  6. force 끄고 재기동 → B/C off (금요일 아니면)
- **스모크 W4 (참고):** `http://localhost:5001/` hero ink glow · Live Ember 점 · Battle stats Ember 점
- **Production:** W4–W7은 **로컬만** — push/배포는 대표 승인 후.
- **다음:** 대표 로컬 스모크 W7 Rising → 승인 시 **W1–W7 commit/push**. 추가 ritual 없음(스펙 W7+ = polish).
- NEXI/Higgsfield 보류.
- 코드는 이 `nex-project`.

## 작업 후

요청받은 것만. 커밋/푸시는 대표가 말했을 때만.

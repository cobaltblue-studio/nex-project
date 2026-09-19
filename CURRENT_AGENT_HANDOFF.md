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
- **프로그램:** Arena Wow Upgrade — W1–W7 Production `0d4dee0` (2026-09-19).
- **스펙:** `docs/superpowers/specs/2026-09-18-nex-arena-wow-upgrade-design.md`
- **커뮤니티 EN (로컬, 2026-09-19):** `?lang=en` 시 서버가 한글 글·댓글을 영문으로 번역(캐시). 시스템 시드는 사전 EN. 피드/상세 클라이언트도 `lang=en` 전달. **커밋·배포 = 승인 후.**
- **Suno 재생:** Private clip (`is_public:false`) → `SUNO_PRIVATE` — Suno에서 Public 필요
- **다음:** 커뮤니티 EN 스모크 · 커밋/배포는 승인 후. NEXI/Higgsfield 보류.
- 코드는 이 `nex-project`.

## 스모크 Post-W7 polish

1. `http://localhost:5001/` — hero/섹션 Ember lead · wave Ember · MusicRow Teal vote / Ember play. neon-green/#00FF80이면 Fail
2. Music 차트 행 재생 모달 — 타이틀 Ember (neon-green Fail)
3. 프로필 Crest 해금 시 — Crest Share **카드** 미리보기 + Ember 공유 버튼
4. `CLASH_NIGHT_FORCE=1` 서버 → Battle 배지 `+25` · vote `clashNightWinBonus: 25`
5. Blind→Intent→Verdict→Share · 재생 끊김 없음

## 작업 후

요청받은 것만. 커밋/푸시는 대표가 말했을 때만.

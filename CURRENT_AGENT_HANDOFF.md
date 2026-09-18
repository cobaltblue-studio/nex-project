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
- **Week 1 로컬 완료:** triad tokens · ClashVerdictRitual · RankSpike · Ember CTA · B1 헤더/파비콘. 플랜: `docs/superpowers/plans/2026-09-18-nex-arena-week1-verdict-spike.md`
- **Week 2 로컬 완료:** Battle 타이포 + Blind Reveal. 플랜: `docs/superpowers/plans/2026-09-19-nex-arena-week2-blind-reveal.md`
- **Week 3 로컬 완료 (2026-09-19):** Intent Duel(light chips) + Share Card v1. 플랜: `docs/superpowers/plans/2026-09-19-nex-arena-week3-intent-share.md`
  - Intent: Violet 칩(훅/분위기/보이스·톤/완성도) → 투표 후 Teal 체크. `localStorage` `nex.battle.lastIntent` only (서버 없음).
  - Share: navy 프리뷰 + Teal bar + Ember Share CTA (`ShareButtons` variant=arena). Verdict 종료 후 handoff 모션.
  - 시퀀스: Blind Violet → Intent Violet → Verdict Teal → Share Ember.
- **스모크 (localhost, Google OAuth용 — 127.0.0.1 금지):**
  1. `http://localhost:5001/battle` — 양쪽 청취 후 Violet「클래시 콜」칩 선택(선택 사항)
  2. 투표 → (Blind 시) Violet reveal → Teal Verdict → Share 카드(navy+Teal bar, Ember 공유 버튼)
  3. 칩 선택 시 결과 카드에 Teal 의도 배지 표시 · 미선택도 투표·공유 OK
  4. 공유 1탭( native / 복사 / X ) · 재생 끊김 없음
- **다음:** 대표 스모크 후 W4(Arena Pulse) 또는 커밋 지시.
- NEXI/Higgsfield 보류.
- 코드는 이 `nex-project`.

## 작업 후

요청받은 것만. 커밋/푸시는 대표가 말했을 때만.

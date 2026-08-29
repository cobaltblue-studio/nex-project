# NEX Admin — 단체 공지 메일 (템플릿 + 직접 작성)

**Status:** Draft — 대표 승인 대기  
**Date:** 2026-08-29 KST  
**Author:** Blue

## WHY

대표(NEX admin)가 코드·스크립트 없이 NEX 어드민 패널에서 **가입자 전체**에게 **NEX Team** 명의의 공지 메일을 보낼 수 있어야 한다. 커뮤니티 오픈 등 반복 공지는 템플릿으로, 긴급·일회성 공지는 직접 작성으로 처리한다.

## CONTEXT (이미 있는 것)

| 구성요소 | 상태 |
|---|---|
| Resend 발송 (`server/email.ts`) | ✅ Production `email.enabled: true` |
| 수신자 목록 (`listAnnouncementRecipients`) | ✅ 가입자 중 deliverable email 전원 |
| 중복 방지 (`announcement_email_deliveries`) | ✅ 캠페인 slug × 이메일 |
| 큐 워커 (`announcementEmailCampaignRuns`) | ✅ 백그라운드 처리 |
| 어드민 API (`/api/admin/announcement-campaigns/*`) | ✅ 있음 |
| 코드 고정 템플릿 (`community-launch`) | ✅ 1개 |
| **어드민 UI** | ❌ 없음 |
| **커스텀 작성 API** | ❌ 없음 |

발신 주소 예시 (`.env.example`): `NEX <notifications@nexmusic.ai>`  
공지 메일만 표시명을 **`NEX Team`** 으로 분리한다.

## USER EXPERIENCE

### 접근

- 경로: **Admin Panel** → 새 섹션 **「공지 메일」**
- 권한: `role === admin` 만 (기존 `isAdmin` 게이트)

### 탭 A — 템플릿

- 서버에 등록된 캠페인 카드 목록 (이름 KO/EN, slug)
- 각 카드: **수신 예정 / 이미 발송 / 전체** 인원 표시
- 버튼:
  - **내 메일로 테스트** — 본인·founder 메일만 (기존 email-test 규칙)
  - **미리보기(드라이런)** — 발송 없이 대상 수만 확인
  - **전체 발송(큐)** — 확인 모달 후 큐 등록 → 워커가 순차 발송
- 하단: 최근 **캠페인 실행 기록** (status, sent/failed, 요청자, 시각)

### 탭 B — 직접 작성

폼 필드 (이중 언어, 기존 메일 레이아웃과 동일):

| 필드 | 필수 |
|---|---|
| 내부 제목 (관리용, slug 생성에 사용) | ✅ |
| 제목 EN / KO | ✅ |
| 헤드라인 EN / KO | ✅ |
| 본문 EN / KO (textarea, 줄바꿈 → `<p>`) | ✅ |
| CTA 라벨 EN / KO | 선택 |
| CTA 링크 | 선택 (기본 `https://nexmusic.ai`) |

버튼: 테스트 / 드라이런 / 전체 발송(큐) — 템플릿 탭과 동일한 안전장치.

발송 시 서버가 slug를 `custom-{YYYYMMDD}-{shortId}` 로 자동 생성 → **이번 공지당 1회만** 전체 발송 (중복 방지).

## ARCHITECTURE

```
AdminPanel (공지 메일 UI)
    │
    ├─ GET  /api/admin/announcement-campaigns
    ├─ GET  /api/admin/announcement-campaign-runs
    ├─ POST /api/admin/announcement-campaigns/:slug/queue
    │
    ├─ POST /api/admin/announcement-emails/custom/preview
    ├─ POST /api/admin/announcement-emails/custom/test
    └─ POST /api/admin/announcement-emails/custom/queue
              │
              ▼
    announcementCampaigns.ts
    ├─ listAnnouncementRecipients()
    ├─ sendAnnouncementCampaign(slug)      // 기존 템플릿
    └─ sendCustomAnnouncement(payload)     // 신규
              │
              ▼
    email.ts — sendPlatformAnnouncementEmail()
    from: "NEX Team <notifications@nexmusic.ai>"  // 공지만
              │
              ▼
    Resend → 가입자 inbox
```

### 신규 서버 함수

- `validateCustomAnnouncementPayload(body)` — zod, 길이 상한 (subject 200, body 8k 등)
- `previewCustomAnnouncement(payload)` — 수신자 수만 반환
- `sendCustomAnnouncementTest(payload, to)` — 1통 테스트
- `enqueueCustomAnnouncement(payload, requestedBy)` — runs 테이블에 `campaignSlug` + `summary`에 payload 저장 후 워커 처리

워커(`processPendingAnnouncementCampaigns`) 확장: slug가 `custom-` 접두사면 `summary`에 저장된 payload로 발송.

### 발신자

- `announcementFromAddress()`: `NEX Team <{same-domain-as-NEX_EMAIL_FROM}>`
- 트랜잭션 메일(승인/거절 등)은 기존 `fromAddress()` 유지

## ERROR HANDLING & SAFETY

- 발송 전 확인 모달: `"N명에게 발송합니다. 계속할까요?"`
- `RESEND_API_KEY` 없으면 UI에 비활성 + 안내
- 실패 건은 run `summary.failures`에 최대 25건 보존 (기존과 동일)
- 테스트 메일: admin 본인·founder만
- HTML injection: 본문은 `escapeHtml` 후 줄바꿈만 `<p>` 변환 (마크다운/HTML 직접 입력 불가 — v1)

## OUT OF SCOPE (v1)

- 마케팅 opt-out / 구독 해지 (전원 트랜잭션·플랫폼 공지로 취급)
- 예약 발송 (특정 시각)
- 커스텀 작성 내용을 DB에 「내 템플릿」으로 저장 — v2 후보
- 비관리자(크리에이터) 발송

## ACCEPTANCE TEST

1. Admin 로그인 → 공지 메일 섹션 표시, 비관리자는 403/미표시
2. 템플릿 탭: `community-launch` 수신자 수 표시
3. 직접 작성: 테스트 메일이 본인 inbox에 도착, 발신자 **NEX Team**
4. 드라이런: sent=0, attempted=전체 수신자 수
5. 큐 발송: run status `completed`, deliveries 테이블 증가
6. 동일 slug 재발송 시 alreadySent 반영, 중복 미발송
7. Production `nexmusic.ai` 배포 후 smoke

## FILES (예상)

| 파일 | 변경 |
|---|---|
| `server/announcementCampaigns.ts` | custom payload, 워커 확장 |
| `server/email.ts` | `announcementFromAddress()` |
| `server/routes.ts` | custom preview/test/queue 라우트 |
| `client/src/pages/AdminPanel.tsx` | 공지 메일 UI (또는 `AdminAnnouncements.tsx` 분리) |
| `client/src/locales/{ko,en}/translation.json` | 라벨 |

DB 마이그레이션: **불필요** (기존 `announcement_email_*` 테이블 재사용, custom payload는 run.summary JSON)

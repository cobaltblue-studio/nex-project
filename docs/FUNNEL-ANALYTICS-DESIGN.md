# NEX 사용자 퍼널 분석 — 현황·갭·설계

**문서 목적.** 리스너·크리에이터 유입부터 핵심 행동(배틀, 재생, 제출)까지 **퍼널 분석**을 하려면 무엇이 있고 무엇이 부족한지 정리하고, 구현 전 설계 기준을 둔다.

**작성 기준일.** 2026-06-17  
**관련 코드.** `shared/schema.ts`, `server/storage.ts`, `server/routes.ts`, `client/src/components/Layout.tsx`, `client/src/pages/Battle.tsx`, `client/src/pages/AdminPanel.tsx`, `client/src/pages/CreatorAnalytics.tsx`

**원칙.** 본 문서는 **설계·분석 가이드**이다. 구현 시 스키마·이벤트명은 코드 리뷰 후 확정하며, 코드와 불일치하면 **코드가 우선**이고 본 문서를 갱신한다.

---

## 1. 요약

| 구분 | 현재 | 퍼널 분석에 필요한 것 |
|------|------|------------------------|
| 결과 지표 (집계) | 재생, 투표, 가입, 일별 스냅샷 | ✅ 부분적으로 가능 |
| 단계별 이벤트 로그 | ❌ 없음 | 페이지·배틀 단계별 `event` 행 |
| 게스트·세션 연결 | 재생에만 `session_key` | 사이트 전역 `session_id` |
| 유입·채널 (QR, UTM) | 재생 `referrer_host` 일부 | 랜딩 시 UTM·referrer 영구 저장 |
| 어드민 퍼널 UI | User Activity (활성 여부) | 단계별 전환율·이탈 차트 |
| 외부 분석 (GA/PostHog) | ❌ 없음 | 선택 도입 |

**한 줄 결론:** 지금은 **“몇 명이 투표/재생/가입했는가”** 는 대략 보이지만, **“어디서 들어와 어디서 이탈했는가”** 는 같은 사용자·세션으로 잇기 어렵다.

---

## 2. 지금 수집되는 데이터

### 2.1 로그인 사용자 활동 (`user_activity_stats`)

| 필드 | 의미 |
|------|------|
| `last_login_at` | 마지막 로그인 (OAuth 완료 시 `recordUserLogin`) |
| `last_visit_at` | 마지막 방문 |
| `visit_count` | **UTC 기준 하루 1회**만 증가 (`Layout` → `POST /api/activity/visit`) |
| `tracks_played_count` | 서로 다른 트랙 최초 재생 수 (누적) |
| `battle_vote_count` | 배틀 투표 수 (누적) |

**한계:** 사용자당 **한 줄 집계**라 방문 순서·당일 경로·이탈 지점을 재구성할 수 없다.

### 2.2 재생 (`track_plays`)

| 필드 | 의미 |
|------|------|
| `user_id` | 로그인 시 |
| `session_key` | 게스트 시 (`localStorage` 기반 opaque id) |
| `listener_country` | 로그인 사용자 프로필 국가 |
| `device_class` | `mobile` \| `desktop` \| `tablet` \| `unknown` |
| `referrer_host` | 외부 referrer **호스트만** (path/query 제외) |
| `completed` | 완청 여부 |
| `played_at` | 시각 |

**한계:** **재생 API 호출 시점**에만 컨텍스트가 붙는다. 홈·배틀·가입 페이지 방문과 연결되지 않는다.

### 2.3 배틀

| 테이블 | 저장 내용 |
|--------|-----------|
| `battles` | 장르, track A/B, 득표, winner, `created_at` — **`requester_user_id` 없음** |
| `battle_listen_completions` | user + battle + track 별 프리뷰 청취 완료 (`completed_at`) |
| `battle_votes` | user + battle + 선택 track (`voted_at`) |

**클라이언트 배틀 단계 (DB 미기록):**

```
genre-select → loading → track-a → track-b → vote → result
```

**한계:** 장르 선택·배틀 시작·투표 화면 진입 등 **중간 단계 이벤트 없음**. `battlesPlayedToday`(API `/api/stats/today`)는 **오늘 생성된 배틀 수**이며 “투표까지 완료한 배틀”이 아니다.

### 2.4 플랫폼 일별 스냅샷 (`data_daily_platform_snapshots`)

UTC 일별 롤업: 가입, 트랙, 재생, 좋아요, 배틀, 당일 투표/배틀/신규 트랙 등.

**용도:** B2B·트렌드·시계열. **개인 퍼널·전환율**에는 부적합.

### 2.5 어드민·크리에이터 대시보드

| 화면 | 대상 | 내용 |
|------|------|------|
| Admin → User Activity | 운영자 | 사용자별 방문·재생 곡 수·투표 수, 7일 내 active |
| `/profile/me/analytics` | creator/admin | 곡별 재생·좋아요·배틀·부스트 (스냅샷) |

**한계:** **리스너 퍼널**·**마케팅 유입** 전용 UI 없음.

### 2.6 부스트 노출 (`boost_impression_events`)

배틀 프리뷰 단계에서 `POST /api/boost/increment-impression` — 트랙 노출 카운트. 사용자 여정과는 별도.

---

## 3. 퍼널 분석에 부족한 것 (갭)

### 3.1 게스트·세션

- 방문 ping은 **로그인 후** + **세션당 하루 1회**만 기록.
- QR·링크로 들어온 **비로그인 유입**과 **가입 전 이탈** 측정 불가.
- `session_key`는 재생에만 사용; 로그인 후에도 과거 게스트 행동과 **병합(identity merge)** 로직 없음.

### 3.2 페이지·단계 이벤트

배틀·가입·제출 등 **UI 단계**가 서버에 남지 않아 drop-off 분석 불가.

예시 (배틀):

| 단계 | 클라이언트 | DB |
|------|------------|-----|
| 배틀 페이지 진입 | ✅ | ❌ |
| 장르 선택 | ✅ | ❌ |
| 배틀 생성 | API `POST /api/battles/new` | `battles` 행만 (누가 시작했는지 없음) |
| Track A 청취 완료 | ✅ | `battle_listen_completions` |
| Track B 청취 완료 | ✅ | `battle_listen_completions` |
| 투표 | ✅ | `battle_votes` |
| 결과 화면 | ✅ | ❌ |

### 3.3 유입·채널 (Attribution)

- QR, 인스타, 유튜브 설명란 등 **캠페인 구분 없음**.
- `utm_source`, `utm_medium`, `utm_campaign` 저장 없음.
- 첫 랜딩 URL·landing path 미저장.

**마케팅 질문에 답 불가:** “QR 배포 후 실제 유입·가입·첫 배틀은 몇 %인가?”

### 3.4 가입·온보딩 퍼널

```
랜딩 → /auth → Google OAuth → 프로필 생성 → 첫 핵심 행동
```

- `users.created_at`만으로는 **auth 페이지 이탈**, **프로필 미완료** 구간을 볼 수 없음.
- “첫 배틀 투표”, “첫 트랙 재생” 같은 **activation 이벤트** 정의·저장 없음.

### 3.5 크리에이터 퍼널

```
/join 또는 /submit-track → 제출 → 관리자 승인 → 배틀 풀 노출 → CHART 승격
```

- 제출·승인 **상태**는 `tracks.status`, `creator_application_status`에 있음.
- 단계별 **전환율·소요 시간**·이탈 지점 대시보드 없음.

### 3.6 분석 인프라

- Google Analytics, PostHog, Plausible 등 **미연동**.
- `analytics_events` 같은 **append-only 이벤트 테이블** 없음.
- 어드민 **퍼널·코호트·전환율** 뷰 없음.

---

## 4. NEX 대표 퍼널 정의

구현·대시보드 설계 시 아래 퍼널을 기준으로 한다.

### 4.1 리스너 퍼널 (마케팅·QR·배틀 중심)

```
유입 (landing)
  → 배틀 페이지 조회 (/battle)
  → (선택) 가입
  → 배틀 시작 (장르 선택 후 생성)
  → Track A 청취 완료
  → Track B 청취 완료
  → 투표
  → 결과 확인
  → (7일 내) 재방문 또는 재투표
```

**핵심 전환 지표 예시:**

- 유입 → 배틀 시작율  
- 배틀 시작 → A+B 청취 완료율  
- 청취 완료 → 투표율  
- 첫 방문 → 7일 retention  

### 4.2 콘텐츠 소비 퍼널

```
홈 /music /rising /radio
  → 트랙 상세 (/track/:id)
  → 재생 (counted play)
  → 완청 (completed)
  → 좋아요 / 크리에이터 팔로우
```

### 4.3 크리에이터 퍼널

```
유입 → 가입
  → 크리에이터 신청 (pending) 또는 즉시 creator
  → 트랙 제출
  → 관리자 승인 (APPROVED / BATTLE_POOL)
  → 첫 배틀 매칭
  → (조건 충족) CHART 승격
```

### 4.4 North Star 후보 (정렬용)

제품 방향에 따라 하나를 Primary로 고른다.

| 후보 | 정의 |
|------|------|
| 주간 배틀 투표 사용자 수 | 커뮤니티 참여 |
| 주간 완청 재생 수 | 청취 깊이 |
| 주간 신규 승인 트랙 수 | 공급(크리에이터) 성장 |

---

## 5. 코드 변경 없이 가능한 조회 (참고)

프로덕션 DB에서 **대략적인** 배틀 완료율만 볼 때:

```sql
-- 오늘(UTC) 생성된 배틀 vs 투표가 1건 이상 있는 배틀
SELECT
  (SELECT count(*) FROM battles
   WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')) AS battles_created,
  (SELECT count(DISTINCT battle_id) FROM battle_votes
   WHERE voted_at >= date_trunc('day', now() AT TIME ZONE 'UTC')) AS battles_with_at_least_one_vote;
```

```sql
-- 특정 배틀에서 A만 듣고 B는 안 듣는 사용자 (이탈 후보)
SELECT bl.user_id, bl.battle_id,
  bool_or(bl.track_id = b.track_a_id) AS heard_a,
  bool_or(bl.track_id = b.track_b_id) AS heard_b
FROM battle_listen_completions bl
JOIN battles b ON b.id = bl.battle_id
WHERE bl.completed_at >= now() - interval '7 days'
GROUP BY bl.user_id, bl.battle_id
HAVING bool_or(bl.track_id = b.track_a_id) AND NOT bool_or(bl.track_id = b.track_b_id);
```

**주의:** 유입 채널·게스트·페이지 단계는 위 쿼리로는 커버되지 않는다.

---

## 6. 목표 설계 (구현 제안)

### 6.1 이벤트 로그 테이블 `analytics_events`

append-only. 퍼널·코호트의 단일 소스.

```sql
-- 제안 스키마 (구현 시 Drizzle 마이그레이션으로 확정)
CREATE TABLE analytics_events (
  id            bigserial PRIMARY KEY,
  event_name    text NOT NULL,           -- 예: page_view, battle_start, battle_vote
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  user_id       varchar REFERENCES users(id),   -- nullable (게스트)
  session_id    text NOT NULL,           -- 브라우저 opaque id (로그인 전후 동일)
  page_path     text,                    -- 예: /battle, /track/109
  properties    jsonb NOT NULL DEFAULT '{}',  -- genre, battle_id, utm_*, device_class 등
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_name_time_idx ON analytics_events (event_name, occurred_at);
CREATE INDEX analytics_events_session_time_idx ON analytics_events (session_id, occurred_at);
CREATE INDEX analytics_events_user_time_idx ON analytics_events (user_id, occurred_at) WHERE user_id IS NOT NULL;
```

**이벤트 명명 규칙 (초안):**

| `event_name` | 발생 시점 | `properties` 예 |
|--------------|-----------|-----------------|
| `session_start` | 첫 페이지 로드 (세션당 1회) | `utm_source`, `utm_medium`, `referrer_host`, `landing_path` |
| `page_view` | 라우트 변경 | `path` |
| `auth_start` | `/auth` 진입 | — |
| `auth_complete` | OAuth 성공 (서버) | `is_new_user` |
| `profile_complete` | 온보딩 제출 | `role` |
| `battle_genre_select` | 장르 선택 | `genre` |
| `battle_start` | `POST /api/battles/new` 성공 | `battle_id`, `genre` |
| `battle_listen_complete` | listen-complete API 성공 | `battle_id`, `track_id`, `side` (`a`\|`b`) |
| `battle_vote` | vote API 성공 | `battle_id`, `track_id` |
| `battle_result_view` | result phase 진입 | `battle_id` |
| `track_play` | play API counted | `track_id`, `completed` |
| `track_submit` | 제출 성공 | `track_id` |
| `track_approved` | 관리자 승인 (서버) | `track_id` |

클라이언트는 `POST /api/analytics/event` (배치 허용)로 전송. 서버는 인증·rate limit·PII 필터 적용.

### 6.2 세션·유입

1. **`nex_session_id`** — `localStorage`에 opaque UUID (재생용 `session_key`와 통합 검토).
2. **첫 방문 시** URL query에서 `utm_*` 파싱 → `session_start`에 저장.
3. **QR용 URL 예:**  
   - `https://nexmusic.ai/battle?utm_source=qr&utm_medium=flyer&utm_campaign=2026-06`  
   - `https://nexmusic.ai/?utm_source=qr&utm_medium=business-card`

### 6.3 배틀 테이블 보강

```sql
ALTER TABLE battles ADD COLUMN requester_user_id varchar REFERENCES users(id);
```

`createBattle` 시 요청 사용자 저장 → “시작했으나 투표 없음” 코호트 분석 가능.

### 6.4 Identity merge (2단계)

로그인 성공 시: 동일 `session_id`의 과거 게스트 이벤트에 `user_id` backfill (배치 또는 로그인 핸들러).

### 6.5 어드민 퍼널 대시보드 (MVP)

경로: `/admin` 하위 또는 `/admin/funnels`

| 위젯 | 내용 |
|------|------|
| 리스너 배틀 퍼널 (7일) | session_start → battle_start → listen_a+b → vote (단계별 %·절대 수) |
| 유입 Top | `utm_source` / `referrer_host` 별 battle_vote 전환 |
| Activation | 가입 후 24h 내 첫 `battle_vote` 비율 |
| 크리에이터 | submit → approved (7일) |

API: `GET /api/admin/funnels?window=7d&funnel=listener_battle`

### 6.6 외부 도구 (선택)

| 도구 | 장점 | 비고 |
|------|------|------|
| **PostHog** (self-host 또는 cloud) | 퍼널 UI, 코호트, feature flags | 이벤트 이중 전송 가능 |
| **Plausible** | 가볍고 쿠키 최소 | 페이지뷰·UTM 위주 |
| **자체 DB only** | 데이터 주권, B2B 일관성 | 대시보드 직접 구현 필요 |

B2B·데이터 정책(`docs/DATA_DICTIONARY.md`, `/data-policy`)과 맞춰 **1차는 자체 `analytics_events`**, 필요 시 익명화 후 외부 연동을 권장.

---

## 7. 구현 우선순위

| 순위 | 작업 | 기대 효과 |
|------|------|-----------|
| **P0** | `analytics_events` + `POST /api/analytics/event` + 핵심 이벤트 (session_start, page_view, battle_*) | 퍼널 기반 |
| **P0** | `session_id` + UTM 캡처 (랜딩) | QR·마케팅 ROI |
| **P1** | `battles.requester_user_id` | 배틀 이탈 분석 |
| **P1** | 어드민 퍼널 API + 간단 차트 | 운영 의사결정 |
| **P2** | 로그인 시 session→user merge | 게스트→가입 전환 |
| **P2** | 크리에이터 퍼널 이벤트·위젯 | 공급 성장 |
| **P3** | PostHog/Plausible (선택) | 빠른 실험·시각화 |

**배틀 클라이언트 연동 파일:** `client/src/pages/Battle.tsx`  
**방문 ping:** `client/src/components/Layout.tsx`  
**저장소 확장:** `server/storage.ts`, `scripts/migrate-b2b-schema.ts`

---

## 8. 개인정보·정책

- `analytics_events.properties`에 **이메일·실명·정확한 GPS** 등 PII 금지.
- UTM·referrer·device_class 수준은 기존 `track_plays` 정책과 정렬 (`client/src/pages/DataPolicy.tsx`).
- EU/한국 이용자 증가 시 opt-out·보존 기간(예: 90일 raw, 이후 집계만) 정책 추가 검토.

---

## 9. 성공 기준 (설계 검증)

다음 질문에 **대시보드 또는 SQL 한 번**으로 답할 수 있으면 MVP 완료로 본다.

1. 지난 7일 QR(`utm_source=qr`) 유입 중 배틀 투표까지 간 비율은?  
2. 배틀을 시작한 사용자 중 Track B 청취 전 이탈 비율은?  
3. 신규 가입자 중 24시간 내 첫 배틀 투표 비율은?  
4. (크리에이터) 제출 후 7일 내 승인 비율은?

---

## 10. 관련 문서

- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md) — `track_plays`, 스냅샷 테이블  
- [NEX-LOGIC-CODEX.md](./NEX-LOGIC-CODEX.md) — 배틀·재생·API 공개 범위  
- [PRODUCTION_ENV.md](./PRODUCTION_ENV.md) — 배포·DB 마이그레이션

---

## 11. 갭별 해결안 (Implementation Playbook)

아래는 §3 갭 항목을 **하나씩** “무엇을 만들면 되는지”에 매핑한 실행 가이드다.

### 11.1 “같은 사용자·세션으로 잇기” 활성화

**목표:** QR → 랜딩 → 배틀 → (가입) → 투표를 **한 `session_id` (게스트) + `user_id` (로그인 후)** 로 추적.

| 단계 | 작업 | 파일/위치 |
|------|------|-----------|
| 1 | `nex_session_id` UUID를 `localStorage`에 영구 저장 (기존 재생 `session_key`와 **통합**) | `client/src/lib/nexSession.ts` |
| 2 | 앱 부트 시 `session_start` 1회 + UTM·landing 저장 | `client/src/App.tsx` 또는 `Layout.tsx` |
| 3 | 라우트 변경마다 `page_view` | `App.tsx` wouter `useLocation` |
| 4 | 모든 API·이벤트에 `X-Nex-Session` 헤더 | `queryClient.ts` |
| 5 | `analytics_events` 테이블 + `POST /api/analytics/event` | `shared/schema.ts`, `server/routes.ts`, `server/storage.ts` |
| 6 | 로그인 성공 시 동일 `session_id` 행에 `user_id` backfill | `server/auth.ts` → `mergeAnalyticsSessionToUser` |

**`user_activity_stats`는 삭제하지 않는다.** 집계 요약용(어드민 테이블)으로 유지하고, **퍼널의 source of truth는 `analytics_events`**.

---

### 11.2 “한 줄 집계 → 방문 순서·이탈” + 체류(머무름)

**문제:** `visit_count`만으로는 경로·이탈 지점 재구성 불가.

**해결 (수단 가리지 않음):**

| 레이어 | 수단 | 역할 |
|--------|------|------|
| **이벤트 로그** | `analytics_events` append-only | 순서·이탈·퍼널의 기본 |
| **체류 시간** | `page_view` 간격, 또는 `engagement_heartbeat` (30s, 배틀/재생 중) | “오래 머문” 구간 측정 |
| **제품** | 배틀 blind mode, Radio, 결과 공유, 승리 알림 | 실제 retention (분석만으로는 부족) |
| **요약 (선택)** | 일별 materialized view | 어드민 쿼리 속도 |

---

### 11.3 재생과 페이지 방문 연결

1. `session_start`에 `landing_path`, `utm_*`, `referrer_host`, `device_class` 저장.
2. play API 성공 시 서버에서 `track_play` 이벤트 기록.
3. `track_plays`에 `session_id` 컬럼 추가 (기존 `session_key`와 동일 값).
4. 퍼널: `session_start` → `page_view(/battle)` → `battle_vote` → `track_play` (같은 `session_id`).

---

### 11.4 배틀 중간 단계 + `battlesPlayedToday` 개선

**단계 이벤트:** `battle_genre_select` → `battle_start` (서버) → `battle_listen_complete` (a/b) → `battle_vote_phase` → `battle_vote` → `battle_result_view`.

**DB:** `battles.requester_user_id` 추가.

**`/api/stats/today` (삭제 아님, 필드 분리):**

| 필드 | 의미 |
|------|------|
| `battleStartsToday` | 오늘 생성된 배틀 (기존 `battlesPlayedToday`) |
| `battlesVotedToday` | 오늘 1표 이상 있는 distinct battle |
| `battleFullListensToday` | A+B listen 완료한 user+battle 수 |

---

### 11.5 일별 스냅샷 — **삭제하지 않음**

B2B export·플랫폼 KPI용. 개인 퍼널과 **역할이 다를 뿐** 무용이 아님. 퍼널은 `analytics_events`로 별도 구축.

---

### 11.6 리스너 퍼널 UI

Admin **Funnels** 탭: window(7d) + utm 필터 + 단계별 count/% + drop-off + Top sources.

API: `GET /api/admin/funnels?window=7d&funnel=listener_battle&utm_source=qr`

---

### 11.7 방문 ping 개선

게스트 포함 `session_start`로 대체. 로그인 사용자는 추가로 `recordUserVisit`. UTM·landing 동시 저장.

---

### 11.8 Identity merge

OAuth 성공 후 `UPDATE analytics_events SET user_id = … WHERE session_id = … AND user_id IS NULL`.

---

### 11.9 Attribution (QR·UTM·landing)

`session_start.properties`: `landing_path`, `landing_url`, `utm_source/medium/campaign`, `referrer_host`.

QR 예: `/battle?utm_source=qr&utm_medium=flyer&utm_campaign=booth-2026-06`

---

### 11.10 가입·Activation

이벤트: `auth_page_view` → `auth_complete` → `profile_complete` → `activation_first_battle_vote` / `activation_first_track_play` (user당 1회, 서버).

---

### 11.11 크리에이터 퍼널

`track_submit` → `track_approved` → `track_first_battle` → `track_chart_promoted` — Admin Funnels 두 번째 차트.

---

### 11.12 PostHog / Plausible

Dual write: `POST /api/analytics/event` + `posthog.capture()`. Plausible은 페이지뷰 보조.

환경변수: `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`.

---

### 11.13 어드민 코호트·전환율

- `GET /api/admin/funnels` — 단계 퍼널  
- `GET /api/admin/cohorts` — 가입 주별 retention  
- `GET /api/admin/attribution` — utm_source × 전환  

---

## 12. 구현 로드맵 (4 스프린트)

| Sprint | 내용 |
|--------|------|
| **1** | `analytics_events`, session_id, session_start, page_view, merge on login |
| **2** | Battle 이벤트, requester_user_id, stats/today 필드 분리, QR UTM |
| **3** | Admin Funnels API + UI, activation, auth/onboarding 이벤트 |
| **4** | PostHog, creator funnel, cohorts, heartbeat (선택) |

---

## 13. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-06-17 | 초안: 현황·갭·퍼널 정의·`analytics_events` 설계·우선순위 |
| 2026-06-17 | §11–12: 갭별 해결안·4 스프린트 로드맵 |


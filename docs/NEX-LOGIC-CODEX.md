# NEX 플랫폼 로직 법전 (NEX Logic Codex)

**문서 목적.** 본 문서는 NEX(nex-project) 코드베이스에 구현된 비즈니스·기술 규칙을 **단일 기준 문서**로 보관한다. 구현과 불일치할 경우 **코드가 우선**이며, 변경 시 본 문서를 갱신하는 것을 원칙으로 한다.

**적용 범위.** `client/`, `server/`, `shared/` 및 이들이 의존하는 설정·스크립트.

---

## 제0장 총칙

### 제0조 (플랫폼의 성격)

NEX는 AI 생성 음악 크리에이터를 위한 **차트·배틀·프로필·트랙 공개** 플랫폼이다. 트랙은 외부 스트리밍 URL(YouTube, Suno, SoundCloud 등)을 **임베드**하여 앱 내에서 재생하는 모델을 따른다.

### 제1조 (기술 스택)

- **프론트:** React, Vite, Wouter, TanStack Query, Tailwind 계열 UI.
- **백엔드:** Express(Node), `tsx` 실행, Drizzle ORM, PostgreSQL.
- **인증:** Passport(Google OAuth), express-session, `sessions` 테이블 저장.
- **공유 코드:** `shared/schema.ts`, `shared/constants.ts`, `shared/routes.ts` 등.

### 제2조 (실행·포트 관습)

- 개발 시 서버·클라이언트 분리 가능; `server/index.ts`에서 CORS 허용 목록에 `localhost:5001`, `5002`, `5173` 등이 기본 포함된다.
- 정적 빌드는 프로덕션에서 Express가 서빙할 수 있다.

---

## 제1편 신원·권한·프로필

### 제3조 (사용자 저장)

- `users` 테이블: OAuth로 수집된 `id`, `email`, 이름, 아바타 URL 등.
- `profiles` 테이블: 플랫폼 표시용 `username`, `role`, `creatorApplicationStatus`, `country`, `bio`, `avatarUrl` 등. `userId`와 1:1.

### 제4조 (역할 Role)

- **`listener`:** 기본. 차트 열람·일부 상호작용.
- **`creator`:** 트랙 업로드·내 트랙 관리 등 크리에이터 스튜디오 권한.
- **`admin`:** 운영자. 프로덕션에서는 **파운더 이메일**과 일치할 때만 실질 관리자로 인정되는 규칙이 `routes.ts`·`auth.ts`에 병존한다.

`shared/constants.ts`의 `isCreatorProfileRole` / `isCreatorStudioRole`로 UI·API 일부가 제한된다.

### 제5조 (파운더·관리자)

- 기본 파운더 이메일은 `NEX_FOUNDER_ADMIN_EMAIL` 상수에 정의되며, 서버 환경변수 `NEX_FOUNDER_ADMIN_EMAIL`로 덮어쓸 수 있다.
- `isFounderAdminEmail`이 참이면 프로필 동기화 시 `admin` 부여 등 특권이 적용될 수 있다.
- 비프로덕션에서는 DB `role === "admin"`이 일부 경로에서 허용될 수 있으나, 프로덕션에서는 파운더 이메일 검증이 강화된다.

### 제6조 (크리에이터 신청)

- `creatorApplicationStatus`: `none` | `pending` | `rejected`.
- 리스너가 크리에이터를 요청하면 `pending` 등으로 두고, 관리자 승인 후 `creator`로 전환하는 흐름이 구현되어 있다.

### 제7조 (온보딩·국가)

- `OnboardingModal`, `CountrySelectModal` 등으로 프로필 보강을 유도한다.

### 제8조 (세션 노출)

- 세션 사용자(`SessionUser`)에는 `id`, `email`, `username`, 정규화된 `role` 등이 포함된다. 비밀번호 로컬 저장은 사용하지 않고 OAuth 중심이다.

---

## 제2편 데이터 모형 (요약)

### 제9조 (트랙 `tracks`)

핵심 필드(일부):

- **식별·소유:** `id`, `creatorId` → `profiles.id`.
- **콘텐츠:** `title`, `audioUrl`(필수), `mvUrl`(선택), `coverImageUrl`, `lyrics`, `description`, `artistName`.
- **분류:** `genre`, `aiTool`, `trackType`(`audio` | `video` 등).
- **상태:** `status`(예: `PENDING`, `PUBLISHED`, `REJECTED`), `isDeleted`(소프트 삭제), `archivedAt`.
- **점수·통계:** `listenerVotes`, `neoScore`, `rankingScore`, `playCount`, `aiCraftScore`, `winStreak` 등.
- **메타:** `aiPrompt`(창작 의도·프롬프트), `claimableByCreators`(시드 트랙 클레임 허용).
- **시간:** `releaseDate`, `createdAt`, `lastPlayedAt`.

### 제10조 (집계 `track_metrics`)

트랙별 `likesCount`, `playsCount`, `completedPlaysCount`, `uniqueListenersCount`, `battleTotalCount`, `battleWinsCount`, `followerCount` 등 **빠른 랭킹 재계산**용 카운터.

### 제11조 (투표·좋아요·재생)

- `votes`: 사용자당 트랙에 대한 차트 투표(중복 정책은 API 구현 따름).
- `likes`: 좋아요.
- `track_plays`: 스팸 방지·통계용 재생 기록(`completed` 여부 포함).

### 제12조 (배틀)

- `battles`: 같은 `genre`의 두 트랙 `trackAId`, `trackBId`, 득표수, `winnerId`.
- `battle_votes`: **배틀당 사용자 1회** 투표.

### 제13조 (댓글·팔로우·클레임)

- `comments`: 트랙 댓글.
- `follows`: 팔로워 `userId` → 크리에이터 `creatorProfileId`.
- `track_claim_requests`: 크리에이터의 트랙 소유권 이전 요청(관리자 처리).

---

## 제3편 상수·운영 한도

### 제14조 (`shared/constants.ts`)

| 기호 | 값 | 의미 |
|------|-----|------|
| `MAX_BATTLE_ROUNDS` | 5 | 리스너당 UTC 일 **완료 배틀** 투표 상한(주석 기준). |
| `MAX_ACTIVE_TRACKS_PER_CREATOR` | 2 | 비아카이브 활성 트랙 최대 개수. |
| `MIN_ACTIVE_HOURS` | 48 | 아카이브 전 최소 공개 시간. |
| `ROTATION_COOLDOWN_HOURS` | 24 | 아카이브 후 새 트랙 제출 쿨다운. |
| `MIN_TRACK_ARTISTIC_INTENT_CHARS` | 50 | 제출 `aiPrompt` 최소 길이. |
| `MAX_TRACK_ARTISTIC_INTENT_CHARS` | 2000 | 동 필드 최대 길이. |
| `MAX_CREATOR_AI_PROMPT_EDITS` | 2 | **등록 이후** 크리에이터가 `aiPrompt`를 바꿀 수 있는 횟수(최초 제출은 포함하지 않음). |
| `HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS` | 48 | 첫 번째 크리에이터 수정 이후, **두 번째(마지막) 수정**까지 대기 시간. |

- DB: `tracks.ai_prompt_edit_count`, `tracks.ai_prompt_last_edited_at`로 위 정책을 집계한다. **관리자**가 `PATCH /api/tracks/:id`로 `aiPrompt`를 바꿀 때는 이 카운터를 올리지 않는다.

### 제15조 (차트 쿼리 공통)

- `publicAudioChartSearchParams(limit)`는 Music 차트·Radio 등에서 동일한 정렬·필터 형태(`sortBy=rankingScore`, `trackType=audio` 등)를 쓰기 위한 헬퍼다.

---

## 제4편 API 접근 통제

### 제16조 (`server/api-access.ts`)

- `/api` 하위는 기본 **인증 필요**.
- **공개 GET(무인증 허용)** 예: `/api/tracks`, `/api/tracks/rising`, `/api/creators`, `/api/stats/today`, `/api/battles/recent`, `/api/battles/genres`, `/api/battles/:id`, `/api/profiles/:id`, `/api/profiles/by-username/...`, `/api/profiles/:id/tracks`, `/api/tracks/:id`, `/api/tracks/:id/comments`, **`/api/suno/resolve`** (Suno 단축 링크 → UUID 해석).
- 인증 부트스트랩 경로: 로그인·콜백·로그아웃 등.
- `/api/admin/*`: 인증 + **관리자** 검사.

### 제17조 (다국어 메시지)

- `server/api-i18n.ts`의 `apiMsg`로 한/영 병기 메시지를 많은 응답에 사용한다.

---

## 제5편 트랙 생명주기·제출

### 제18조 (제출 경로)

- **공개 제출:** `POST /api/tracks/submit` 등(폼: `SubmitTrack.tsx`) — 의도·프롬프트 길이 검증, URL 중복 검사(`GET /api/tracks/check-url`), 스팸성 텍스트 휴리스틱(`looksLikeGibberish`) 등.
- **크리에이터 업로드:** `POST /api/tracks` 및 관련 편집 API — 활성 트랙 수·쿨다운·권한 검사.
- **`PATCH /api/tracks/:id`:** 관리자는 메타데이터 전체(+ `aiPrompt`) 수정 가능(크리에이터용 2회·48h 규칙 **미적용**). **소유 크리에이터**는 본인 트랙에 대해 **`aiPrompt`만** JSON으로 보내 수정 가능하며, 위 한도·쿨다운이 적용된다.

### 제19조 (상태 전이)

- 신규 트랙은 `PENDING`일 수 있으며, 관리자 `POST /api/admin/tracks/:id/review`로 `PUBLISHED` / `REJECTED` 처리.
- `isDeleted === true`인 트랙은 공개 리스트에서 제외.

### 제20조 (아카이브·로테이션)

- 크리에이터는 정책에 따라 트랙을 아카이브하고, `ROTATION_COOLDOWN_HOURS` 경과 후 새 트랙을 올릴 수 있다(서버에서 거절 시 429 등).

---

## 제6편 스트리밍·재생 로직

### 제21조 (분류 `classifyStreamingSource`)

`client/src/lib/streamingEmbed.ts`에서 URL을 `youtube` | `soundcloud` | `suno` | `vimeo` | `udio` | `other`로 분류한다.

### 제22조 (임베드 URL 생성)

- **YouTube:** `extractYoutubeId`로 11자 ID 추출 후 JS API 플레이어(`YoutubePlayer`) 또는 iframe embed.
- **SoundCloud:** `w.soundcloud.com/player` 위젯 URL로 래핑.
- **Vimeo / Udio:** 각각 규칙에 맞는 player URL 또는 원 URL.
- **Suno (핵심 규칙):**
  - 공식 임베드는 **`https://suno.com/embed/{곡UUID}?autoplay=...`** 형태만 유효하다.
  - **`suno.com/s/{단축코드}`** 는 `embed/단축코드`로 열면 **404**이므로, 동기 로직만으로는 임베드 불가.
  - URL에 이미 `/song/{uuid}` 가 있으면 UUID를 추출해 즉시 embed URL을 만든다.

### 제23조 (Suno 서버 해석)

- `server/suno-resolve.ts`: 허용된 Suno 호스트만 `fetch`로 따라가며, 최종 URL에서 `/song/{uuid}` 패턴을 추출한다.
- `GET /api/suno/resolve?url=...` → `{ songUuid }` 또는 오류 메시지. **공개 GET**.

### 제24조 (클라이언트 통합 훅)

- `usePlayableStreamingSrc`: 동기로 embed URL을 만들 수 있으면 즉시 사용; Suno이고 실패 시 `/api/suno/resolve` 호출 후 `buildSunoEmbedFromCanonicalUuid`로 `src` 확정.
- 적용처 예: `TrackPlayModal`, `TrackFeedModal`, `WorkDetail`, `Radio`, `Battle`, `SubmitTrack`(미리보기 판정).

### 제25조 (플레이어 UI 정책)

- Suno 트랙에 대해 **NEX 자체 “Suno로 열기” 외부 링크 버튼은 제거**되었다. 재생은 앱 내 iframe 임베드로만 유도한다(Suno 위젯 내부 UI는 제3자 제공).

### 제26조 (`buildIframeEmbedUrl` 레거시)

- `streamingEmbed` 기반; Suno 단축 링크처럼 동기 해석 불가 시 **빈 문자열**을 반환해 잘못된 공유 페이지를 iframe에 넣지 않도록 한다. 실제 재생 경로는 훅 사용을 권장.

---

## 제7편 배틀·라디오·차트 UI

### 제27조 (배틀 `Battle.tsx`)

- 장르 선택 → 두 트랙 프리뷰(YouTube JS API / 직접 오디오 / iframe) → 투표 → 결과.
- 배틀 투표 일일 한도 등은 서버와 연동.

### 제28조 (라디오 `Radio.tsx`)

- 차트에서 셔플 플레이리스트; 현재 트랙의 `musicVideoUrl || audioUrl`을 재생 소스로 사용.
- Suno 등은 `usePlayableStreamingSrc`로 처리.

### 제29조 (차트 페이지)

- `Music`, `New`, `Rising`, `MusicVideo` 등은 각각 다른 쿼리/정렬로 `/api/tracks` 계열을 호출한다.
- 행 컴포넌트(`MusicRow`, `MVCard` 등)에서 `TrackPlayModal` / `TrackFeedModal`을 연다.

### 제30조 (트랙 상세 `WorkDetail`)

- `currentTrackId`로 플레이어 상태 관리; 이전/다음 트랙, 자동재생, 20초 재생 시 플레이 기록 등.
- 비YouTube 스트림은 `rawForStreaming` 선택 로직(MV 우선·동기 embed 가능·Suno 호스트) 후 훅으로 `playableSrc` 확보.

---

## 제8편 프롬프트·의도 표시

### 제31조 (`buildIntentOverlay`)

- `client/src/lib/intentOverlay.ts`: `aiPrompt`를 정리하고, 짧거나 반복·엔트로피 낮은 텍스트에 `showQualityWarning`을 켠다.
- 모달·상세의 “Prompt Recipe” 블록에 사용.

### 제32조 (제출 시 검증)

- 서버 `looksLikeGibberish` 등으로 제목/의도 필드의 무의미 반복을 거른다.

---

## 제9편 공개 응답·프라이버시

### 제33조 (`sanitize*`)

- `sanitizePublicProfileForDirectory`, `sanitizePublicProfileDetail`, `sanitizeTrackDetailForPublic` 등에서 응답에서 `userId` 등을 제거해 공개 노출을 제한한다.
- `sanitizeBattleForPublic`은 배틀 내 트랙 객체에 동일 계열 처리를 적용한다.

---

## 제10편 클라이언트 라우팅

### 제34조 (`App.tsx` 주요 경로)

| 경로 | 화면 |
|------|------|
| `/` | Home |
| `/new`, `/music`, `/music-video`, `/rising` | 리스트·차트 계열 |
| `/track/:id` | 트랙 상세(WorkDetail) |
| `/mv/:id` | MV 상세 |
| `/battle` | 배틀 |
| `/radio` | 넥스 라디오 |
| `/submit`, `/submit-track` | 트랙 제출 |
| `/upload`, `/my-tracks` | 크리에이터 스튜디오 |
| `/creators`, `/profile/*` | 프로필 |
| `/admin`, `/admin-login` | 관리 |
| `/auth` | 인증 |

`Layout`이 공통 네비·프레임을 제공한다.

---

## 제11편 기타 서버 모듈

### 제35조 (`storage.ts`)

- Drizzle 기반 CRUD: 프로필, 트랙, 배틀, 댓글, 메트릭 갱신 등. `routes.ts`가 대부분의 비즈니스 분기를 담고 storage는 데이터 접근에 가깝다.

### 제36조 (`seed.ts`)

- `ENABLE_SEED_ENDPOINT` 및 토큰으로만 동작하는 시드 엔드포인트와 연동. 프로덕션에서는 비활성이 기본.

### 제37조 (스크립트)

- `scripts/reset-test-stats.ts`, `audit-track-data.ts` 등 운영·감사용.

---

## 부칙

### 제38조 (환경변수 예시)

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, 세션 시크릿, DB URL, `NEX_FOUNDER_ADMIN_EMAIL`, `CORS_ORIGINS`, 시드 관련 토큰 등.

### 제39조 (문서 개정)

- 기능 추가·정책 변경 시 담당자는 **동일 디렉터리** `docs/NEX-LOGIC-CODEX.md`를 갱신하고, PR 설명에 “Codex 갱신”을 명시하는 것을 권장한다.

---

*본 법전은 저장소 상태를 기준으로 작성되었으며, 세부 수치·엔드포인트는 `shared/constants.ts`, `server/routes.ts`, `server/api-access.ts`를 최종 확인할 것.*

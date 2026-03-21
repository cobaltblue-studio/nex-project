# DB Integration & UI Title Polish

## What & Why
기존 스키마에 Comments 테이블을 추가하고, `POST /api/vote`와 `GET /api/creators` API 엔드포인트를 추가한다. 그리고 BATTLE 페이지에 "BATTLE ARENA" 타이틀, CREATORS 페이지 타이틀 크기를 다른 페이지와 통일한다.

## Done looks like
- `comments` 테이블이 DB 스키마에 추가되고 마이그레이션이 적용된다.
- `POST /api/vote` 엔드포인트로 1:1 배틀 투표 결과를 기록할 수 있다 (battleId + trackId body).
- `GET /api/creators` 엔드포인트가 크리에이터 목록(role이 "nex" 또는 "founder"인 프로필)을 반환한다.
- BATTLE 페이지 상단에 다른 페이지(/new 등)와 동일한 스타일의 "BATTLE ARENA" 섹션 타이틀이 표시된다.
- CREATORS 페이지의 "NEX CREATORS" 타이틀 폰트 크기가 다른 페이지 타이틀과 동일한 크기로 줄어든다.
- 모든 메인 페이지 타이틀이 동일한 정렬과 폰트 크기를 가진다.
- 기존 다크 테마 스타일은 변경되지 않는다.

## Out of scope
- 기존 `profiles`, `tracks`, `battles`, `votes`, `follows` 테이블 구조 변경
- 인증 시스템 변경
- Comments UI (백엔드 스키마 + API만 준비)

## Tasks
1. **Comments 테이블 추가** — `shared/schema.ts`에 `comments` 테이블을 추가한다 (id, userId, trackId, content, createdAt). Drizzle push로 마이그레이션을 적용한다.

2. **`POST /api/vote` 엔드포인트** — `server/routes.ts`에 `/api/vote` POST 엔드포인트를 추가한다. body에서 `battleId`와 `trackId`를 받아 기존 `storage.recordBattleVote()`를 호출한다. 이미 존재하는 `/api/battles/:id/vote`와 기능은 동일하나 단일 엔드포인트로 노출한다.

3. **`GET /api/creators` 엔드포인트** — `server/routes.ts`에 `/api/creators` GET 엔드포인트를 추가한다. role이 "nex" 또는 "founder"인 프로필을 `storage`를 통해 반환한다. `server/storage.ts`에 `getCreators()` 메서드를 추가한다.

4. **BATTLE 페이지 타이틀 추가** — `client/src/pages/Battle.tsx`에서 페이지 상단에 "BATTLE ARENA" 섹션 타이틀을 /new 페이지와 동일한 스타일(폰트 크기, 네온 글로우 등)로 추가한다.

5. **CREATORS 페이지 타이틀 크기 통일** — `client/src/pages/CreatorList.tsx`에서 "NEX CREATORS" 타이틀의 폰트 크기 클래스를 다른 페이지(예: Battle, Music 등)의 타이틀과 동일하게 조정한다.

## Relevant files
- `shared/schema.ts`
- `server/routes.ts`
- `server/storage.ts`
- `client/src/pages/Battle.tsx`
- `client/src/pages/CreatorList.tsx`
- `client/src/pages/New.tsx`

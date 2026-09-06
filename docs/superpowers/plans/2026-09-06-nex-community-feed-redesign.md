# NEX Community Feed Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reddit형 커뮤니티를 SNS형 최신 피드로 바꾸고, 트랙 없이 글 쓸 수 있게 하며, 내용 박스는 아이보리로 밝힌다.

**Architecture:** DB의 `attached_track_id`는 이미 nullable이다. 앱 강제(`ATTACHED_TRACK_REQUIRED`)만 제거한다. `post_kind`(`talk`|`track`|`discussion`)를 컬럼으로 추가해 칩 UX를 저장한다. 카테고리 4종은 필터 태그로 유지한다. UI는 `/community` 단일 피드 + 글쓰기 시트 + 딥링크 상세, 반응은 하트·댓글·공유만.

**Tech Stack:** React, TanStack Query, Express, Drizzle, PostgreSQL/Neon, `tsx --test`, Tailwind

**Design Reference:** `docs/superpowers/specs/2026-09-06-nex-community-feed-redesign-design.md`

**Founder Approval:** 스펙·본 계획 작성까지 승인. **코드 수정·커밋·푸시·배포는 별도 승인 후에만.**

## Global Constraints

- 기존 `community_posts` / likes / comments **삭제·데이터 파기 금지**
- 트랙 모달 댓글 통합·팔로잉 탭·DM·스토리·멘션·알고리즘 **이번 계획 밖**
- 페이지 바깥 배경은 NEX 다크 유지, **내용 박스 안만 아이보리**
- 아이보리 예시 토큰: `--community-ivory: #F7F1E3`, 본문 글자 `#1C1917` (zinc-900 계열). AI 기본 cream+테라코타 룩으로 전체 사이트를 바꾸지 말 것
- Production 배포·main push는 대표님 명시 승인 후에만
- 테스트는 DB 없이 가능한 순수 함수/유닛을 우선. storage 통합 테스트가 필요하면 기존 패턴만 따름

---

## File map

| File | Role |
|------|------|
| `shared/community.ts` | `POST_KINDS`, 아이보리 상수, seed 노출 정책 헬퍼 |
| `shared/schema.ts` | `communityPosts.kind` 컬럼 |
| `migrations/2026-09-06_community_post_kind.sql` | `post_kind` 추가 + 백필 |
| `server/storage.ts` | `createCommunityPost` 트랙 선택, kind/title 규칙 |
| `server/routes.ts` | POST body에 `kind` 수용, ATTACHED_TRACK_REQUIRED 응답 정리 |
| `server/communityFeed.test.ts` | kind/title/track 규칙 단위 테스트 |
| `client/src/pages/Community.tsx` | 피드 IA·사이드바 제거·시드 폴백 제거 |
| `client/src/components/CommunityFeedCard.tsx` | 아이보리 카드, 하트/댓글/공유 |
| `client/src/components/CommunityComposer.tsx` | 토크 기본 칩 글쓰기 |
| `client/src/components/CommunityPostPanel.tsx` | 상세 패널 아이보리 + 딥링크 정합 |
| `package.json` | `test:community` 스크립트 |

---

### Task 1: Shared kinds + pure validation helpers (TDD)

**Files:**
- Modify: `shared/community.ts`
- Create: `server/communityFeed.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `COMMUNITY_POST_KINDS = ["talk","track","discussion"] as const`
  - `type CommunityPostKind = typeof COMMUNITY_POST_KINDS[number]`
  - `isCommunityPostKind(value: string): value is CommunityPostKind`
  - `normalizeCommunityPostInput(input: { kind: string; title: string; body: string; attachedTrackId?: number \| null; category?: string }): { kind: CommunityPostKind; title: string; body: string; attachedTrackId: number \| null; category: CommunityCategorySlug }`
  - Throws codes: `INVALID_KIND`, `EMPTY_BODY`, `EMPTY_TITLE`, `TITLE_TOO_LONG`, `BODY_TOO_LONG`, `INVALID_CATEGORY`, `ATTACHED_TRACK_NOT_FOUND` (track id format only; existence stays in storage)

**Rules to encode in `normalizeCommunityPostInput`:**
1. `body` trim 후 비면 `EMPTY_BODY`
2. `kind` 기본 `"talk"` (빈 값이면 talk)
3. `talk` / `track`: `title` 비면 body 첫 줄(또는 앞 80자)로 title 자동 생성. 그래도 비면 `EMPTY_TITLE`
4. `discussion`: title 필수 (자동 생성 없음)
5. `attachedTrackId` 없거나 NaN이면 `null` — **절대 `ATTACHED_TRACK_REQUIRED` 던지지 않음**
6. `category` 없거나 잘못되면 기본 `"track-share"`; 유효 slug면 유지
7. title ≤ 140, body ≤ 5000

- [ ] **Step 1: Write failing tests**

`server/communityFeed.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCommunityPostInput } from "../shared/community";

describe("normalizeCommunityPostInput", () => {
  it("allows talk post with body only and no track", () => {
    const out = normalizeCommunityPostInput({
      kind: "talk",
      title: "",
      body: "오늘 훅 아이디어 메모",
      attachedTrackId: null,
    });
    assert.equal(out.kind, "talk");
    assert.equal(out.attachedTrackId, null);
    assert.ok(out.title.length > 0);
    assert.equal(out.category, "track-share");
  });

  it("allows track kind without attachedTrackId", () => {
    const out = normalizeCommunityPostInput({
      kind: "track",
      title: "자랑할 곡",
      body: "아직 첨부 전",
      attachedTrackId: null,
      category: "track-share",
    });
    assert.equal(out.attachedTrackId, null);
  });

  it("requires title for discussion", () => {
    assert.throws(
      () =>
        normalizeCommunityPostInput({
          kind: "discussion",
          title: "  ",
          body: "본문만 있음",
        }),
      /EMPTY_TITLE/,
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx tsx --test server/communityFeed.test.ts
```

Expected: FAIL (`normalizeCommunityPostInput` missing)

- [ ] **Step 3: Implement helpers in `shared/community.ts`**

Export kinds, `isCommunityPostKind`, `normalizeCommunityPostInput` per rules above. Keep existing `COMMUNITY_CATEGORIES` / seed constants.

Also export:

```ts
export const COMMUNITY_IVORY = "#F7F1E3";
export const COMMUNITY_IVORY_INK = "#1C1917";
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx tsx --test server/communityFeed.test.ts
```

- [ ] **Step 5: Add script + commit (only after Founder code-approval)**

```json
"test:community": "tsx --test server/communityFeed.test.ts"
```

```bash
git add shared/community.ts server/communityFeed.test.ts package.json
git commit -m "feat(community): add post kind normalization without required track"
```

---

### Task 2: Schema + migration for `post_kind`

**Files:**
- Modify: `shared/schema.ts` (`communityPosts` table ~218–231)
- Create: `migrations/2026-09-06_community_post_kind.sql`

**Interfaces:**
- Produces: `communityPosts.kind` mapped to column `post_kind`, type `text`, notNull, default `'talk'`

- [ ] **Step 1: Add column to Drizzle schema**

In `communityPosts`:

```ts
kind: text("post_kind").notNull().default("talk"),
```

Place after `category`.

- [ ] **Step 2: Write migration SQL**

```sql
ALTER TABLE "community_posts"
  ADD COLUMN IF NOT EXISTS "post_kind" text NOT NULL DEFAULT 'talk';

UPDATE "community_posts"
SET "post_kind" = CASE
  WHEN "attached_track_id" IS NOT NULL THEN 'track'
  ELSE 'talk'
END
WHERE "post_kind" = 'talk' AND "attached_track_id" IS NOT NULL;
```

Note: 기존 글은 트랙 있으면 `track`, 없으면 `talk`로 백필. `discussion`은 신규부터.

- [ ] **Step 3: Commit (after approval)**

```bash
git add shared/schema.ts migrations/2026-09-06_community_post_kind.sql
git commit -m "feat(community): add post_kind column for feed card types"
```

---

### Task 3: Storage + API — optional track, kind, empty-body title

**Files:**
- Modify: `server/storage.ts` — `createCommunityPost` (~2508–2590) and list/get select shapes to include `kind`
- Modify: `server/routes.ts` — `POST /api/community/posts` (~403–451)
- Modify: `server/communityFeed.test.ts` — keep pure tests; add route-level only if project already has route test harness (otherwise skip)

**Interfaces:**
- Consumes: `normalizeCommunityPostInput` from `shared/community.ts`
- Produces: `createCommunityPost` accepts `kind?`, no longer throws `ATTACHED_TRACK_REQUIRED`
- List/get rows include `kind: string`

- [ ] **Step 1: Update `createCommunityPost`**

Replace title/body/track gate with:

```ts
const normalized = normalizeCommunityPostInput({
  kind: input.kind ?? "talk",
  title: input.title,
  body: input.body,
  attachedTrackId: input.attachedTrackId,
  category: input.category,
});
// then existing URL validation on externalUrl
// if normalized.attachedTrackId: existence check (ATTACHED_TRACK_NOT_FOUND)
// insert including kind: normalized.kind, category: normalized.category, title, body, attachedTrackId
```

Delete the line:

```ts
if (!attachedTrackId) throw new Error("ATTACHED_TRACK_REQUIRED");
```

Keep owner-first-note pin logic **only when** `attachedTrackId` is non-null.

- [ ] **Step 2: Update POST route**

```ts
const postId = await storage.createCommunityPost({
  authorUserId: userId,
  kind: typeof req.body?.kind === "string" ? req.body.kind : "talk",
  category: typeof req.body?.category === "string" ? req.body.category : "track-share",
  title: String(req.body?.title ?? ""),
  body: String(req.body?.body ?? ""),
  attachedTrackId: req.body?.attachedTrackId ?? null,
  externalUrl: req.body?.externalUrl ?? null,
});
```

Map new errors: `EMPTY_BODY`, `INVALID_KIND`, `INVALID_CATEGORY`. Remove or keep dead `ATTACHED_TRACK_REQUIRED` branch (prefer remove).

Relax category check: invalid/missing → let normalizer default (or accept only if provided).

- [ ] **Step 3: Include `kind` in list/get mapped objects**

Wherever listCommunityPosts / getCommunityPost builds the public row, add `kind: row.kind` (default `"talk"` if null during rollout).

- [ ] **Step 4: Run unit tests**

```bash
npm run test:community
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/storage.ts server/routes.ts
git commit -m "feat(community): allow posts without attached track"
```

---

### Task 4: Ivory feed card + composer components

**Files:**
- Create: `client/src/components/CommunityFeedCard.tsx`
- Create: `client/src/components/CommunityComposer.tsx`
- Modify: `client/src/components/CommunityPostPanel.tsx` (ivory + remove upvote chrome if present)

**Interfaces:**
- `CommunityFeedCard` props: post object from API (`id`, `kind`, `title`, `body`, `category`, `attachedTrack`, `likesCount`, `commentsCount`, `viewerHasLiked`, `authorDisplayName`, `createdAt`, …), callbacks `onOpen`, `onLike`, `onShare`, `onComment`
- `CommunityComposer` props: `open`, `onOpenChange`, `onCreated`, locale copy
- Visual: card/composer/panel content shell `backgroundColor: COMMUNITY_IVORY` or Tailwind arbitrary `bg-[#F7F1E3]`, text `text-stone-900`, muted `text-stone-600`, border `border-stone-300/80`

- [ ] **Step 1: Build `CommunityFeedCard`**

Layout:
1. Header: avatar/name/time + small kind badge (`토크`/`트랙`/`토론`) + optional category tag
2. Title (discussion) or body-first for talk
3. Optional track row (cover + title + link) — **same visual weight**, not a huge hero
4. Footer only: Heart · Comment · Share (no ChevronUp/Down)

- [ ] **Step 2: Build `CommunityComposer`**

- Default kind `talk`
- Chips: talk / track / discussion
- Talk: textarea first; title hidden (server auto)
- Track: textarea + track picker; empty track allowed; show strong empty-state hint copy
- Discussion: title + body + category select
- Submit enabled when body non-empty (discussion also needs title)
- POST `/api/community/posts` with `{ kind, title, body, category, attachedTrackId }`

- [ ] **Step 3: Restyle `CommunityPostPanel` ivory + heart-only reactions**

- [ ] **Step 4: Manual UI check locally (no Production)**

- [ ] **Step 5: Commit**

```bash
git add client/src/components/CommunityFeedCard.tsx client/src/components/CommunityComposer.tsx client/src/components/CommunityPostPanel.tsx
git commit -m "feat(community): add ivory feed card and composer"
```

---

### Task 5: Wire `/community` page — single feed IA

**Files:**
- Modify: `client/src/pages/Community.tsx`

**Behavior checklist (spec acceptance):**
1. Remove category sidebar as primary IA
2. Top: title + filter chips (전체 + category slugs) + compose CTA
3. Feed: latest sort only by default (`sort=latest`)
4. **Do not** render `COMMUNITY_SYSTEM_SEED_POSTS` as fake feed rows when API empty — show empty state CTA instead
5. Negative/seed ids not likeable
6. `/community/:id` opens detail (existing route) with shareable URL; back closes to feed
7. Keep admin pin/hide entry points accessible without restoring Reddit chrome

- [ ] **Step 1: Replace list UI with `CommunityFeedCard` map**

- [ ] **Step 2: Replace create dialog with `CommunityComposer`**

- [ ] **Step 3: Delete upvote column UI and duplicate heart confusion**

- [ ] **Step 4: Remove seed-fallback feed injection block** (the `COMMUNITY_SYSTEM_SEED_POSTS.filter...` mapped posts)

- [ ] **Step 5: Smoke locally**

- `/community` looks like a feed on ivory cards
- Create talk with no track → 201
- Create track kind with no track → 201
- Like / comment / share still work
- Open `/community/<id>` deep link

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Community.tsx
git commit -m "feat(community): ship SNS-style ivory feed page"
```

---

### Task 6: Minimal notifications (comment + like on own post)

**Files:**
- Modify: `server/storage.ts` — after `addCommunityComment` and `toggleCommunityPostLike` when newly liked

**Rules:**
- If actor !== post author, `createNotification` with `href: /community/{postId}`
- Types: `community_comment`, `community_like` (strings)
- No mention system

- [ ] **Step 1: Wire comment notification**
- [ ] **Step 2: Wire like notification only on like=true transition**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(community): notify authors on comment and like"
```

If notification UI already lists unknown types safely, done. If it filters allowlist, add the two types to that allowlist file (search `track_liked` for the pattern).

---

### Task 7: Verification + report (no deploy until asked)

- [ ] **Step 1: Run**

```bash
npm run test:community
npm run test:workers
```

Workers must still PASS (no regressions).

- [ ] **Step 2: Local smoke against acceptance list in the design memo**

- [ ] **Step 3: Blue report to Founder**

Include: commits, migration needed on Production, rollback note (`post_kind` column safe to keep; UI revert = previous commit), **do not deploy** until explicit approval.

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Single latest feed + slight track mix (time order, no forced inject) | 5 |
| A+B+C via card kinds / chips | 1–5 |
| Talk default compose | 4–5 |
| Track not required | 1, 3 |
| Text ≈ track visual weight | 4 |
| Like · comment · share only | 4–5 |
| Ivory box interiors with redesign | 4–5 |
| Migrate old posts, category as tags | 2–3, 5 filters |
| No fake seed feed | 5 |
| Deep link `/community/:id` | 5 |
| Notifications minimal | 6 |
| No follow/DM/story/track-modal merge | Out of scope |

## Placeholder scan

없음. 실행 전 **Founder 코드 승인** 게이트만 남음.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-09-06-nex-community-feed-redesign.md`.

코드는 아직 시작하지 않는다. 대표님 승인 후 실행 방식:

**1. Subagent-Driven (권장)** — 태스크마다 새 서브에이전트 + 중간 리뷰  
**2. Inline Execution** — 이 세션에서 순서대로 실행 + 체크포인트

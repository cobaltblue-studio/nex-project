/**
 * Seed community feed so newcomers feel activity (SNS-like).
 * Target: ~20 posts per category, each with likes + comments where possible.
 *
 * Usage: npm run seed:community
 * Requires DATABASE_URL. Safe to re-run: skips titles already present for same author.
 */
import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../server/db";
import { communityPosts, profiles, users } from "../shared/schema";
import { storage } from "../server/storage";
import {
  COMMUNITY_CATEGORIES,
  type CommunityCategorySlug,
  type CommunityPostKind,
} from "../shared/community";

const CREATOR_USERNAMES = ["kdh", "duckho", "cobaltblue9", "cobaltblue_studio_film", "slowpower"] as const;
type Creator = (typeof CREATOR_USERNAMES)[number];

const TARGET_PER_CATEGORY = 20;

const COMMENT_POOL = [
  "완전 공감해요. 저도 비슷한 시행착오 했어요.",
  "이 팁 바로 써볼게요. 감사!",
  "배틀에서 그런 포인트가 크게 작용하더라고요.",
  "프롬프트 한 줄만 바꿔도 분위기가 달라지네요.",
  "신규 분들한테 정말 도움 될 글입니다.",
  "outro 처리 팁 좋네요. 다음에 시험해볼게요.",
  "투표할 때 저도 첫 10초를 제일 봐요.",
  "NEX에서 이런 대화가 쌓이면 좋겠어요.",
  "솔직한 실패 공유 최고입니다.",
  "크레딧 표기 관례도 같이 정리하면 좋겠네요.",
];

type SeedSpec = {
  category: CommunityCategorySlug;
  kind: CommunityPostKind;
  title: string;
  body: string;
  authorUsername: Creator;
  daysAgo: number;
  likesFrom: Creator[];
  comments: { author: Creator; content: string }[];
};

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function buildSeeds(): SeedSpec[] {
  const out: SeedSpec[] = [];

  const topics: Record<CommunityCategorySlug, string[]> = {
    "track-share": [
      "첫 10초 훅을 바꾼 뒤 반응이 달라진 이야기",
      "브릿지만 손보고 올린 창작 노트",
      "드롭이 약할 때 바꾼 단어 두 개",
      "오디오/MV 버전을 나눈 이유",
      "배틀 전 스스로 체크하는 3가지",
      "실패작을 남기고 배운 점",
      "보컬을 뒤로 밀었더니 분위기가 산 경우",
      "outro를 fade 대신 cut으로 바꾼 실험",
      "장르 라벨보다 장면 키워드가 먹힌 날",
      "같은 곡을 세 번 재생성한 기록",
      "믹스에서 mid가 묻혀 다시 뽑은 이야기",
      "사람 손을 어디에 넣었는지 공개합니다",
      "차트 올리기보다 피드백이 목표였던 주",
      "짧은 intro가 연승에 도움 된 느낌",
      "텍스처 변화 한 번이 승부를 가른 경험",
      "가사 없이 멜로디만으로 설득하려 한 시도",
      "사이드체인만 키웠더니 펀치가 생긴 경우",
      "너무 붐비는 anthem 단어를 뺀 이유",
      "청취자가 떠올릴 장면을 한 줄로 적기",
      "크리에이터 노트에 남기고 싶은 제작 의도",
    ],
    prompts: [
      "Style 5줄 제한 루틴 공유",
      "BPM을 Style 첫 줄에 넣는 실험",
      "airy vocal을 장르별로 바꾸는 법",
      "짧게 vs 길게 프롬프트 실제 차이",
      "실패 프롬프트 세 개와 교훈",
      "80s synth 한 줄이 바꾼 결과",
      "Lyrics를 chorus부터 쓰는 순서",
      "instrumentation을 두 개만 적는 규칙",
      "whisper + heavy의 실패 케이스",
      "decade 키워드는 마지막에만",
      "같은 seed에서 contour가 고정될 때",
      "재현 가능한 팁 하나만 남기기",
      "툴 비교용 A/B 프롬프트 포맷",
      "vocal gender만 바꿨을 때",
      "four-on-the-floor를 붙인 BPM 표기",
      "cinematic 단어를 빼니 정체성이 선명해짐",
      "Style에 mood를 맨 끝에 두는 습관",
      "실험곡은 짧게, 대표곡은 길게",
      "프롬프트 공개 범위에 대한 생각",
      "오늘 바로 시험해볼 한 줄 레시피",
    ],
    "battle-talk": [
      "훅보다 편곡이 이긴 배틀을 봤나요?",
      "투표할 때 가장 먼저 듣는 구간",
      "장르 mismatch에서 역전한 경험",
      "연승 곡들의 공통점 추측",
      "MV vs 오디오 only 청취 경험",
      "배틀 참여 동기: 차트 vs 피드백",
      "20초 preview가 바꾸는 투표",
      "드럼 패턴 변화만으로 승부가 갈린 경우",
      "반복 청취 가치가 댓글에 자주 나오는 이유",
      "intro가 길면 불리한가",
      "보컬 입장이 15초 안에 오는 곡",
      "사운드 디자인 vs 멜로디, 어디를 보나요?",
      "배틀 직후 투표 이유를 남기면 좋을까",
      "장르 라벨보다 fresh함이 이긴 날",
      "하이햇만 바꿔도 느껴지는 차이",
      "믹스 밸런스가 깨지면 손이 안 가는 이유",
      "visual hook이 첫 vote에 미치는 영향",
      "낯선 리스너 반응이 더 소중한 이유",
      "연승 메일 받고 다시 들어온 경험",
      "배틀 토크가 차트를 투명하게 만드는 법",
    ],
    "help-ideas": [
      "커뮤니티에 더 있으면 좋은 주제는?",
      "신규 크리에이터 FAQ TOP3",
      "프롬프트 전체 공개 vs 일부만",
      "알림 메일 톤/빈도 의견 받습니다",
      "AI 곡 크레딧 표기 관례 제안",
      "뮤비 재생 안 될 때 체크리스트",
      "배틀 직후 투표 이유 템플릿 아이디어",
      "툴 비교 카테고리가 필요할까요?",
      "믹스 후처리 Q&A 공간을 원하시나요?",
      "주간 digest + 중요 알림만 즉시?",
      "프로필 없이 글쓰기가 막힐 때",
      "트랙 제출 승인 시간 체감 공유",
      "커뮤니티 글쓰기 허들을 낮추는 아이디어",
      "멘션 기능이 생기면 어디에 쓰실 건가요?",
      "팔로잉 피드가 생기면 보고 싶은 것",
      "도움말 글을 핀으로 모아두면?",
      "실패담 아카이브가 있으면 좋을까",
      "장르별 팁 모음 페이지 제안",
      "모바일에서 글쓰기가 불편한 지점",
      "NEX를 더 재미있게 만들 작은 기능 하나",
    ],
  };

  for (const cat of COMMUNITY_CATEGORIES) {
    const slug = cat.slug;
    const titles = topics[slug];
    for (let i = 0; i < TARGET_PER_CATEGORY; i++) {
      const author = pick(CREATOR_USERNAMES, i + slug.length);
      const likers = CREATOR_USERNAMES.filter((u) => u !== author).slice(0, 1 + (i % 3));
      const commenters = CREATOR_USERNAMES.filter((u) => u !== author).slice(0, 1 + (i % 2));
      const kind: CommunityPostKind =
        slug === "track-share" && i % 4 === 0 ? "track" : slug === "help-ideas" && i % 3 === 0 ? "discussion" : i % 5 === 0 ? "discussion" : "talk";
      const title = titles[i] ?? `${cat.titleKo} #${i + 1}`;
      out.push({
        category: slug,
        kind,
        title,
        body:
          `${title}\n\n` +
          `NEX 커뮤니티에서 나누고 싶은 이야기입니다. ` +
          `오늘은 「${cat.titleKo}」 주제로 짧게 적어봐요.\n\n` +
          `- 시도: ${i % 2 === 0 ? "프롬프트/편곡을 조금 바꿈" : "청취 포인트와 피드백을 모아봄"}\n` +
          `- 느낀 점: ${i % 3 === 0 ? "첫인상이 생각보다 중요함" : "구체적인 한 줄이 댓글을 부름"}\n` +
          `- 다음에 해볼 것: ${i % 2 === 0 ? "다른 분 팁을 내 곡에 적용" : "배틀/차트 반응을 다시 들어보기"}\n\n` +
          `비슷한 경험 있으면 좋아요·댓글로 이어가요.`,
        authorUsername: author,
        daysAgo: (i % 18) + 1,
        likesFrom: likers,
        comments: commenters.map((c, ci) => ({
          author: c,
          content: pick(COMMENT_POOL, i + ci + slug.length),
        })),
      });
    }
  }

  return out;
}

async function ensureCreatorProfile(username: string): Promise<string> {
  const [existing] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(sql`lower(${profiles.username}) = ${username.toLowerCase()}`)
    .limit(1);
  if (existing?.userId) return existing.userId;

  const userId = `artist_${username.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()}`;
  await db.insert(users).values({ id: userId, email: null }).onConflictDoNothing();
  await db
    .insert(profiles)
    .values({
      userId,
      username,
      isVerified: true,
    })
    .onConflictDoNothing();

  const [created] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(sql`lower(${profiles.username}) = ${username.toLowerCase()}`)
    .limit(1);
  if (!created?.userId) throw new Error(`Failed to ensure profile for ${username}`);
  return created.userId;
}

async function main() {
  const authorIds = new Map<string, string>();
  for (const username of CREATOR_USERNAMES) {
    authorIds.set(username, await ensureCreatorProfile(username));
  }

  const seeds = buildSeeds();
  let created = 0;
  let skipped = 0;

  for (const post of seeds) {
    const authorUserId = authorIds.get(post.authorUsername);
    if (!authorUserId) throw new Error(`Missing author ${post.authorUsername}`);

    const [dup] = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(and(eq(communityPosts.authorUserId, authorUserId), eq(communityPosts.title, post.title)))
      .limit(1);
    if (dup) {
      skipped += 1;
      continue;
    }

    const postId = await storage.createCommunityPost({
      authorUserId,
      category: post.category,
      kind: post.kind,
      title: post.title,
      body: post.body,
      attachedTrackId: null,
    });

    const createdAt = new Date(Date.now() - post.daysAgo * 24 * 60 * 60 * 1000);
    await db.execute(sql`
      UPDATE community_posts
      SET created_at = ${createdAt}, updated_at = ${createdAt}
      WHERE id = ${postId}
    `);

    for (const liker of post.likesFrom) {
      const likerId = authorIds.get(liker);
      if (!likerId) continue;
      try {
        await storage.toggleCommunityPostLike(likerId, postId);
      } catch {
        // ignore
      }
    }

    for (const comment of post.comments) {
      const commenterId = authorIds.get(comment.author);
      if (!commenterId) continue;
      await storage.addCommunityComment(commenterId, postId, comment.content);
    }

    created += 1;
  }

  const counts = await db.execute(sql`
    SELECT category, count(*)::int AS cnt
    FROM community_posts
    WHERE hidden_at IS NULL
    GROUP BY category
    ORDER BY category
  `);

  console.log(JSON.stringify({ created, skipped, targetPerCategory: TARGET_PER_CATEGORY, counts: counts.rows }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

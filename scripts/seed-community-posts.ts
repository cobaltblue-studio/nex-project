import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { profiles, users } from "../shared/schema";
import { storage } from "../server/storage";
import type { CommunityCategorySlug } from "../shared/community";

const CREATOR_USERNAMES = ["kdh", "duckho", "cobaltblue9", "cobaltblue_studio_film", "slowpower"] as const;

type SeedPost = {
  category: CommunityCategorySlug;
  title: string;
  body: string;
  authorUsername: (typeof CREATOR_USERNAMES)[number];
  daysAgo: number;
  likesFrom?: (typeof CREATOR_USERNAMES)[number][];
  comments?: { author: (typeof CREATOR_USERNAMES)[number]; content: string }[];
};

const SEED_POSTS: SeedPost[] = [
  // 창작 노트 (track-share) — 6 new (+1 pinned welcome already)
  {
    category: "track-share",
    authorUsername: "kdh",
    daysAgo: 2,
    title: "첫 NEX 곡, ‘왜 이 분위기로 갔는지’ 적어봅니다",
    body:
      "Suno에서 ‘late-night city pop, soft male vocal’로 시작했는데 처음엔 너무 밝게 나왔어요.\nStyle에서 bright/neon 계열 단어를 빼고 reverb를 키우니 훨씬 제 의도에 가까워졌습니다.\nNEX에 올릴 때는 ‘듣는 사람이 어떤 장면을 떠올릴지’ 한 줄만 본문에 적어두면 댓글도 더 구체적으로 달리더라고요.",
    likesFrom: ["slowpower", "cobaltblue9"],
    comments: [{ author: "duckho", content: "reverb 키우는 팁 공감합니다. 저도 드럼을 너무 앞세우면 분위기가 깨져서 보컬 뒤로 밀어두는 편이에요." }],
  },
  {
    category: "track-share",
    authorUsername: "cobaltblue9",
    daysAgo: 4,
    title: "뮤비용으로 뽑고 오디오만 다시 만든 이유",
    body:
      "YouTube용으로 만든 뒤 NEX 오디오 차트에도 올리려고 instrumental 버전을 따로 뽑았습니다.\n영상용 mix는 효과음·컷 편집 타이밍에 맞춰져 있어서, 순수 청취용으로는 mid가 살짝 묻히더라고요.\n트랙 제출은 한 번만 하고, 커뮤니티에는 ‘왜 두 버전이 다른지’만 남겨두니 피드백이 훨씬 정확해졌어요.",
    likesFrom: ["kdh", "cobaltblue_studio_film"],
  },
  {
    category: "track-share",
    authorUsername: "slowpower",
    daysAgo: 6,
    title: "배틀 전에 스스로에게 묻는 체크 3가지",
    body:
      "1) 첫 10초에 ‘왜 계속 들을 이유’가 있나\n2) 중간에 텍스처 변화가 한 번은 있나\n3) 마지막 15초가 기억에 남나\n\n점수보다 ‘다시 재생할지’를 기준으로 보면 제작 방향도 덜 흔들립니다.",
    likesFrom: ["duckho", "cobaltblue9"],
    comments: [{ author: "cobaltblue_studio_film", content: "3번이 저한테 제일 어렵네요. outro를 매번 비슷하게 끝내는 습관이 있어서 이번엔 fade 대신 abrupt cut도 시험 중입니다." }],
  },
  {
    category: "track-share",
    authorUsername: "duckho",
    daysAgo: 8,
    title: "프롬프트 20번 뽑았을 때 고정되는 패턴",
    body:
      "같은 seed 느낌으로 여러 번 생성하면 verse 멜로디 contour가 비슷하게 고정되는 경우가 많았습니다.\n해결한 방법은 ‘장면’ 키워드를 바꾸는 것보다 BPM±5, vocal gender, instrumentation 한 줄만 바꾸는 쪽이 더 효과적이었어요.\n실패작도 커뮤니티에 남기니 ‘비슷한 문제’ 겪는 분들이 바로 공감해 주셔서 도움이 됐습니다.",
    likesFrom: ["kdh", "slowpower"],
  },
  {
    category: "track-share",
    authorUsername: "cobaltblue_studio_film",
    daysAgo: 10,
    title: "AI 곡인데 사람 손이 들어간 구간",
    body:
      "브릿지 8마디만 DAW에서 컷 편집하고 EQ 살짝 손봤습니다.\n‘완전 AI’보다 ‘AI draft + human finish’가 NEX에서 더 솔직한 제작 노트 같더라고요.\n어디까지 AI고 어디부터 손댔는지 적어두면, 나중에 배틀 댓글에서도 논쟁이 줄어듭니다.",
    likesFrom: ["cobaltblue9"],
    comments: [
      { author: "slowpower", content: "브릿지만 손보는 방식 저도 씁니다. 전체 재생성보다 훨씬 빨라요." },
      { author: "kdh", content: "크레딧 표기 관례도 같이 정리하면 좋겠네요." },
    ],
  },
  {
    category: "track-share",
    authorUsername: "kdh",
    daysAgo: 12,
    title: "드롭이 약하다고 느낄 때 바꾼 단어 2개",
    body:
      "‘energetic drop’만 넣으면 뻗는 경우가 많아서,\n→ ‘sidechain bass, punchy kick, wide synth stack’처럼 구체화했습니다.\n반대로 ‘anthemic, festival’은 과하게 붐비는 경우가 있어서 ballad 쪽은 빼는 게 낫더라고요.",
    likesFrom: ["duckho", "cobaltblue_studio_film", "slowpower"],
  },

  // 프롬프트 — 6 new
  {
    category: "prompts",
    authorUsername: "duckho",
    daysAgo: 1,
    title: "내 Suno 고정 루틴: Style / Lyrics 분리 템플릿",
    body:
      "Style: genre + tempo + vocal + 2 instruments + mood (5줄 이내)\nLyrics: verse1 / pre / chorus만 먼저\n\n전체 가사를 한 번에 넣으면 structure가 흐트러지는 경우가 많아서, chorus가 잡히면 나머지를 채우는 순서로 갑니다.",
    likesFrom: ["kdh", "cobaltblue9"],
    comments: [{ author: "slowpower", content: "5줄 Style 제한 좋네요. 저는 7줄 넘어가면 거의 항상 산으로 갑니다." }],
  },
  {
    category: "prompts",
    authorUsername: "cobaltblue9",
    daysAgo: 3,
    title: "‘female vocal, airy’ 고정 vs 장르별 변형",
    body:
      "팝/시티팝은 airy가 잘 맞는데, 힙합이나 UK garage는 articulation이 더 중요해서 ‘airy’를 빼고 ‘dry, upfront’로 바꿉니다.\n같은 보컬 톤을 모든 장르에 넣으면 ‘내 sound’는 생기지만 배틀에서는 단조로워질 수 있어요.",
    likesFrom: ["duckho", "cobaltblue_studio_film"],
  },
  {
    category: "prompts",
    authorUsername: "slowpower",
    daysAgo: 5,
    title: "BPM 키워드 넣는 위치 실험",
    body:
      "Style 첫 줄 vs 중간 vs 끝 — 세 군데 넣어봤을 때 첫 줄이 가장 안정적이었습니다.\n‘128 BPM’만 단독으로 넣는 것보다 ‘128 BPM, four-on-the-floor’ 같이 리듬 정보를 붙이면 템포 이탈이 줄어요.",
    likesFrom: ["kdh"],
  },
  {
    category: "prompts",
    authorUsername: "cobaltblue_studio_film",
    daysAgo: 7,
    title: "프롬프트 짧게 vs 길게 — 실제 차이",
    body:
      "짧게(3~4줄): 결과 편차 큼, happy accident 많음\n길게(10줄+): 재현성↑, 지루해질 위험↑\n\nNEX에 올릴 ‘대표곡’은 길게, 실험곡은 짧게 뽑는 식으로 나눴습니다.",
    likesFrom: ["cobaltblue9", "duckho"],
    comments: [{ author: "kdh", content: "실험곡 짧게 뽑고 마음에 들면 그때 Style만 길게 확장하는 방식도 추천합니다." }],
  },
  {
    category: "prompts",
    authorUsername: "kdh",
    daysAgo: 9,
    title: "실패 프롬프트 3개와 교훈",
    body:
      "1) ‘cinematic orchestral EDM trap’ — 섞이긴 하는데 정체성 없음\n2) ‘whisper vocal + heavy metal’ — 보컬이 묻힘\n3) ‘exact copy of 80s hit’ — 피하기\n\n실패도 남기면 다른 분들 시간 아껴드릴 수 있을 것 같아서 올립니다.",
    likesFrom: ["slowpower", "duckho", "cobaltblue_studio_film"],
  },
  {
    category: "prompts",
    authorUsername: "duckho",
    daysAgo: 11,
    title: "‘80s synth’ 한 줄 추가했을 때 달라진 점",
    body:
      "electro pop 베이스에 ‘80s synth, gated reverb snare’ 한 줄만 추가했더니 snare tail과 synth brightness가 확 바뀌었습니다.\ndecade 키워드는 분위기 전체를 흔들 수 있어서, 마지막에 소량만 넣는 걸 추천합니다.",
    likesFrom: ["cobaltblue9"],
  },

  // 배틀 토크 — 6 new
  {
    category: "battle-talk",
    authorUsername: "slowpower",
    daysAgo: 2,
    title: "훅보다 편곡이 이긴 배틀 본 적 있나요?",
    body:
      "최근에 멜로디는 A가 더 캐치했는데, B가 브릿지에서 texture를 바꿔서 이긴 케이스가 있었습니다.\nNEX 배틀은 20초 preview도 영향이 있지만, ‘반복 청취 가치’가 댓글로 자주 언급되더라고요.",
    likesFrom: ["kdh", "duckho"],
    comments: [{ author: "cobaltblue9", content: "저는 드럼 패턴 변화에 많이 반응하는 것 같아요. verse2에서 hi-hat만 바꿔도 승부가 갈리기도 합니다." }],
  },
  {
    category: "battle-talk",
    authorUsername: "cobaltblue9",
    daysAgo: 4,
    title: "투표할 때 가장 먼저 듣는 구간",
    body:
      "저는 0:00~0:12만 먼저 듣고, 마음에 들면 0:30 전후 drop/chorus로 넘어갑니다.\n첫 인상에서 ‘믹스 밸런스’가 깨져 있으면 melody가 좋아도 손이 안 가더라고요.\n여러분은 어느 구간을 기준으로 투표하시나요?",
    likesFrom: ["cobaltblue_studio_film", "slowpower"],
  },
  {
    category: "battle-talk",
    authorUsername: "duckho",
    daysAgo: 6,
    title: "장르 mismatch 매치업에서 역전한 적 있나요?",
    body:
      "lo-fi vs uptempo pop처럼 겉장르가 다를 때, ‘더 bold한 sound design’ 쪽이 이기는 경우를 봤습니다.\n장르 라벨보다 ‘청취 경험’이 뭐가 더 fresh한지로 보게 되더라고요.",
    likesFrom: ["kdh"],
  },
  {
    category: "battle-talk",
    authorUsername: "kdh",
    daysAgo: 8,
    title: "연승 중인 곡들의 공통점 추측",
    body:
      "intro가 길지 않고, 15초 안에 vocal이 들어오며, chorus hook이 한 번은 명확히 들리는 곡들이 연승하는 경향이 있는 것 같습니다.\n통계까지는 아니고 ‘느낌’인데, 다른 분들도 비슷하게 보시나요?",
    likesFrom: ["cobaltblue9", "duckho", "slowpower"],
    comments: [{ author: "cobaltblue_studio_film", content: "intro 짧은 곳에 +1. 요즘은 intro 5초도 길게 느껴집니다." }],
  },
  {
    category: "battle-talk",
    authorUsername: "cobaltblue_studio_film",
    daysAgo: 10,
    title: "MV vs 오디오 only — 배틀 청취 경험이 다른가",
    body:
      "영상이 있으면 ‘장면’이 보조되지만, 배틀 preview에서는 오히려 audio focus가 분산될 때도 있습니다.\n반대로 visual hook이 강한 MV는 첫 vote에 유리한 것 같아요.\n여러분은 MV를 배틀에 넣을 때 어떤 기준으로 고르시나요?",
    likesFrom: ["slowpower"],
  },
  {
    category: "battle-talk",
    authorUsername: "slowpower",
    daysAgo: 13,
    title: "배틀 참여 동기: 차트 vs 피드백",
    body:
      "처음엔 차트 올리려고 참여했는데, 지금은 ‘낯선 리스너 반응’을 보는 목적이 더 큽니다.\n이기면 메일 알림도 오고, 다시 NEX 들어올 동기가 생기더라고요.\n커뮤니티에서 배틀 직후에 ‘왜 이쪽에 투표했는지’ 남기면 더 재미있을 것 같아요.",
    likesFrom: ["kdh", "duckho", "cobaltblue9"],
  },

  // 도움말 · 아이디어 — 7 new
  {
    category: "help-ideas",
    authorUsername: "kdh",
    daysAgo: 1,
    title: "커뮤니티에 어떤 주제가 더 있으면 좋을까요?",
    body:
      "창작 노트 / 프롬프트 / 배틀 토크 외에 ‘툴 비교(Suno vs Udio)’나 ‘믹스 후처리 Q&A’ 같은 주제도 필요할까요?\n실제로 쓰고 싶은 카테고리를 댓글로 알려주시면 NEX 쪽에도 전달하겠습니다.",
    likesFrom: ["duckho", "slowpower"],
    comments: [{ author: "cobaltblue9", content: "툴 비교 카테고리 있으면 좋겠어요. 같은 프롬프트를 두 툴에 넣은 A/B가 궁금합니다." }],
  },
  {
    category: "help-ideas",
    authorUsername: "duckho",
    daysAgo: 3,
    title: "신규 크리에이터가 처음 NEX에서 할 질문 TOP3",
    body:
      "1) 트랙 제출 후 승인까지 얼마나 걸리나요?\n2) 배틀은 어떻게 참여하나요?\n3) MV 재생이 안 될 때는 어디서 확인하나요?\n\n비슷한 질문 있으면 이 글에 이어서 적어주세요. FAQ로 묶어보려 합니다.",
    likesFrom: ["kdh", "cobaltblue_studio_film"],
  },
  {
    category: "help-ideas",
    authorUsername: "cobaltblue9",
    daysAgo: 5,
    title: "프롬프트 전체 공개 vs 일부만 — 어떻게 생각하세요?",
    body:
      "전체 공개는 학습에 좋지만, ‘나만의 sound’를 숨기고 싶을 때도 있잖아요.\nStyle만 공개 / Lyrics만 공개 / seed는 비공개 같은 선택지가 있으면 어떨까요?\n커뮤니티에서는 최소한 ‘어떤 방향으로 시도했는지’만 공유해도 충분하다고 봅니다.",
    likesFrom: ["slowpower", "duckho"],
  },
  {
    category: "help-ideas",
    authorUsername: "slowpower",
    daysAgo: 7,
    title: "배틀/좋아요 알림 메일, 다시 들어오게 되나요?",
    body:
      "저는 배틀 결과 메일 받고 다시 NEX 들어와서 다른 곡도 듣게 됩니다.\n알림 톤이나 빈도 조절(weekly digest 등)에 대한 의견 있으면 알려주세요.",
    likesFrom: ["kdh"],
    comments: [{ author: "cobaltblue_studio_film", content: "주 1회 digest + 중요한 승리만 즉시 알림이면 좋겠어요." }],
  },
  {
    category: "help-ideas",
    authorUsername: "cobaltblue_studio_film",
    daysAgo: 9,
    title: "AI 곡 크레딧 표기 관례 제안",
    body:
      "예: Music by [artist] · AI-assisted (Suno v4) · Human edit on bridge\n\n투명하게 적어두면 배틀/커뮤니티 모두 신뢰가 올라갈 것 같습니다.\n표기 예시를 댓글로 달아주시면 모아서 정리해볼게요.",
    likesFrom: ["cobaltblue9", "duckho", "kdh"],
  },
  {
    category: "help-ideas",
    authorUsername: "kdh",
    daysAgo: 11,
    title: "뮤비 재생 안 될 때 체크리스트",
    body:
      "1) YouTube에서 ‘임베드 허용’인지\n2) 비공개/일부 공개 아닌지\n3) 지역 제한 없는지\n\n트랙 제출 전에 한 번 확인하면 NEX에서 재생 실패가 줄어듭니다. 추가로 알고 계신 항목 있으면 댓글 부탁드립니다.",
    likesFrom: ["slowpower", "cobaltblue_studio_film"],
  },
  {
    category: "help-ideas",
    authorUsername: "duckho",
    daysAgo: 14,
    title: "배틀 직후 ‘왜 이쪽에 투표했는지’ 남기는 기능?",
    body:
      "배틀 끝나고 커뮤니티 배틀 토크로 바로 이어지면 학습 속도가 빨라질 것 같아요.\n짧은 투표 이유 템플릿(훅/믹스/독창성)만 있어도 좋을 듯합니다.\n이 기능, 필요하다고 생각하시면 👍 또는 댓글로 의견 남겨주세요.",
    likesFrom: ["cobaltblue9", "slowpower", "kdh"],
    comments: [
      { author: "slowpower", content: "필요합니다. 특히 신규 크리에이터에게 도움 될 것 같아요." },
      { author: "cobaltblue_studio_film", content: "투표 이유가 쌓이면 장르별 trend도 보일 듯." },
    ],
  },
];

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

  let created = 0;
  for (const post of SEED_POSTS) {
    const authorUserId = authorIds.get(post.authorUsername);
    if (!authorUserId) throw new Error(`Missing author ${post.authorUsername}`);

    const postId = await storage.createCommunityPost({
      authorUserId,
      category: post.category,
      title: post.title,
      body: post.body,
    });

    const createdAt = new Date(Date.now() - post.daysAgo * 24 * 60 * 60 * 1000);
    await db.execute(sql`
      UPDATE community_posts
      SET created_at = ${createdAt}, updated_at = ${createdAt}
      WHERE id = ${postId}
    `);

    for (const liker of post.likesFrom ?? []) {
      const likerId = authorIds.get(liker);
      if (!likerId) continue;
      try {
        await storage.toggleCommunityPostLike(likerId, postId);
      } catch {
        // ignore duplicate like attempts
      }
    }

    for (const comment of post.comments ?? []) {
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

  console.log(JSON.stringify({ created, counts: counts.rows }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

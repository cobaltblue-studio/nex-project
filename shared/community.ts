export const COMMUNITY_CATEGORIES = [
  {
    slug: "track-share",
    title: "Creative Notes",
    titleKo: "창작 노트",
    description: "Write your creative intent and process, then hear what others think.",
    descriptionKo: "제작 의도와 과정을 적고, 다른 사람의 의견을 나누세요.",
  },
  {
    slug: "prompts",
    title: "Prompts",
    titleKo: "프롬프트",
    description: "Share prompt recipes, workflow tips, and tool experiments.",
    descriptionKo: "프롬프트 레시피, 워크플로, 툴 실험을 공유하세요.",
  },
  {
    slug: "battle-talk",
    title: "Battle Talk",
    titleKo: "배틀 토크",
    description: "Discuss matchups, winning choices, and genre strategies.",
    descriptionKo: "배틀 결과, 승부 포인트, 장르 전략을 이야기하세요.",
  },
  {
    slug: "help-ideas",
    title: "Help & Ideas",
    titleKo: "도움말 · 아이디어",
    description: "Ask for help, suggest product ideas, and troubleshoot creation issues.",
    descriptionKo: "도움 요청, 기능 제안, 제작 문제 해결을 함께하세요.",
  },
] as const;

export type CommunityCategorySlug = (typeof COMMUNITY_CATEGORIES)[number]["slug"];

export const COMMUNITY_SYSTEM_AUTHOR_ID = "system:nex-community";

export const COMMUNITY_SYSTEM_SEED_POSTS = [
  {
    postId: 1,
    category: "track-share",
    pinned: true,
    titleKo: "NEX 커뮤니티 오픈",
    titleEn: "Welcome to NEX Community",
    bodyKo:
      "NEX 커뮤니티에 오신 것을 환영합니다. 트랙 등록은 상단 메뉴의 '트랙 제출'에서 하세요. 여기는 제작 의도, 프롬프트 실험, 배틀 토론, 기능 제안을 나누는 공간입니다.\n\n이렇게 활용해 주세요:\n- 왜 이 곡을 만들었는지, 무엇을 시도했는지 이야기하기\n- 결과를 바꾼 프롬프트 실험 공유하기\n- 배틀 매치업과 투표 이유 이야기하기\n- NEX를 더 재미있게 만들 기능 제안하기\n\n구체적이고 건설적이며 창작자에게 도움이 되는 글을 부탁드립니다.",
    bodyEn:
      "Welcome to the NEX Community. Register tracks from Submit Track in the top menu. This space is for creative intent, prompt experiments, battle discussion, and product ideas.\n\nHow to use this space:\n- Explain why you made a track and what you tried\n- Post prompt experiments that changed your result\n- React to battle matchups and why you voted that way\n- Suggest product ideas that would make NEX more fun\n\nPlease keep posts specific, constructive, and creator-friendly.",
  },
  {
    postId: 2,
    category: "prompts",
    pinned: true,
    titleKo: "프롬프트 교환 시작 글",
    titleEn: "Prompt Exchange Starter Thread",
    bodyKo:
      "이 글은 잘 되었던 프롬프트 패턴을 하나씩 공유하는 시작 글입니다.\n\n추천 형식:\n- 사용한 툴\n- 장르 / 분위기 목표\n- 짧은 프롬프트 예시\n- 결과에서 무엇이 달라졌는지\n\n모든 것을 한 번에 공개하기보다, 다른 창작자가 오늘 바로 시험해 볼 수 있는 재현 가능한 팁 하나를 남겨 주세요.",
    bodyEn:
      "Use this thread to share one prompt pattern that worked for you.\n\nSuggested format:\n- Tool used\n- Genre / mood target\n- Short prompt snippet\n- What changed in the output\n\nThe goal is not to dump everything, but to share one repeatable idea another creator can test today.",
  },
  {
    postId: 3,
    category: "battle-talk",
    pinned: true,
    titleKo: "배틀 토크: 왜 이 곡이 이겼을까?",
    titleEn: "Battle Talk: Why did this track win?",
    bodyKo:
      "배틀 이야기를 할 때는 단순히 승자를 적기보다, 무엇이 승부를 갈랐는지 설명해 주세요.\n\n좋은 토론 질문:\n- 어떤 훅이나 드롭이 차이를 만들었나요?\n- 편곡이 이겼나요, 사운드 디자인이 이겼나요?\n- 반복 청취 가치, 독창성, 감정 전달 중 무엇이 더 크게 작용했나요?\n\n이런 대화가 쌓일수록 차트는 더 투명해지고, 창작자는 리스너가 실제로 무엇에 반응하는지 더 잘 알 수 있습니다.",
    bodyEn:
      "When you react to a battle, try explaining the winning point instead of only naming the winner.\n\nGood discussion prompts:\n- What hook or drop made the difference?\n- Did arrangement beat sound design, or the other way around?\n- Was the vote about replay value, originality, or emotional impact?\n\nThis helps the chart feel more transparent and teaches creators what listeners are actually responding to.",
  },
] as const satisfies readonly {
  postId: number;
  category: CommunityCategorySlug;
  pinned: boolean;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
}[];

export const COMMUNITY_CATEGORY_SLUGS = COMMUNITY_CATEGORIES.map((item) => item.slug) as CommunityCategorySlug[];

export function isCommunityCategorySlug(value: unknown): value is CommunityCategorySlug {
  return typeof value === "string" && COMMUNITY_CATEGORY_SLUGS.includes(value as CommunityCategorySlug);
}

export function formatCommunitySeedTitle(
  seed: (typeof COMMUNITY_SYSTEM_SEED_POSTS)[number],
  isKorean: boolean,
): string {
  return isKorean ? seed.titleKo : seed.titleEn;
}

export function formatCommunitySeedBody(
  seed: (typeof COMMUNITY_SYSTEM_SEED_POSTS)[number],
  isKorean: boolean,
): string {
  return isKorean ? seed.bodyKo : seed.bodyEn;
}

export function getCommunitySystemSeed(
  category: CommunityCategorySlug,
  authorUserId?: string | null,
): (typeof COMMUNITY_SYSTEM_SEED_POSTS)[number] | null {
  if (authorUserId !== COMMUNITY_SYSTEM_AUTHOR_ID) return null;
  return COMMUNITY_SYSTEM_SEED_POSTS.find((seed) => seed.category === category) ?? null;
}


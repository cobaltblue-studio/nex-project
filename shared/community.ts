export const COMMUNITY_CATEGORIES = [
  {
    slug: "track-share",
    title: "Track Share",
    titleKo: "트랙 공유",
    description: "Show your new AI track, explain the idea, and gather reactions.",
    descriptionKo: "새 AI 곡을 공유하고 제작 의도와 반응을 나누세요.",
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

export const COMMUNITY_CATEGORY_SLUGS = COMMUNITY_CATEGORIES.map((item) => item.slug) as CommunityCategorySlug[];

export function isCommunityCategorySlug(value: unknown): value is CommunityCategorySlug {
  return typeof value === "string" && COMMUNITY_CATEGORY_SLUGS.includes(value as CommunityCategorySlug);
}


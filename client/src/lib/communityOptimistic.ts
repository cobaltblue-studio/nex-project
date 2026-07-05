import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { CommunityPost } from "@/components/CommunityPostPanel";

type CommunityComment = {
  id: number;
  content: string;
  createdAt: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
  authorUserId: string;
  authorName: string | null;
  authorProfileId: number | null;
  authorIsVerified: boolean;
};

export function isCommunityPostsListKey(key: QueryKey): boolean {
  const first = key[0];
  return typeof first === "string" && first.startsWith("/api/community/posts") && !first.match(/\/api\/community\/posts\/\d+/);
}

export function isCommunityPostDetailKey(key: QueryKey): boolean {
  const first = key[0];
  return typeof first === "string" && /^\/api\/community\/posts\/\d+$/.test(first);
}

export function togglePostLike(post: CommunityPost): CommunityPost {
  const viewerHasLiked = !post.viewerHasLiked;
  return {
    ...post,
    viewerHasLiked,
    likeCount: Math.max(0, post.likeCount + (viewerHasLiked ? 1 : -1)),
  };
}

export function bumpCommentCount(post: CommunityPost, delta: number): CommunityPost {
  return {
    ...post,
    commentCount: Math.max(0, post.commentCount + delta),
  };
}

type LikeRollback = {
  lists: Array<[QueryKey, CommunityPost[] | undefined]>;
  details: Array<[QueryKey, CommunityPost | undefined]>;
};

export async function optimisticToggleLike(queryClient: QueryClient, postId: number): Promise<LikeRollback> {
  await queryClient.cancelQueries({
    predicate: (query) => isCommunityPostsListKey(query.queryKey) || isCommunityPostDetailKey(query.queryKey),
  });

  const lists = queryClient.getQueriesData<CommunityPost[]>({
    predicate: (query) => isCommunityPostsListKey(query.queryKey),
  });
  const details = queryClient.getQueriesData<CommunityPost>({
    predicate: (query) => isCommunityPostDetailKey(query.queryKey) && String(query.queryKey[0]).endsWith(`/${postId}`),
  });

  queryClient.setQueriesData<CommunityPost[]>(
    { predicate: (query) => isCommunityPostsListKey(query.queryKey) },
    (old) => old?.map((post) => (post.id === postId ? togglePostLike(post) : post)),
  );

  for (const [key, post] of details) {
    if (post) queryClient.setQueryData(key, togglePostLike(post));
  }

  return { lists, details };
}

export function rollbackLike(queryClient: QueryClient, snapshot: LikeRollback) {
  for (const [key, data] of snapshot.lists) {
    queryClient.setQueryData(key, data);
  }
  for (const [key, data] of snapshot.details) {
    queryClient.setQueryData(key, data);
  }
}

type CommentRollback = {
  comments: Array<[QueryKey, CommunityComment[] | undefined]>;
  posts: Array<[QueryKey, CommunityPost | undefined]>;
};

export async function optimisticAddComment(
  queryClient: QueryClient,
  postId: number,
  commentsUrl: string,
  postUrl: string,
  draft: CommunityComment,
): Promise<CommentRollback> {
  await queryClient.cancelQueries({ queryKey: [commentsUrl] });
  await queryClient.cancelQueries({
    predicate: (query) => isCommunityPostsListKey(query.queryKey) || query.queryKey[0] === postUrl,
  });

  const comments = queryClient.getQueriesData<CommunityComment[]>({ queryKey: [commentsUrl] });
  const posts = queryClient.getQueriesData<CommunityPost>({
    predicate: (query) => isCommunityPostsListKey(query.queryKey) || query.queryKey[0] === postUrl,
  });

  queryClient.setQueryData<CommunityComment[]>([commentsUrl], (old) => [draft, ...(old ?? [])]);

  queryClient.setQueriesData<CommunityPost[]>(
    { predicate: (query) => isCommunityPostsListKey(query.queryKey) },
    (old) => old?.map((post) => (post.id === postId ? bumpCommentCount(post, 1) : post)),
  );

  const detail = queryClient.getQueryData<CommunityPost>([postUrl]);
  if (detail) queryClient.setQueryData([postUrl], bumpCommentCount(detail, 1));

  return { comments, posts };
}

export function rollbackComment(queryClient: QueryClient, snapshot: CommentRollback) {
  for (const [key, data] of snapshot.comments) {
    queryClient.setQueryData(key, data);
  }
  for (const [key, data] of snapshot.posts) {
    queryClient.setQueryData(key, data);
  }
}

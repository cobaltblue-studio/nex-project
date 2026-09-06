import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, PenLine } from "lucide-react";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_IVORY,
  COMMUNITY_IVORY_INK,
  type CommunityCategorySlug,
  type CommunityPostKind,
} from "@shared/community";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PickTrack = { id: number; title: string; creatorName: string };

async function fetchAudioPicks(search: string): Promise<PickTrack[]> {
  const q = search.trim();
  const chartParams = new URLSearchParams({
    sortBy: "rankingScore",
    limit: "40",
    trackType: "audio",
  });
  if (!q) chartParams.set("status", "CHART");
  else chartParams.set("q", q);
  const newUrl = q ? `/api/tracks/new?q=${encodeURIComponent(q)}` : "/api/tracks/new";
  const [chartRes, newRes] = await Promise.all([
    fetch(`/api/tracks?${chartParams.toString()}`),
    fetch(newUrl),
  ]);
  const chartJson = chartRes.ok ? await chartRes.json() : [];
  const newJson = newRes.ok ? await newRes.json() : [];
  const chartRows = Array.isArray(chartJson) ? chartJson : chartJson?.tracks ?? [];
  const newRows = Array.isArray(newJson) ? newJson : newJson?.tracks ?? [];
  const seen = new Set<number>();
  const out: PickTrack[] = [];
  for (const raw of [...chartRows, ...newRows]) {
    const id = Number(raw?.id);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: String(raw?.title ?? "").trim(),
      creatorName: String(raw?.creatorName ?? "").trim() || "?",
    });
  }
  return out;
}

export function CommunityComposer({
  open,
  onOpenChange,
  isKorean,
  canPost,
  needLogin,
  needProfile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isKorean: boolean;
  canPost: boolean;
  needLogin: boolean;
  needProfile: boolean;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<CommunityPostKind>("talk");
  const [category, setCategory] = useState<CommunityCategorySlug>("track-share");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [trackId, setTrackId] = useState<number | "">("");
  const [trackSearch, setTrackSearch] = useState("");

  const picksQuery = useQuery({
    queryKey: ["/api/community/track-picks", trackSearch],
    queryFn: () => fetchAudioPicks(trackSearch),
    enabled: open && kind === "track",
  });

  const chips = useMemo(
    () =>
      [
        { id: "talk" as const, ko: "토크", en: "Talk" },
        { id: "track" as const, ko: "트랙 자랑", en: "Track" },
        { id: "discussion" as const, ko: "토론", en: "Discussion" },
      ] as const,
    [],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/community/posts", {
        kind,
        category,
        title: kind === "discussion" ? title : title || "",
        body,
        attachedTrackId: trackId === "" ? null : Number(trackId),
      });
    },
    onSuccess: async () => {
      setTitle("");
      setBody("");
      setTrackId("");
      setKind("talk");
      onOpenChange(false);
      await queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/community/posts"),
      });
      toast({
        title: isKorean ? "글을 올렸습니다" : "Posted",
      });
    },
    onError: (err: Error) => {
      toast({
        title: isKorean ? "게시 실패" : "Post failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    canPost &&
    body.trim().length > 0 &&
    (kind !== "discussion" || title.trim().length > 0) &&
    !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto border-stone-300 sm:max-w-lg"
        style={{ backgroundColor: COMMUNITY_IVORY, color: COMMUNITY_IVORY_INK }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-900">
            <PenLine className="h-4 w-4" />
            {isKorean ? "글쓰기" : "Write a post"}
          </DialogTitle>
        </DialogHeader>

        {needLogin ? (
          <p className="text-sm text-stone-700">
            {isKorean ? "글을 쓰려면 로그인해 주세요." : "Log in to post."}
          </p>
        ) : needProfile ? (
          <p className="text-sm text-stone-700">
            {isKorean ? "프로필을 만든 뒤 글을 쓸 수 있습니다." : "Create a profile before posting."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setKind(chip.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    kind === chip.id
                      ? "bg-stone-900 text-[#F7F1E3]"
                      : "bg-stone-200/80 text-stone-700 hover:bg-stone-300/80"
                  }`}
                >
                  {isKorean ? chip.ko : chip.en}
                </button>
              ))}
            </div>

            {kind === "discussion" ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isKorean ? "제목" : "Title"}
                className="w-full rounded-xl border border-stone-300 bg-white/70 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-500"
              />
            ) : null}

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder={
                isKorean
                  ? kind === "track"
                    ? "트랙 이야기를 적어보세요 (트랙은 선택)"
                    : "무슨 이야기를 나눌까요?"
                  : kind === "track"
                    ? "Talk about your track (attachment optional)"
                    : "What's on your mind?"
              }
              className="w-full rounded-xl border border-stone-300 bg-white/70 px-3 py-2 text-sm leading-6 text-stone-900 outline-none focus:border-stone-500"
            />

            <label className="block text-xs font-semibold text-stone-600">
              {isKorean ? "태그" : "Tag"}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunityCategorySlug)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white/70 px-3 py-2 text-sm text-stone-900"
              >
                {COMMUNITY_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {isKorean ? c.titleKo : c.title}
                  </option>
                ))}
              </select>
            </label>

            {kind === "track" ? (
              <div className="space-y-2 rounded-xl border border-dashed border-stone-400/70 bg-white/40 p-3">
                <p className="text-xs font-semibold text-stone-700">
                  {isKorean
                    ? "트랙을 붙이면 더 잘 보여요 (필수는 아님)"
                    : "Attach a track to stand out (optional)"}
                </p>
                <input
                  value={trackSearch}
                  onChange={(e) => setTrackSearch(e.target.value)}
                  placeholder={isKorean ? "트랙 검색" : "Search tracks"}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
                <select
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">{isKorean ? "트랙 없이 올리기" : "Post without track"}</option>
                  {(picksQuery.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} — {t.creatorName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => createMutation.mutate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-3 text-sm font-bold text-[#F7F1E3] transition hover:bg-stone-800 disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isKorean ? "게시" : "Post"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { YoutubePlayer, extractYoutubeId } from "@/components/YoutubePlayer";
import { Music, Maximize2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { GuestCheerModal } from "@/components/GuestCheerModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { classifyStreamingSource } from "@/lib/streamingEmbed";
import { usePlayableStreamingSrc } from "@/hooks/use-playable-streaming-src";
import { buildIntentOverlay } from "@/lib/intentOverlay";
import { SunoEmbedOutboundShield } from "@/components/SunoEmbedOutboundShield";

export type TrackFeedSnapshot = {
  id: number;
  title: string;
  creatorName: string;
  audioUrl?: string | null;
  mvUrl?: string | null;
  trackType?: string | null;
  aiPrompt?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: TrackFeedSnapshot | null;
  /** Scroll / focus the comment composer when the dialog opens */
  focusCommentOnOpen?: boolean;
};

type CommentRow = {
  id: number;
  userId: string;
  content: string;
  createdAt: string;
  authorName: string | null;
};

export function TrackFeedModal({ open, onOpenChange, track, focusCommentOnOpen }: Props) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const mediaShellRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [commentText, setCommentText] = useState("");
  const [guestGateOpen, setGuestGateOpen] = useState(false);

  const trackId = track?.id ?? 0;
  const title = track?.title ?? "";
  const creatorName = track?.creatorName ?? "";
  const audioUrl = track?.audioUrl;
  const mvUrl = track?.mvUrl;
  const trackType = track?.trackType;
  const aiPrompt = track?.aiPrompt;

  const isVideo = trackType === "video";
  const primaryMedia = isVideo ? mvUrl || audioUrl : audioUrl || mvUrl;
  const ytIdFromMv = extractYoutubeId(mvUrl || undefined);
  const ytIdFromAudio = extractYoutubeId(audioUrl || undefined);
  const ytId = isVideo ? ytIdFromMv || ytIdFromAudio : ytIdFromAudio || ytIdFromMv;
  const { iframeSrc: playableSrc, loading: streamLoading, error: streamError } = usePlayableStreamingSrc(
    !ytId ? primaryMedia : undefined,
    { autoplay: true, enableJsApi: true },
  );
  const embedKind = classifyStreamingSource(primaryMedia || undefined);
  const isWide = !!(
    ytId ||
    (playableSrc && (isVideo || embedKind === "vimeo" || embedKind === "youtube"))
  );
  const overlay = buildIntentOverlay(aiPrompt);

  const { data: comments = [] } = useQuery<CommentRow[]>({
    queryKey: ["/api/tracks", trackId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/tracks/${trackId}/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json();
    },
    enabled: open && trackId > 0,
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/tracks/${trackId}/comments`, { content: commentText }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/tracks", trackId, "comments"] });
      toast({ title: "Comment posted" });
    },
    onError: () => {
      toast({
        title: "Login required",
        description: "Please log in to leave a comment.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!open) {
      setCommentText("");
      return;
    }
    if (!focusCommentOnOpen) return;
    const id = window.setTimeout(() => {
      commentRef.current?.focus({ preventScroll: false });
      commentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(id);
  }, [open, focusCommentOnOpen, trackId]);

  const requestMediaFullscreen = () => {
    const el = mediaShellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void el.requestFullscreen?.();
  };

  const onSubmitComment = () => {
    if (!isAuthenticated) {
      setGuestGateOpen(true);
      return;
    }
    if (!commentText.trim()) return;
    commentMutation.mutate();
  };

  if (!track) return null;

  return (
    <>
      <GuestCheerModal open={guestGateOpen} onOpenChange={setGuestGateOpen} />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isVideo
            ? "max-w-[min(100vw-0.5rem,72rem)] w-[min(98vw,72rem)] max-h-[min(96vh,900px)] overflow-y-auto bg-[#0a0a0a] border-white/10 text-white p-4 sm:p-6 gap-4"
            : "max-w-[min(100vw-1.5rem,36rem)] max-h-[min(96vh,880px)] overflow-y-auto bg-[#0a0a0a] border-white/10 text-white p-4 sm:p-6 gap-4"
        }
      >
        <DialogHeader className="space-y-1 text-left pr-8">
          <DialogTitle
            className="font-display font-bold text-white uppercase tracking-tight leading-snug neon-text-strong neon-text-green text-sm sm:text-base md:text-lg"
            style={{ fontSize: "clamp(0.8rem, 3.5vw, 1.05rem)" }}
          >
            {title}
          </DialogTitle>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
            {creatorName}
          </p>
          <Link
            href={`/track/${trackId}`}
            className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-primary w-fit"
          >
            Full track page →
          </Link>
        </DialogHeader>

        <div className="space-y-2">
          <div
            ref={mediaShellRef}
            className={`relative w-full rounded-sm overflow-hidden border border-white/10 bg-black ${
              ytId || embedKind === "youtube" || embedKind === "vimeo"
                ? isWide
                  ? "aspect-video max-h-[min(55vh,720px)]"
                  : "aspect-square max-h-[min(50vh,320px)] mx-auto"
                : embedKind === "soundcloud"
                  ? "min-h-[166px] h-[180px] sm:h-[200px]"
                  : embedKind === "suno"
                    ? "min-h-[260px] h-[300px] sm:h-[340px]"
                    : isWide
                      ? "aspect-video max-h-[min(55vh,720px)]"
                      : "aspect-square max-h-[min(50vh,320px)] mx-auto"
            }`}
          >
            {ytId ? (
              <YoutubePlayer videoId={ytId} autoplay className="!h-full !min-h-0" />
            ) : streamLoading && !playableSrc ? (
              <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-center px-4">
                  {t("suno.resolving")}
                </p>
              </div>
            ) : playableSrc ? (
              <>
                <iframe
                  key={playableSrc}
                  title={title}
                  src={playableSrc}
                  width="100%"
                  height="100%"
                  className="w-full h-full min-h-[200px]"
                  style={{ border: "none" }}
                  allow="autoplay; encrypted-media; fullscreen; clipboard-write; picture-in-picture"
                  allowFullScreen
                  {...(embedKind === "suno"
                    ? { referrerPolicy: "strict-origin-when-cross-origin" as const }
                    : {})}
                />
                {embedKind === "suno" ? <SunoEmbedOutboundShield /> : null}
              </>
            ) : streamError ? (
              <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 px-4 text-center">
                <Music className="w-12 h-12 text-zinc-700" />
                <p className="text-[10px] text-zinc-400 leading-relaxed">{streamError}</p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-16 h-16 text-zinc-700" />
              </div>
            )}
          </div>
          {isVideo && isWide ? (
            <button
              type="button"
              onClick={requestMediaFullscreen}
              data-testid="button-mv-fullscreen-feed"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-black uppercase tracking-[0.25em] border border-primary/35 text-primary bg-primary/10 hover:bg-primary/20 rounded-sm transition-premium"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              View fullscreen
            </button>
          ) : null}
        </div>

        <div className="rounded-sm border border-white/10 bg-black/35 backdrop-blur-sm p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/90">Prompt Recipe</p>
            {overlay.showQualityWarning ? (
              <span className="text-[9px] uppercase tracking-widest text-yellow-300">
                Intent quality is weak
              </span>
            ) : null}
          </div>
          <div className="rounded-sm border border-primary/30 bg-primary/10 px-2.5 py-2">
            <p className="text-[11px] text-zinc-200 whitespace-pre-wrap max-h-24 overflow-y-auto">
              {overlay.promptRecipeText || "Prompt asset is not set."}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Comments</p>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {comments.length === 0 ? (
              <p className="text-[11px] text-zinc-600">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="text-[11px] border border-white/5 rounded-sm px-3 py-2 bg-black/30"
                >
                  <span className="font-bold text-primary/80">{c.authorName || "Creator"}</span>
                  <p className="text-zinc-300 mt-1 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))
            )}
          </div>
          <Textarea
            ref={commentRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            className="min-h-[88px] bg-black/40 border-white/10 text-sm text-white"
            data-testid={`textarea-feed-comment-${trackId}`}
          />
          <button
            type="button"
            disabled={commentMutation.isPending || !commentText.trim()}
            onClick={onSubmitComment}
            className="w-full text-[10px] font-bold uppercase tracking-widest bg-primary/15 border border-primary/40 text-primary py-2.5 rounded-sm hover:bg-primary/25 disabled:opacity-40"
          >
            {commentMutation.isPending ? "Sending…" : "Post comment"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

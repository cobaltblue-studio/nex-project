import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pencil,
  Trash2,
  Music,
  User,
  Tag,
  ImageIcon,
  ChevronDown,
  Heart,
  MessageCircle,
  Link2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GuestCheerModal } from "@/components/GuestCheerModal";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_CREATOR_AI_PROMPT_EDITS,
  HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS,
  MAX_TRACK_ARTISTIC_INTENT_CHARS,
  MIN_TRACK_ARTISTIC_INTENT_CHARS,
} from "@shared/constants";

const GENRES = [
  "Pop",
  "Dance",
  "Rock",
  "Hip-Hop & Rap",
  "Funk",
  "Lo-Fi & Chill",
] as const;

const editSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  artistName: z.string().min(1, "Creator name is required").max(80),
  genre: z.enum(GENRES),
  audioUrl: z
    .string()
    .min(1, "Stream link is required")
    .max(2048)
    .refine(
      (s) => {
        try {
          const u = new URL(s.trim());
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Must be a valid http(s) URL (Suno, YouTube, SoundCloud, …)" },
    ),
  mvUrl: z
    .string()
    .max(2048)
    .optional()
    .transform((s) => (s === undefined ? "" : s.trim()))
    .refine(
      (s) => {
        if (!s) return true;
        try {
          const u = new URL(s);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Must be a valid http(s) URL or leave empty" },
    ),
  coverImageUrl: z
    .string()
    .max(2048)
    .optional()
    .transform((s) => (!s?.trim() ? undefined : s.trim()))
    .refine(
      (s) => {
        if (s === undefined) return true;
        try {
          const u = new URL(s);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Must be a valid http(s) image URL" },
    ),
  aiPrompt: z
    .string()
    .max(MAX_TRACK_ARTISTIC_INTENT_CHARS)
    .transform((s) => s.trim())
    .refine(
      (t) => t.length === 0 || t.length >= MIN_TRACK_ARTISTIC_INTENT_CHARS,
      {
        message: `Artistic intent must be at least ${MIN_TRACK_ARTISTIC_INTENT_CHARS} characters when provided`,
      },
    ),
});

export type TrackAdminListItem = {
  id: number;
  /** Profile id of the track owner; required for production artist checks. */
  creatorId?: number | null;
  title: string;
  creatorName: string;
  genre: string;
  coverImageUrl?: string | null;
  /** Stream / share link (Suno, YouTube, SoundCloud, …) — required in DB */
  audioUrl?: string | null;
  mvUrl?: string | null;
  trackType?: string | null;
  aiPrompt?: string | null;
  aiPromptEditCount?: number | null;
  aiPromptLastEditedAt?: string | null;
  /** From track_metrics when available (list APIs). */
  likesCount?: number | null;
};

type EditForm = z.infer<typeof editSchema>;

function normalizeGenre(g: string): EditForm["genre"] {
  return (GENRES as readonly string[]).includes(g) ? (g as EditForm["genre"]) : "Pop";
}

function invalidateTrackQueries(trackId: number) {
  queryClient.invalidateQueries({ queryKey: [api.tracks.list.path] });
  queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
  queryClient.invalidateQueries({ queryKey: [api.tracks.get.path, String(trackId)] });
  queryClient.invalidateQueries({ queryKey: [api.tracks.get.path, trackId] });
  queryClient.invalidateQueries({ queryKey: ["/api/tracks/rising"] });
}

type Props = {
  track: TrackAdminListItem;
  /** Smaller buttons for dense list rows */
  compact?: boolean;
  /** After delete on a standalone detail view, navigate here (default /music) */
  deleteRedirectTo?: string | null;
  /** Chart/MV list: open parent detail+comments modal instead of the small comment popover */
  onCommentClick?: () => void;
};

function TrackSocialActions({
  trackId,
  compact,
  likesCount,
  onCommentClick,
}: {
  trackId: number;
  compact?: boolean;
  likesCount?: number | null;
  onCommentClick?: () => void;
}) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [guestCheerOpen, setGuestCheerOpen] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/tracks/${trackId}/like`, {}),
    onSuccess: () => {
      invalidateTrackQueries(trackId);
      void queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      toast({ title: "Liked", description: " saved to your picks." });
    },
    onError: (err: Error) => {
      if (String(err?.message ?? "").startsWith("409")) {
        toast({
          title: "Thanks for the love",
          description: "You already cheered this track today. You can tap like again tomorrow.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Login required",
        description: "Sign in to like tracks.",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/tracks/${trackId}/comments`, { content: commentText }),
    onSuccess: () => {
      setCommentOpen(false);
      setCommentText("");
      toast({ title: "Comment posted" });
    },
    onError: () => {
      toast({
        title: "Login required",
        description: "Sign in to leave a comment.",
        variant: "destructive",
      });
    },
  });

  const iconBtn =
    "font-bold uppercase tracking-widest transition-all border rounded-sm flex items-center justify-center gap-1 disabled:opacity-40";
  const size = compact
    ? `${iconBtn} text-[8px] px-2 py-1 border-white/15 text-zinc-400 hover:text-primary hover:border-primary/40 bg-black/30`
    : `${iconBtn} text-[9px] px-3 py-2 border-white/15 text-zinc-400 hover:text-primary hover:border-primary/40 bg-black/20`;
  const likeCount = likesCount ?? 0;

  const onLike = () => {
    if (!isAuthenticated) {
      setGuestCheerOpen(true);
      return;
    }
    likeMutation.mutate();
  };

  const openComment = () => {
    if (!isAuthenticated) {
      setGuestCheerOpen(true);
      return;
    }
    if (onCommentClick) {
      onCommentClick();
      return;
    }
    setCommentOpen(true);
  };

  return (
    <>
      <GuestCheerModal open={guestCheerOpen} onOpenChange={setGuestCheerOpen} />
      <div className={`flex items-center gap-1.5 shrink-0 ${compact ? "" : "flex-wrap"}`}>
        <button
          type="button"
          onClick={onLike}
          disabled={likeMutation.isPending}
          className={size}
          title={`${likeCount} likes`}
          data-testid={`button-track-like-${trackId}`}
        >
          <Heart className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span className="tabular-nums text-zinc-300 min-w-[1.25rem] text-right">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={openComment}
          className={size}
          title="COMMENT"
          data-testid={`button-track-comment-${trackId}`}
        >
          <MessageCircle className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
          <span className="hidden sm:inline">Comment</span>
        </button>
      </div>

      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="max-w-md bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-display uppercase tracking-[0.2em] text-primary">Comment</DialogTitle>
          </DialogHeader>
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            className="min-h-[100px] bg-black/40 border-white/10 text-sm text-white"
            data-testid={`textarea-track-comment-${trackId}`}
          />
          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCommentOpen(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-4 py-2 border border-white/10 rounded-sm hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={commentMutation.isPending || !commentText.trim()}
              onClick={() => commentMutation.mutate()}
              className="text-[10px] font-bold uppercase tracking-widest bg-primary/15 border border-primary/40 text-primary px-4 py-2 rounded-sm hover:bg-primary/25 disabled:opacity-40"
              data-testid={`submit-track-comment-${trackId}`}
            >
              {commentMutation.isPending ? "Sending…" : "Post"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TrackAdminActions({ track, compact, deleteRedirectTo = null, onCommentClick }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { user, isAuthenticated } = useAuth();

  const { data: myProfile, isLoading: profileLoading } = useQuery<{ id: number }>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const isAdmin = user?.role === "admin";
  const trackOwnerId = track.creatorId ?? null;
  const isOwner =
    trackOwnerId != null && myProfile?.id != null && myProfile.id === trackOwnerId;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editRequestOpen, setEditRequestOpen] = useState(false);
  const [editRequestDetail, setEditRequestDetail] = useState("");
  const [editRequestLink, setEditRequestLink] = useState("");
  const [intentEditOpen, setIntentEditOpen] = useState(false);
  const [intentDraft, setIntentDraft] = useState("");

  useEffect(() => {
    if (intentEditOpen) setIntentDraft((track.aiPrompt ?? "").trim());
  }, [intentEditOpen, track.aiPrompt, track.id]);

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: track.title,
      artistName: track.creatorName,
      genre: normalizeGenre(track.genre),
      audioUrl: track.audioUrl?.trim() || "",
      mvUrl: track.mvUrl?.trim() || "",
      coverImageUrl: track.coverImageUrl ?? "",
      aiPrompt: (track.aiPrompt ?? "").trim(),
    },
  });

  useEffect(() => {
    if (!editOpen) return;
    form.reset({
      title: track.title,
      artistName: track.creatorName,
      genre: normalizeGenre(track.genre),
      audioUrl: track.audioUrl?.trim() || "",
      mvUrl: track.mvUrl?.trim() || "",
      coverImageUrl: track.coverImageUrl ?? "",
      aiPrompt: (track.aiPrompt ?? "").trim(),
    });
  }, [
    editOpen,
    track.id,
    track.title,
    track.creatorName,
    track.genre,
    track.audioUrl,
    track.mvUrl,
    track.coverImageUrl,
    track.aiPrompt,
    form,
  ]);

  const patchMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/tracks/${track.id}`, body).then((r) => r.json()),
    onSuccess: () => {
      invalidateTrackQueries(track.id);
      queryClient.invalidateQueries({ queryKey: ["/api/tracks/my"] });
      setEditOpen(false);
      toast({ title: "Saved", description: "Track updated." });
    },
    onError: (err: Error) => {
      toast({
        title: "Update failed",
        description: err.message || "Could not save changes.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/tracks/${track.id}`),
    onSuccess: () => {
      invalidateTrackQueries(track.id);
      queryClient.invalidateQueries({ queryKey: ["/api/tracks/my"] });
      setDeleteOpen(false);
      toast({ title: "Deleted", description: "Track removed from the database." });
      if (deleteRedirectTo) navigate(deleteRedirectTo);
    },
    onError: (err: Error) => {
      toast({
        title: "Delete failed",
        description: err.message || "Could not delete track.",
        variant: "destructive",
      });
    },
  });

  const editRequestMutation = useMutation({
    mutationFn: (payload: { detail: string; proposedLink?: string }) =>
      apiRequest(
        "POST",
        `/api/tracks/${track.id}/edit-request`,
        payload,
      ),
    onSuccess: () => {
      setEditRequestOpen(false);
      setEditRequestDetail("");
      setEditRequestLink("");
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/track-edit-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/tracks", track.id, "comments"] });
      toast({
        title: i18n.t("trackAdmin.editRequestSentTitle"),
        description: i18n.t("trackAdmin.editRequestSentDesc"),
      });
    },
    onError: (err: Error) => {
      toast({
        title: i18n.t("trackAdmin.editRequestFailTitle"),
        description: err.message || i18n.t("trackAdmin.editRequestFailDesc"),
        variant: "destructive",
      });
    },
  });

  const onSave = (data: EditForm) => {
    patchMutation.mutate({
      title: data.title,
      artistName: data.artistName,
      genre: data.genre,
      audioUrl: data.audioUrl.trim(),
      mvUrl: data.mvUrl?.trim() ? data.mvUrl.trim() : null,
      coverImageUrl: data.coverImageUrl ?? null,
      aiPrompt: data.aiPrompt.length >= MIN_TRACK_ARTISTIC_INTENT_CHARS ? data.aiPrompt : null,
    });
  };

  const intentPatchMutation = useMutation({
    mutationFn: (aiPrompt: string) =>
      apiRequest("PATCH", `/api/tracks/${track.id}`, { aiPrompt }).then((r) => r.json()),
    onSuccess: () => {
      invalidateTrackQueries(track.id);
      void queryClient.invalidateQueries({ queryKey: ["/api/tracks/my"] });
      setIntentEditOpen(false);
      toast({ title: i18n.t("trackAdmin.intentSavedTitle"), description: i18n.t("trackAdmin.intentSavedDesc") });
    },
    onError: (err: Error) => {
      toast({
        title: i18n.t("trackAdmin.intentSaveFailTitle"),
        description: err.message || i18n.t("trackAdmin.intentSaveFailDesc"),
        variant: "destructive",
      });
    },
  });

  const showManageTools = isAuthenticated && isAdmin;
  const showRequestEdit = isAuthenticated && !isAdmin && !profileLoading && isOwner && !compact;
  const showCreatorIntentEdit = showRequestEdit;

  const editCount = track.aiPromptEditCount ?? 0;
  const lastIntentEditMs = track.aiPromptLastEditedAt
    ? new Date(track.aiPromptLastEditedAt).getTime()
    : null;
  const cooldownMs = HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS * 60 * 60 * 1000;
  const nextIntentEditAt =
    editCount >= 1 && lastIntentEditMs != null ? lastIntentEditMs + cooldownMs : null;
  const intentCooldownActive = nextIntentEditAt != null && Date.now() < nextIntentEditAt;
  const canEditIntent =
    showCreatorIntentEdit && editCount < MAX_CREATOR_AI_PROMPT_EDITS && !intentCooldownActive;
  const intentRemaining = Math.max(0, MAX_CREATOR_AI_PROMPT_EDITS - editCount);

  const btnBase =
    "font-bold uppercase tracking-widest transition-all border rounded-sm flex items-center justify-center gap-1.5 disabled:opacity-40";
  const compactCls = compact
    ? `${btnBase} text-[8px] px-2 py-1 border-white/15 text-zinc-500 hover:text-primary hover:border-primary/40 bg-black/30`
    : `${btnBase} text-[9px] px-3 py-2 border-white/15 text-zinc-400 hover:text-primary hover:border-primary/40 bg-black/20`;

  return (
    <>
      <div className={`flex items-center gap-1.5 shrink-0 ${compact ? "" : "flex-wrap"}`}>
        <TrackSocialActions
          trackId={track.id}
          compact={compact}
          likesCount={track.likesCount}
          onCommentClick={onCommentClick}
        />
        {showManageTools ? (
          <>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={compactCls}
              data-testid={`button-track-edit-${track.id}`}
            >
              <Pencil className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className={
                compact
                  ? `${btnBase} text-[8px] px-2 py-1 border-red-500/25 text-red-400/90 hover:bg-red-500/10 hover:border-red-500/40 bg-black/30`
                  : `${btnBase} text-[9px] px-3 py-2 border-red-500/25 text-red-400/90 hover:bg-red-500/10 hover:border-red-500/40 bg-black/20`
              }
              data-testid={`button-track-delete-${track.id}`}
            >
              <Trash2 className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
              Delete
            </button>
          </>
        ) : null}
        {showRequestEdit ? (
          <button
            type="button"
            onClick={() => setEditRequestOpen(true)}
            disabled={editRequestMutation.isPending}
            className={compactCls}
            data-testid={`button-track-edit-request-${track.id}`}
          >
            <MessageCircle className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            {editRequestMutation.isPending ? "Sending..." : "Request Edit"}
          </button>
        ) : null}
        {showCreatorIntentEdit ? (
          <button
            type="button"
            onClick={() => canEditIntent && setIntentEditOpen(true)}
            disabled={!canEditIntent || intentPatchMutation.isPending}
            title={
              !canEditIntent
                ? intentRemaining <= 0
                  ? t("trackAdmin.intentExhaustedTitle")
                  : intentCooldownActive && nextIntentEditAt != null
                    ? t("trackAdmin.intentCooldownTitle", {
                        hours: Math.max(1, Math.ceil((nextIntentEditAt - Date.now()) / (60 * 60 * 1000))),
                      })
                    : t("trackAdmin.intentCannotEditTitle")
                : t("trackAdmin.intentEditButtonTitle")
            }
            className={compactCls}
            data-testid={`button-track-edit-intent-${track.id}`}
          >
            <Sparkles className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            {t("trackAdmin.editIntentShort")}
          </button>
        ) : null}
      </div>

      {showRequestEdit ? (
        <Dialog open={editRequestOpen} onOpenChange={setEditRequestOpen}>
          <DialogContent className="max-w-lg bg-[#0a0a0a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-sm font-display uppercase tracking-[0.2em] text-primary">
                Request edit
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Textarea
                value={editRequestDetail}
                onChange={(e) => setEditRequestDetail(e.target.value)}
                placeholder={t("trackAdmin.claimPlaceholder")}
                className="min-h-[96px] bg-black/40 border-white/10 text-sm text-white"
                data-testid={`textarea-edit-request-${track.id}`}
              />
              <input
                type="url"
                value={editRequestLink}
                onChange={(e) => setEditRequestLink(e.target.value)}
                placeholder={t("trackAdmin.replacementLinkPlaceholder")}
                className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50"
                data-testid={`input-edit-request-link-${track.id}`}
              />
              <DialogFooter className="gap-2 sm:gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditRequestOpen(false)}
                  className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-4 py-2 border border-white/10 rounded-sm hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editRequestMutation.isPending || editRequestDetail.trim().length < 10}
                  onClick={() =>
                    editRequestMutation.mutate({
                      detail: editRequestDetail.trim(),
                      ...(editRequestLink.trim() ? { proposedLink: editRequestLink.trim() } : {}),
                    })
                  }
                  className="text-[10px] font-bold uppercase tracking-widest bg-primary/15 border border-primary/40 text-primary px-4 py-2 rounded-sm hover:bg-primary/25 disabled:opacity-40"
                  data-testid={`button-send-edit-request-${track.id}`}
                >
                  {editRequestMutation.isPending ? "Sending…" : "Send request"}
                </button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {showCreatorIntentEdit ? (
        <Dialog open={intentEditOpen} onOpenChange={setIntentEditOpen}>
          <DialogContent className="max-w-lg bg-[#0a0a0a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-sm font-display uppercase tracking-[0.2em] text-primary">
                {t("trackAdmin.intentDialogTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <p className="text-[10px] text-zinc-500 leading-relaxed normal-case">
                {t("trackAdmin.intentDialogPolicy", {
                  max: MAX_CREATOR_AI_PROMPT_EDITS,
                  hours: HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS,
                })}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                {t("trackAdmin.intentRemainingLabel", { count: intentRemaining })}
              </p>
              <Textarea
                value={intentDraft}
                onChange={(e) => setIntentDraft(e.target.value)}
                placeholder={t("submitTrack.aiPromptPlaceholder", { min: MIN_TRACK_ARTISTIC_INTENT_CHARS })}
                className="min-h-[140px] bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-600"
                data-testid={`dialog-textarea-intent-${track.id}`}
              />
              <p
                className={`text-[9px] font-mono ${intentDraft.trim().length >= MIN_TRACK_ARTISTIC_INTENT_CHARS ? "text-primary/80" : "text-zinc-500"}`}
              >
                {intentDraft.trim().length} / {MIN_TRACK_ARTISTIC_INTENT_CHARS}+
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIntentEditOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-4 py-2 border border-white/10 rounded-sm hover:bg-white/5"
              >
                {t("trackAdmin.intentCancel")}
              </button>
              <button
                type="button"
                disabled={
                  intentPatchMutation.isPending || intentDraft.trim().length < MIN_TRACK_ARTISTIC_INTENT_CHARS
                }
                onClick={() => intentPatchMutation.mutate(intentDraft.trim())}
                className="text-[10px] font-bold uppercase tracking-widest bg-primary/15 border border-primary/40 text-primary px-4 py-2 rounded-sm hover:bg-primary/25 disabled:opacity-40"
                data-testid={`dialog-save-intent-${track.id}`}
              >
                {intentPatchMutation.isPending ? t("trackAdmin.intentSaving") : t("trackAdmin.intentSave")}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {showManageTools ? (
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-display uppercase tracking-[0.2em] text-primary">
              Edit track
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 pt-2">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                <Music className="inline w-3 h-3 mr-1 -mt-0.5" />
                Title
              </label>
              <input
                {...form.register("title")}
                className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                data-testid={`dialog-input-title-${track.id}`}
              />
              {form.formState.errors.title && (
                <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                <User className="inline w-3 h-3 mr-1 -mt-0.5" />
                Creator name
              </label>
              <input
                {...form.register("artistName")}
                className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                data-testid={`dialog-input-artist-${track.id}`}
              />
              {form.formState.errors.artistName && (
                <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.artistName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                <Tag className="inline w-3 h-3 mr-1 -mt-0.5" />
                Genre
              </label>
              <div className="relative">
                <select
                  {...form.register("genre")}
                  className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none"
                  data-testid={`dialog-select-genre-${track.id}`}
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g} className="bg-zinc-900">
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
              {form.formState.errors.genre && (
                <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.genre.message}</p>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                <Link2 className="inline w-3 h-3 mr-1 -mt-0.5" />
                Stream / track link
              </label>
              <input
                {...form.register("audioUrl")}
                type="url"
                inputMode="url"
                placeholder="https://suno.com/… · youtube · soundcloud …"
                className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                data-testid={`dialog-input-audio-${track.id}`}
              />
              <p className="text-[9px] text-zinc-600 mt-1.5 leading-relaxed normal-case">
                {t("trackAdmin.streamHint")}
              </p>
              {form.formState.errors.audioUrl && (
                <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.audioUrl.message}</p>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                <Link2 className="inline w-3 h-3 mr-1 -mt-0.5 opacity-70" />
                Music video URL
                <span className="normal-case text-zinc-600 font-normal tracking-normal ml-1">(optional)</span>
              </label>
              <input
                {...form.register("mvUrl")}
                type="url"
                inputMode="url"
                placeholder="https://… (only if this track has a separate MV)"
                className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                data-testid={`dialog-input-mv-${track.id}`}
              />
              {form.formState.errors.mvUrl && (
                <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.mvUrl.message}</p>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                <ImageIcon className="inline w-3 h-3 mr-1 -mt-0.5" />
                Cover image URL
              </label>
              <input
                {...form.register("coverImageUrl")}
                type="url"
                inputMode="url"
                placeholder="https://…"
                className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                data-testid={`dialog-input-cover-${track.id}`}
              />
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1.5">
                Replace a broken image link or clear the field to remove cover art.
              </p>
              {form.formState.errors.coverImageUrl && (
                <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.coverImageUrl.message}</p>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                <Sparkles className="inline w-3 h-3 mr-1 -mt-0.5" />
                {t("trackAdmin.intentFieldLabel")}
              </label>
              <Textarea
                {...form.register("aiPrompt")}
                rows={5}
                placeholder={t("submitTrack.aiPromptPlaceholder", { min: MIN_TRACK_ARTISTIC_INTENT_CHARS })}
                className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 resize-y min-h-[100px]"
                data-testid={`dialog-input-aiprompt-${track.id}`}
              />
              <p className="text-[9px] text-zinc-600 mt-1.5 normal-case leading-relaxed">
                {t("trackAdmin.intentAdminHint")}
              </p>
              {form.formState.errors.aiPrompt && (
                <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.aiPrompt.message}</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-4 py-2 border border-white/10 rounded-sm hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={patchMutation.isPending}
                className="text-[10px] font-bold uppercase tracking-widest bg-primary/15 border border-primary/40 text-primary px-4 py-2 rounded-sm hover:bg-primary/25 disabled:opacity-40"
                data-testid={`dialog-save-track-${track.id}`}
              >
                {patchMutation.isPending ? "Saving…" : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      ) : null}

      {showManageTools ? (
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-display uppercase tracking-widest">
              Delete track
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              Are you sure you want to delete this track? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-white/10 bg-transparent text-zinc-400 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-[10px] font-bold uppercase tracking-widest rounded-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
              data-testid={`confirm-delete-track-${track.id}`}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      ) : null}
    </>
  );
}

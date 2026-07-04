import { useState, useEffect, useCallback, useMemo, Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  MAX_TRACK_ARTISTIC_INTENT_CHARS,
  MIN_TRACK_ARTISTIC_INTENT_CHARS,
} from "@shared/constants";
import { cn } from "@/lib/utils";
import { usePlayableStreamingSrc } from "@/hooks/use-playable-streaming-src";
import { TrackLimitGuardianModal } from "@/components/TrackLimitGuardianModal";
import {
  Send,
  CheckCircle,
  Music,
  Link,
  ChevronDown,
  User,
  Tag,
  Video,
  Headphones,
  AlertTriangle,
  ImageIcon,
  Loader2,
} from "lucide-react";

class SubmitTrackErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
          <p className="text-lg font-bold text-white uppercase tracking-wider">Something went wrong</p>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Unable to load the submission form.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/30 px-4 py-2 rounded-sm hover:bg-primary/10 transition-all"
            data-testid="button-retry-submit"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const GENRES = [
  "Pop",
  "Dance",
  "Rock",
  "Hip-Hop & Rap",
  "Funk",
  "Lo-Fi & Chill",
] as const;

const SUPPORTED_LINKS = [
  { name: "YouTube", pattern: /youtube\.com|youtu\.be/ },
  { name: "SoundCloud", pattern: /soundcloud\.com/ },
  { name: "Suno", pattern: /suno\.com|suno\.ai/ },
];

const TRACK_TYPES = ["audio", "video"] as const;

function makeSubmitSchema(t: TFunction, isKorean: boolean, needsContactEmail: boolean) {
  return z.object({
    title: z
      .string()
      .min(1, "Track title is required")
      .max(120, "Title too long"),
    artistName: z
      .string()
      .min(1, "Creator name is required")
      .max(80, "Name too long"),
    genre: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.enum(GENRES, { required_error: "Genre is required" }),
    ),
    trackType: z.enum(TRACK_TYPES),
    trackLink: z
      .string()
      .url("Must be a valid URL")
      .refine(
        (url) => SUPPORTED_LINKS.some(({ pattern }) => pattern.test(url)),
        "Only YouTube, SoundCloud, or Suno links are accepted",
      ),
    portfolioLink: z
      .string()
      .url("Social/Portfolio link must be a valid URL")
      .refine((s) => /^https?:\/\//i.test(s), "Social/Portfolio link must start with http(s)"),
    contactEmail: z.string().max(320).optional().default(""),
    aiPrompt: z
      .string()
      .max(MAX_TRACK_ARTISTIC_INTENT_CHARS, "Prompt too long")
      .refine((s) => s.trim().length >= MIN_TRACK_ARTISTIC_INTENT_CHARS, {
        message: t("submitTrack.validationIntent", { min: MIN_TRACK_ARTISTIC_INTENT_CHARS }),
      }),
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
    originalityConfirmed: z.boolean().refine((val) => val === true, {
      message: "You must confirm this track is original AI-generated content",
    }),
    videoVisibilityConfirmed: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    if (data.trackType === "video" && !data.videoVisibilityConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["videoVisibilityConfirmed"],
        message: isKorean
          ? "뮤직비디오는 공개 상태이며 로그인 없이 재생되고 임베드 차단이 없는지 확인 후 제출해야 합니다"
          : "For music videos, confirm the link is public, playable without login, and not blocked from embeds before submitting.",
      });
    }
    const contactEmail = String(data.contactEmail ?? "").trim().toLowerCase();
    const contactEmailValid =
      !!contactEmail &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) &&
      !contactEmail.endsWith("@artist.local") &&
      !contactEmail.endsWith("@neo.ai");
    if (needsContactEmail && !contactEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactEmail"],
        message: isKorean
          ? "배틀/좋아요/팔로우 알림을 받으려면 실제 이메일 주소를 입력해야 합니다"
          : "Enter a reachable email address to receive battle, like, play, and follow alerts.",
      });
    } else if (contactEmail && !contactEmailValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactEmail"],
        message: isKorean
          ? "실제로 수신 가능한 이메일 주소를 입력해 주세요"
          : "Please enter a real, reachable email address.",
      });
    }
  });
}

type FormData = z.infer<ReturnType<typeof makeSubmitSchema>>;

type MeProfile = { id: number; role: string };

function SubmitTrackForm() {
  const { t, i18n } = useTranslation();
  const isKorean = (i18n.resolvedLanguage ?? i18n.language ?? "").toLowerCase().startsWith("ko");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const needsContactEmail = user?.hasDeliverableEmail === false;
  const schema = useMemo(() => makeSubmitSchema(t, isKorean, needsContactEmail), [t, isKorean, needsContactEmail]);
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [trackId, setTrackId] = useState<number | null>(null);
  const [submittedTrackType, setSubmittedTrackType] = useState<string>("audio");

  const [duplicateUrl, setDuplicateUrl] = useState(false);

  const maySubmit = isAuthenticated;

  const { data: meProfile } = useQuery<MeProfile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const showListenerSubmitNotice = isAuthenticated && meProfile?.role === "listener";

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    if (!maySubmit) setLocation("/");
  }, [authLoading, isAuthenticated, maySubmit, setLocation]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      artistName: "",
      trackType: "audio",
      trackLink: "",
      portfolioLink: "",
      contactEmail: "",
      aiPrompt: "",
      coverImageUrl: "",
      originalityConfirmed: false,
      videoVisibilityConfirmed: false,
    },
  });

  const watchedLink = form.watch("trackLink");
  const {
    iframeSrc: linkPreviewSrc,
    loading: linkPreviewLoading,
    error: linkPreviewError,
  } = usePlayableStreamingSrc(watchedLink || undefined, { autoplay: false, enableJsApi: false });
  const watchedArtisticIntent = form.watch("aiPrompt") ?? "";
  const artisticIntentLen = watchedArtisticIntent.trim().length;
  const artisticIntentMeetsMin = artisticIntentLen >= MIN_TRACK_ARTISTIC_INTENT_CHARS;

  const checkDuplicateUrl = useCallback(async (url: string) => {
    if (!url) {
      setDuplicateUrl(false);
      return;
    }
    try {
      new URL(url);
    } catch {
      setDuplicateUrl(false);
      return;
    }
    try {
      const res = await fetch(`/api/tracks/check-url?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setDuplicateUrl(data.exists);
      } else {
        setDuplicateUrl(false);
      }
    } catch {
      setDuplicateUrl(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      checkDuplicateUrl(watchedLink);
    }, 500);
    return () => clearTimeout(timeout);
  }, [watchedLink, checkDuplicateUrl]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/tracks", {
        ...data,
        aiPrompt: data.aiPrompt.trim(),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      setTrackId(data.trackId);
      setSubmittedTrackType(data.trackType || "audio");
      setSubmitted(true);
      console.info("Success: track submission saved", data);
    },
  });

  const onSubmit = (data: FormData) => {
    if (duplicateUrl) return;
    mutation.mutate(data);
  };

  const detectedPlatform = (() => {
    const link = form.watch("trackLink");
    if (!link) return null;
    return (
      SUPPORTED_LINKS.find(({ pattern }) => pattern.test(link))?.name ?? null
    );
  })();
  const linkLooksPlayable =
    !!watchedLink &&
    !!detectedPlatform &&
    !!linkPreviewSrc &&
    !linkPreviewLoading &&
    !linkPreviewError &&
    !duplicateUrl &&
    !form.formState.errors.trackLink;
  const isVideoSubmission = form.watch("trackType") === "video";
  const videoVisibilityConfirmed = !!form.watch("videoVisibilityConfirmed");
  const videoReadyToSubmit = !isVideoSubmission || videoVisibilityConfirmed;
  const contactEmailValue = String(form.watch("contactEmail") ?? "").trim().toLowerCase();
  const contactEmailReadyToSubmit =
    !needsContactEmail ||
    (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailValue) &&
      !contactEmailValue.endsWith("@artist.local") &&
      !contactEmailValue.endsWith("@neo.ai"));

  if (authLoading || !isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Checking permissions...</p>
      </div>
    );
  }

  if (!maySubmit) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto submit-track-form">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Send className="w-5 h-5 text-primary" />
          <p className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary">
            NEX Platform
          </p>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-tight text-white neon-text-strong neon-text-green">
          SUBMIT TRACK
        </h1>
        <p className="text-zinc-500 text-sm mt-2">
          AI-generated music · Verified through Battle
        </p>
        <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed normal-case">
          {t("submitTrack.adminBlurb")}
        </p>
        {showListenerSubmitNotice ? (
          <p
            className="text-[11px] text-amber-200/90 mt-3 p-3 rounded-sm border border-amber-500/25 bg-amber-500/5 leading-relaxed normal-case"
            data-testid="text-listener-submit-notice"
          >
            {t("submitTrack.listenerSubmitNotice")}
          </p>
        ) : null}
        {needsContactEmail ? (
          <p
            className="text-[11px] text-amber-200/90 mt-3 p-3 rounded-sm border border-amber-500/25 bg-amber-500/5 leading-relaxed normal-case"
            data-testid="text-contact-email-required-notice"
          >
            {isKorean
              ? "현재 계정에는 실제 발송 가능한 이메일이 저장되어 있지 않습니다. 아래에 연락 가능한 이메일을 입력해야 배틀 승리, 재생, 좋아요, 팔로우, 링크 수정 요청 메일을 영어→한국어 순으로 받을 수 있습니다."
              : "This account does not currently have a reachable email on file. Enter a contact email below so NEX can send battle wins, plays, likes, follows, and link-fix alerts in English first and Korean second."}
          </p>
        ) : null}
      </div>

      {/* Status path */}
      <div className="flex items-center gap-2 mb-8 text-[9px] font-bold uppercase tracking-widest">
        {form.watch("trackType") === "video" ? (
          <>
            <span className="px-2 py-1 rounded-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              PENDING
            </span>
            <span className="text-zinc-700">→</span>
            <span className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-zinc-500">
              ADMIN REVIEW
            </span>
            <span className="text-zinc-700">→</span>
            <span className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-zinc-500">
              MV PAGE
            </span>
          </>
        ) : (
          <>
            <span className="px-2 py-1 rounded-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              PENDING
            </span>
            <span className="text-zinc-700">→</span>
            <span className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-zinc-500">
              ADMIN REVIEW
            </span>
            <span className="text-zinc-700">→</span>
            <span className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-zinc-500">
              BATTLE
            </span>
            <span className="text-zinc-700">→</span>
            <span className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-zinc-500">
              CHART
            </span>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-primary/30 bg-primary/5 rounded-sm p-8 text-center"
          >
            <CheckCircle
              className="w-10 h-10 text-primary mx-auto mb-4"
              strokeWidth={1.5}
            />
            <p className="text-lg font-black uppercase tracking-[0.15em] text-white mb-1">
              Success
            </p>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-6">
              Your {submittedTrackType === "video" ? "music video" : "track"} is submitted and pending review · ID #{trackId}
            </p>
            <div className="text-left border border-white/5 rounded-sm p-4 bg-black/30 mb-6 text-[10px] text-zinc-400 uppercase tracking-widest space-y-2">
              {submittedTrackType === "video" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Status</span>
                    <span className="text-yellow-400 font-bold">PENDING</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Pipeline</span>
                    <span>Admin review → MV page</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Status</span>
                    <span className="text-yellow-400 font-bold">PENDING</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Battle entry</span>
                    <span>After admin approval (BATTLE_POOL)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Chart entry</span>
                    <span>10+ Battles · 55%+ Win Rate</span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setTrackId(null);
                form.reset();
              }}
              data-testid="button-submit-another"
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors border border-white/10 hover:border-primary/30 px-4 py-2 rounded-sm"
            >
              Submit Another Track
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <fieldset className="space-y-5 disabled:opacity-50 disabled:pointer-events-none">
              {/* Track Title */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <Music className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Track Title#
                </label>
                <input
                  {...form.register("title")}
                  placeholder="Enter your track title"
                  data-testid="input-track-title"
                  className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {form.formState.errors.title && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              {/* Creator Name */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <User className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Creator Name
                </label>
                <input
                  {...form.register("artistName")}
                  data-testid="input-creator-name"
                  className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {form.formState.errors.artistName && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.artistName.message}
                  </p>
                )}
              </div>

              {/* Genre */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <Tag className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Genre
                </label>
                <div className="relative">
                  <select
                    {...form.register("genre")}
                    data-testid="select-genre"
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all appearance-none"
                    defaultValue=""
                  >
                    <option value="" disabled className="bg-zinc-900 text-zinc-500">
                      Select a genre
                    </option>
                    {GENRES.map((g) => (
                      <option key={g} value={g} className="bg-zinc-900 text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                </div>
                {form.formState.errors.genre && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.genre.message}
                  </p>
                )}
              </div>

              {/* Track Type */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <Tag className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Track Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => form.setValue("trackType", "audio", { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    data-testid="radio-track-type-audio"
                    className={`flex items-center justify-center gap-2 py-3 rounded-sm border text-[10px] font-bold uppercase tracking-widest transition-all ${
                      form.watch("trackType") === "audio"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    Audio Track
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue("trackType", "video", { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    data-testid="radio-track-type-video"
                    className={`flex items-center justify-center gap-2 py-3 rounded-sm border text-[10px] font-bold uppercase tracking-widest transition-all ${
                      form.watch("trackType") === "video"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Music Video
                  </button>
                </div>
              </div>

              {/* Track Link */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <Link className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Track Link
                </label>
                <div className="relative">
                  <input
                    {...form.register("trackLink")}
                    placeholder={t("submitTrack.linkPlaceholder")}
                    data-testid="input-track-link"
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 pr-28 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  {detectedPlatform && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-sm">
                      {detectedPlatform}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-zinc-600 mt-1.5 leading-relaxed normal-case">
                  <span className="uppercase tracking-widest text-zinc-700 block mb-1">
                    {t("submitTrack.sunoHelp")}
                  </span>
                  {t("submitTrack.supportedPlatforms")}
                </p>
                {linkPreviewLoading && detectedPlatform === "Suno" && (
                  <p className="text-[9px] text-primary/80 uppercase tracking-widest mt-1 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    {t("suno.resolving")}
                  </p>
                )}
                {linkPreviewError && (
                  <p className="text-[9px] text-amber-300/90 mt-1 leading-relaxed normal-case">{linkPreviewError}</p>
                )}
                {linkLooksPlayable && (
                  <p className="text-[9px] text-emerald-300 uppercase tracking-widest mt-1">
                    {t("submitTrack.linkOk")}
                  </p>
                )}
                {!!watchedLink && !form.formState.errors.trackLink && (
                  <a
                    href={watchedLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[9px] text-cyan-300/90 hover:text-cyan-200 uppercase tracking-widest mt-1.5"
                  >
                    <Link className="w-3 h-3" />
                    Open Link to verify playback
                  </a>
                )}
                {form.formState.errors.trackLink && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.trackLink.message}
                  </p>
                )}
                {duplicateUrl && (
                  <div className="flex items-center gap-2 mt-2 p-2.5 border border-red-500/30 bg-red-500/5 rounded-sm" data-testid="warning-duplicate-url">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <p className="text-[10px] text-red-400 uppercase tracking-widest">
                      {t("submitTrack.duplicateUrl")}
                    </p>
                  </div>
                )}
                {isVideoSubmission && (
                  <div
                    className="mt-3 rounded-sm border border-amber-500/25 bg-amber-500/5 p-3 space-y-3"
                    data-testid="warning-video-visibility-check"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">
                          {isKorean ? "뮤직비디오 업로드 전 확인" : "Check before uploading a music video"}
                        </p>
                        <p className="text-[10px] text-amber-100/90 leading-relaxed normal-case">
                          {isKorean
                            ? "NEX는 원본 플랫폼의 공개/임베드 상태를 그대로 따릅니다. 유튜브나 원본 서비스에서 비공개, 로그인 필요, 지역 제한, 임베드 차단이 걸려 있으면 업로드 후에도 재생되지 않습니다."
                            : "NEX follows the source platform's visibility and embed permissions. If YouTube or the source service marks the video private, login-only, region-blocked, or embed-blocked, it will not play after upload."}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-100/85 leading-relaxed normal-case space-y-1">
                      <p>
                        {isKorean
                          ? "1. 지금 링크를 열어 로그아웃/시크릿 창에서도 재생되는지 확인하세요."
                          : "1. Open this link and confirm it plays even in a logged-out or incognito window."}
                      </p>
                      <p>
                        {isKorean
                          ? "2. 원본 페이지에서 Public 상태인지, 연령/지역 제한이 없는지 확인하세요."
                          : "2. Check that the source page is public and has no age or region restriction."}
                      </p>
                      <p>
                        {isKorean
                          ? "3. 유튜브 플레이어에 비공개/차단 메시지가 뜨면 URL을 수정한 뒤 업로드하세요."
                          : "3. If the player shows a private or blocked message, fix the source URL before uploading."}
                      </p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        {...form.register("videoVisibilityConfirmed")}
                        data-testid="checkbox-video-visibility-confirmed"
                        className="mt-0.5 w-4 h-4 rounded-sm border border-white/20 bg-black/40 accent-primary cursor-pointer"
                      />
                      <span className="text-[10px] text-amber-100/90 leading-relaxed normal-case group-hover:text-white transition-colors">
                        {isKorean
                          ? "위 링크가 공개 상태이고, 로그인 없이 재생되며, 외부 사이트 임베드 차단이 없는 것을 확인했습니다."
                          : "I confirmed this link is public, plays without login, and is not blocked from external embeds."}
                      </span>
                    </label>
                    {form.formState.errors.videoVisibilityConfirmed && (
                      <p className="text-[10px] text-red-300 tracking-wide">
                        {form.formState.errors.videoVisibilityConfirmed.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Social/Portfolio Link */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <Link className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Social / Portfolio Link
                </label>
                <input
                  {...form.register("portfolioLink")}
                  placeholder="https://your-instagram-or-portfolio-link"
                  data-testid="input-portfolio-link"
                  className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {form.formState.errors.portfolioLink && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.portfolioLink.message}
                  </p>
                )}
              </div>

              {needsContactEmail && (
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-amber-300 mb-2">
                    Contact Email For Creator Alerts
                  </label>
                  <input
                    {...form.register("contactEmail")}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    data-testid="input-contact-email"
                    className="w-full bg-black/40 border border-amber-500/30 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-300/70 focus:ring-1 focus:ring-amber-300/20 transition-all"
                  />
                  <p className="text-[9px] text-amber-200/80 tracking-wide mt-1.5 normal-case leading-relaxed">
                    {isKorean
                      ? "이 주소로 배틀 승리, 재생, 좋아요, 팔로우, 재생 불가 링크 수정 요청 메일이 영어→한국어 순으로 발송됩니다."
                      : "NEX will send battle wins, plays, likes, follows, and link-fix alerts to this address in English first, then Korean."}
                  </p>
                  {form.formState.errors.contactEmail && (
                    <p className="text-[10px] text-red-400 mt-1 tracking-wide">
                      {form.formState.errors.contactEmail.message}
                    </p>
                  )}
                </div>
              )}

              {/* Cover Image URL */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <ImageIcon className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Cover Image URL
                </label>
                <input
                  {...form.register("coverImageUrl")}
                  type="url"
                  inputMode="url"
                  placeholder="https://… (optional album art)"
                  data-testid="input-cover-image-url"
                  className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest mt-1.5">
                  Optional — direct link to a square image (used in NEW & chart lists)
                </p>
                {form.formState.errors.coverImageUrl && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.coverImageUrl.message}
                  </p>
                )}
              </div>

              {/* Artistic intent & prompt (required) */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-primary mb-2">
                  ARTISTIC INTENT & PROMPT (REQUIRED)
                </label>
                <div className="relative">
                  <textarea
                    {...form.register("aiPrompt")}
                    placeholder={t("submitTrack.aiPromptPlaceholder", { min: MIN_TRACK_ARTISTIC_INTENT_CHARS })}
                    data-testid="textarea-ai-prompt"
                    rows={5}
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 pb-9 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-y min-h-[120px] font-mono"
                  />
                  <span
                    className={cn(
                      "pointer-events-none absolute bottom-2 right-3 text-[10px] font-mono tabular-nums",
                      artisticIntentMeetsMin ? "text-primary/80" : "text-zinc-500",
                    )}
                    data-testid="text-artistic-intent-counter"
                  >
                    {artisticIntentLen} / {MIN_TRACK_ARTISTIC_INTENT_CHARS}
                  </span>
                </div>
                {form.formState.errors.aiPrompt && (
                  <p className="text-[10px] text-red-400 mt-1 tracking-wide">
                    {form.formState.errors.aiPrompt.message}
                  </p>
                )}
              </div>

              {/* Originality Confirmation */}
              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...form.register("originalityConfirmed")}
                    data-testid="checkbox-originality"
                    className="mt-0.5 w-4 h-4 rounded-sm border border-white/20 bg-black/40 accent-primary cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed group-hover:text-zinc-300 transition-colors">
                    I confirm this track is original AI-generated content
                  </span>
                </label>
                {form.formState.errors.originalityConfirmed && (
                  <p className="text-[10px] text-red-400 mt-1.5 ml-7 uppercase tracking-widest">
                    {form.formState.errors.originalityConfirmed.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={mutation.isPending || duplicateUrl || !artisticIntentMeetsMin || !videoReadyToSubmit || !contactEmailReadyToSubmit}
                  data-testid="button-submit-track"
                  className={cn(
                    "w-full py-3.5 text-[11px] font-black uppercase tracking-[0.3em] rounded-sm transition-all flex items-center justify-center gap-2 border",
                    mutation.isPending || duplicateUrl || !artisticIntentMeetsMin || !videoReadyToSubmit || !contactEmailReadyToSubmit
                      ? "bg-primary/10 border-primary/30 text-primary/50 cursor-not-allowed opacity-60"
                      : "bg-primary border-primary text-primary-foreground hover:bg-primary/90 hover:border-primary shadow-[0_0_24px_-8px_hsl(var(--primary)/0.55)]",
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                  {mutation.isPending ? "Submitting…" : "Submit Track"}
                </button>
                {!artisticIntentMeetsMin && (
                  <p
                    className="text-center text-[10px] text-zinc-500 leading-relaxed px-1"
                    data-testid="text-artistic-intent-hint"
                  >
                    {t("submitTrack.validationIntent", { min: MIN_TRACK_ARTISTIC_INTENT_CHARS })}
                  </p>
                )}
                {isVideoSubmission && !videoVisibilityConfirmed && (
                  <p
                    className="text-center text-[10px] text-amber-300/90 leading-relaxed px-1"
                    data-testid="text-video-visibility-hint"
                  >
                    {isKorean
                      ? "뮤직비디오는 공개/임베드 가능 여부 확인 체크를 해야 제출할 수 있습니다."
                      : "Music videos require the public/embed confirmation check before submission."}
                  </p>
                )}
                {needsContactEmail && !contactEmailReadyToSubmit && (
                  <p
                    className="text-center text-[10px] text-amber-300/90 leading-relaxed px-1"
                    data-testid="text-contact-email-hint"
                  >
                    {isKorean
                      ? "실제 수신 가능한 이메일 주소를 입력해야 제출할 수 있습니다."
                      : "Enter a reachable email address before you can submit."}
                  </p>
                )}
              </div>

              {mutation.isError && (
                <p
                  className="text-[10px] text-red-400 text-center normal-case tracking-wide leading-relaxed px-1"
                  data-testid="text-submit-error"
                >
                  {mutation.error instanceof Error && mutation.error.message.includes("409")
                    ? t("submitTrack.duplicateUrl")
                    : mutation.error instanceof Error
                      ? mutation.error.message.replace(/^\d{3}:\s*/, "")
                      : t("submitTrack.submitError")}
                </p>
              )}

              {/* Info box */}
              <div className="border border-white/5 rounded-sm p-4 bg-white/2 text-[9px] text-zinc-600 uppercase tracking-widest space-y-1.5">
                <p className="text-zinc-500 font-bold mb-2">How it works</p>
                <p>① Submit → Status: PENDING</p>
                <p>② Admin approves → Status: BATTLE_POOL (battle eligible)</p>
                <p>③ 10+ battles · 55%+ win rate → Status: CHART</p>
                <p>
                  ④ Chart: max 100 tracks ranked by votes + plays + battle wins
                </p>
                <p>⑤ Tracks are ranked by Votes + Plays + Battle Results</p>
              </div>
              </fieldset>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SubmitTrack() {
  return (
    <SubmitTrackErrorBoundary>
      <SubmitTrackForm />
    </SubmitTrackErrorBoundary>
  );
}

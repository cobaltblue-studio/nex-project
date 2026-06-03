import { useMemo, useState } from "react";
import { hasPublicCount } from "@/lib/displayStats";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Loader2, Search } from "lucide-react";
import { BattleWinsIndicator } from "@/components/BattleWinsIndicator";
import { TrackPlaysStat } from "@/components/TrackPlaysStat";
import { getOfficialGenreIcon } from "@/lib/officialGenreIcon";
import { TrackAdminActions } from "@/components/TrackAdminActions";
import { TrackPlayModal } from "@/components/TrackPlayModal";
import { TrackFeedModal, type TrackFeedSnapshot } from "@/components/TrackFeedModal";

interface NewTrack {
  id: number;
  creatorId?: number;
  title: string;
  creatorName: string;
  genre: string;
  playCount: number;
  likesCount?: number;
  commentsCount?: number;
  claimableByCreators?: boolean;
  aiPrompt?: string | null;
  aiPromptEditCount?: number;
  aiPromptLastEditedAt?: string | null;
  createdAt: string;
  coverImageUrl?: string | null;
  audioUrl?: string;
  musicVideoUrl?: string | null;
  trackType?: string;
  wins?: number;
}

export function New() {
  const { t } = useTranslation();
  const [playId, setPlayId] = useState<number | null>(null);
  const [feed, setFeed] = useState<{ track: TrackFeedSnapshot; focusComment: boolean } | null>(null);
  const [search, setSearch] = useState("");

  const { data: tracks, isLoading, isError } = useQuery<NewTrack[]>({
    queryKey: ["/api/tracks/new", "v5", search],
    staleTime: 60_000,
    queryFn: async () => {
      const q = search.trim();
      const url = q ? `/api/tracks/new?q=${encodeURIComponent(q)}` : "/api/tracks/new";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch new tracks");
      return res.json();
    },
  });

  /** Played tracks first (by plays, then date); zero-play releases stay visible at the end. */
  const sortedTracks = useMemo(() => {
    const list = [...(tracks ?? [])];
    list.sort((a, b) => {
      const aPlayed = hasPublicCount(a.playCount) ? 1 : 0;
      const bPlayed = hasPublicCount(b.playCount) ? 1 : 0;
      if (bPlayed !== aPlayed) return bPlayed - aPlayed;
      const playDiff = (b.playCount ?? 0) - (a.playCount ?? 0);
      if (playDiff !== 0) return playDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [tracks]);

  const playing = sortedTracks.find((t) => t.id === playId) ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      <TrackPlayModal
        open={playId != null && !!playing}
        onOpenChange={(o) => !o && setPlayId(null)}
        title={playing?.title ?? ""}
        creatorName={playing?.creatorName ?? ""}
        audioUrl={playing?.audioUrl}
        mvUrl={playing?.musicVideoUrl}
        trackType={playing?.trackType}
        aiPrompt={playing?.aiPrompt}
        trackId={playing?.id ?? null}
        claimableByCreators={!!playing?.claimableByCreators}
        trackOwnerProfileId={playing?.creatorId ?? null}
      />
      <TrackFeedModal
        open={feed != null}
        onOpenChange={(o) => !o && setFeed(null)}
        track={feed?.track ?? null}
        focusCommentOnOpen={feed?.focusComment ?? false}
      />

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-5 h-5 text-primary" />
          <h1
            className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary"
            data-testid="text-new-label"
          >
            {t("newPage.label")}
          </h1>
        </div>
        <h2
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green"
          data-testid="text-new-title"
        >
          {t("newPage.title")}
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          {t("new.listSub")}
        </p>
        <div className="mt-4 relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 text-sm bg-black/40 border border-white/10 rounded-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/40"
            data-testid="input-search-new"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">{t("common.loadingNew")}</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Clock className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm" data-testid="text-new-error">{t("common.failedLoadChart")}</p>
        </div>
      ) : sortedTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Clock className="w-10 h-10 text-zinc-700" />
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-400" data-testid="text-new-empty">
            {search.trim() ? t("new.noSearch", { q: search.trim() }) : t("new.noTracksYet")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTracks.map((track, idx) => {
            const GenreIcon = getOfficialGenreIcon(track.genre);
            const isZeroPlay = !hasPublicCount(track.playCount);
            const showAwaitingHeader =
              isZeroPlay &&
              (idx === 0 || hasPublicCount(sortedTracks[idx - 1]?.playCount));
            return (
            <div key={track.id} className="space-y-2">
            {showAwaitingHeader ? (
              <p
                className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-600 pt-4 border-t border-white/5"
                data-testid="text-new-awaiting-header"
              >
                {t("new.awaitingPlaysSection")}
              </p>
            ) : null}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 1) }}
              className={`flex items-center gap-3 sm:gap-4 p-4 border border-white/5 rounded-sm transition-all group ${
                isZeroPlay
                  ? "bg-black/10 opacity-80 hover:opacity-100 hover:bg-white/3 hover:border-white/10"
                  : "bg-black/20 hover:bg-white/3 hover:border-primary/20"
              }`}
              data-testid={`row-new-${track.id}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 sm:w-10 flex justify-center shrink-0" data-testid={`icon-new-genre-${track.id}`}>
                  <GenreIcon className="w-5 h-5 text-primary/80 shrink-0" strokeWidth={1.75} aria-hidden />
                </div>

                <button
                  type="button"
                  onClick={() => setPlayId(track.id)}
                  className="shrink-0 rounded-md overflow-hidden border border-white/10 bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  data-testid={`img-new-cover-${track.id}`}
                  aria-label={`Play ${track.title}`}
                >
                  {track.coverImageUrl ? (
                    <img
                      src={track.coverImageUrl}
                      alt=""
                      className="w-10 h-10 sm:w-11 sm:h-11 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
                      <GenreIcon className="w-4 h-4 text-zinc-600" strokeWidth={1.75} />
                    </div>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-[0.68rem] sm:text-[0.75rem] font-bold text-white tracking-wide line-clamp-2 leading-tight break-words"
                    data-testid={`text-new-track-title-${track.id}`}
                  >
                    {track.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className="text-[9px] font-bold text-primary/70 uppercase tracking-widest truncate"
                      data-testid={`text-new-track-creator-${track.id}`}
                    >
                      {track.creatorName}
                    </span>
                    <span className="text-[8px] text-zinc-600 uppercase tracking-widest">
                      {track.genre}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-auto">
                {isZeroPlay ? (
                  <div
                    className="hidden sm:flex flex-col items-end text-right min-w-[56px]"
                    data-testid={`text-new-awaiting-${track.id}`}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                      {t("new.awaitingPlays")}
                    </p>
                  </div>
                ) : (
                  <TrackPlaysStat playCount={track.playCount} testId={`text-new-plays-${track.id}`} />
                )}

                <BattleWinsIndicator wins={track.wins ?? 0} />

                <TrackAdminActions
                  compact
                  track={{
                    id: track.id,
                    creatorId: track.creatorId,
                    title: track.title,
                    creatorName: track.creatorName,
                    genre: track.genre,
                    coverImageUrl: track.coverImageUrl,
                    audioUrl: track.audioUrl,
                    mvUrl: track.musicVideoUrl ?? null,
                    trackType: track.trackType,
                    aiPrompt: track.aiPrompt,
                    aiPromptEditCount: track.aiPromptEditCount,
                    aiPromptLastEditedAt: track.aiPromptLastEditedAt,
                    likesCount: track.likesCount,
                    commentsCount: track.commentsCount,
                  }}
                  onCommentClick={() =>
                    setFeed({
                      track: {
                        id: track.id,
                        title: track.title,
                        creatorName: track.creatorName,
                        audioUrl: track.audioUrl,
                        mvUrl: track.musicVideoUrl,
                        trackType: track.trackType,
                        aiPrompt: track.aiPrompt,
                      },
                      focusComment: true,
                    })
                  }
                />
              </div>
            </motion.div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

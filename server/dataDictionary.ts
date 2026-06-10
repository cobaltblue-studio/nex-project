/** Machine-readable data dictionary for B2B buyers and internal ops. */
export const NEX_DATA_DICTIONARY = {
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  platform: "NEX (nexmusic.ai)",
  licenseNote:
    "B2B exports contain anonymized behavioral data and catalog metadata only. " +
    "Raw user emails, OAuth ids, and full ai_prompt text are excluded. " +
    "Audio/video URLs and third-party embeds remain property of creators/platforms. " +
    "Purchasers must not attempt re-identification of listeners. " +
    "Full policy: https://nexmusic.ai/data-policy",
  warehouse: {
    localBundleScript: "npm run export:b2b-bundle",
    webhookEnv: "B2B_EXPORT_WEBHOOK_URL",
    adminWebhookRoute: "POST /api/admin/export/b2b/push-webhook",
  },
  aggregationRules: {
    playCountClientThresholdMs: 60_000,
    playSpamWindowMinutes: 10,
    likeLimitPerTrackPerUtcDay: 1,
    battleVotesPerListenerPerUtcDay: 5,
    guestPlays: "Recorded via opaque session_key when user is not logged in",
    rankingWeights: {
      audio: { battle: 0.5, likes: 0.2, plays: 0.2, followers: 0.1 },
      mv: { plays: 0.4, likes: 0.35, comments: 0.25 },
    },
  },
  exports: {
    "creator-tracks.csv": {
      audience: "internal_outreach",
      containsPii: true,
      description: "Live catalog snapshot with registration_email for creator outreach — not for third-party resale.",
    },
    "b2b/plays.csv": {
      audience: "b2b",
      containsPii: false,
      description: "Anonymized play events with listener_type authenticated|guest.",
    },
    "b2b/battles.csv": {
      audience: "b2b",
      containsPii: false,
      description: "All battles including archived (track removed from catalog).",
    },
    "b2b/battle-votes.csv": {
      audience: "b2b",
      containsPii: false,
      description: "Anonymized battle vote events.",
    },
    "b2b/daily-track-snapshots.csv": {
      audience: "b2b",
      containsPii: false,
      description: "Per-track daily metrics rollup for time-series analysis.",
    },
    "b2b/daily-platform-snapshots.csv": {
      audience: "b2b",
      containsPii: false,
      description: "Platform-wide daily totals (insights history).",
    },
    "b2b/catalog.csv": {
      audience: "b2b",
      containsPii: false,
      description: "Catalog metadata + engagement aggregates; ai_prompt_char_count only (no raw prompt).",
    },
    "b2b/ai-insights.csv": {
      audience: "b2b",
      containsPii: false,
      description: "Aggregated genre × ai_tool performance summary.",
    },
  },
  tables: {
    track_plays: {
      description: "One row per counted play event",
      fields: {
        play_id: "Serial primary key",
        track_id: "FK tracks.id",
        user_id: "FK users.id when authenticated; null for guests",
        session_key: "Opaque browser session for guest plays",
        completed: "True when listener reached track end",
        played_at: "UTC timestamp",
        listener_country: "Profile country when logged in",
        device_class: "mobile | desktop | tablet | unknown",
        referrer_host: "External referrer hostname only (no path)",
      },
    },
    battles: {
      description: "Head-to-head match between two tracks",
      fields: {
        is_archived: "True when a participant track was soft-deleted; row kept for B2B history",
      },
    },
    data_daily_track_snapshots: {
      description: "UTC daily per-track metrics captured by scheduler",
    },
    data_daily_platform_snapshots: {
      description: "UTC daily platform totals captured by scheduler",
    },
    tracks: {
      fields: {
        provenance_status: "verified | nex_pick",
        claimable_by_creators: "true for nex_pick outreach pool",
        is_deleted: "Soft-delete; excluded from public UI, retained in DB",
      },
    },
  },
} as const;

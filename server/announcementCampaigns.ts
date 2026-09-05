import { announcementEmailCampaignRuns, announcementEmailDeliveries } from "@shared/schema";
import { db } from "./db";
import { sendPlatformAnnouncementEmail, isDeliverableEmail } from "./email";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createTriggeredWorker } from "./triggeredWorker";

type RecipientKind = "creator" | "visitor";

type AnnouncementRecipient = {
  userId: string;
  email: string;
  kind: RecipientKind;
  trackCount: number;
  visitCount: number;
};

export type AnnouncementEmailContent = {
  subjectEn: string;
  subjectKo: string;
  headlineEn: string;
  headlineKo: string;
  englishHtml: string;
  koreanHtml: string;
  ctaLabelEn: string;
  ctaLabelKo: string;
  ctaHref: string;
  textEn: string;
  textKo: string;
};

type AnnouncementCampaignDefinition = AnnouncementEmailContent & {
  slug: "community-launch";
  nameEn: string;
  nameKo: string;
};

import { translateAnnouncementKoToEn } from "./announcementTranslate";

export const customAnnouncementDraftSchema = z.object({
  internalTitle: z.string().trim().min(1).max(80),
  subjectKo: z.string().trim().min(1).max(200),
  headlineKo: z.string().trim().min(1).max(200),
  bodyKo: z.string().trim().min(1).max(8000),
  ctaLabelKo: z.string().trim().max(80).optional(),
  ctaHref: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().max(500).optional(),
  ),
  subjectEn: z.string().trim().max(200).optional(),
  headlineEn: z.string().trim().max(200).optional(),
  bodyEn: z.string().trim().max(8000).optional(),
  ctaLabelEn: z.string().trim().max(80).optional(),
});

export const customAnnouncementPayloadSchema = z.object({
  internalTitle: z.string().trim().min(1).max(80),
  subjectEn: z.string().trim().min(1).max(200),
  subjectKo: z.string().trim().min(1).max(200),
  headlineEn: z.string().trim().min(1).max(200),
  headlineKo: z.string().trim().min(1).max(200),
  bodyEn: z.string().trim().min(1).max(8000),
  bodyKo: z.string().trim().min(1).max(8000),
  ctaLabelEn: z.string().trim().max(80).optional(),
  ctaLabelKo: z.string().trim().max(80).optional(),
  ctaHref: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().max(500).optional(),
  ),
});

export type CustomAnnouncementPayload = z.infer<typeof customAnnouncementPayloadSchema>;
export type CustomAnnouncementDraft = z.infer<typeof customAnnouncementDraftSchema>;

export function parseCustomAnnouncementPayload(input: unknown): CustomAnnouncementPayload {
  return customAnnouncementPayloadSchema.parse(input);
}

function needsEnglishTranslation(draft: CustomAnnouncementDraft): boolean {
  return !draft.subjectEn?.trim() || !draft.headlineEn?.trim() || !draft.bodyEn?.trim();
}

export async function resolveCustomAnnouncementPayload(
  input: unknown,
): Promise<CustomAnnouncementPayload> {
  const draft = customAnnouncementDraftSchema.parse(input);
  let subjectEn = draft.subjectEn?.trim() || "";
  let headlineEn = draft.headlineEn?.trim() || "";
  let bodyEn = draft.bodyEn?.trim() || "";
  let ctaLabelEn = draft.ctaLabelEn?.trim() || "";

  if (needsEnglishTranslation(draft)) {
    const translated = await translateAnnouncementKoToEn({
      subjectKo: draft.subjectKo,
      headlineKo: draft.headlineKo,
      bodyKo: draft.bodyKo,
      ctaLabelKo: draft.ctaLabelKo,
    });
    subjectEn = subjectEn || translated.subjectEn;
    headlineEn = headlineEn || translated.headlineEn;
    bodyEn = bodyEn || translated.bodyEn;
    ctaLabelEn = ctaLabelEn || translated.ctaLabelEn;
  }

  return customAnnouncementPayloadSchema.parse({
    ...draft,
    subjectEn,
    headlineEn,
    bodyEn,
    ctaLabelEn: ctaLabelEn || undefined,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bodyTextToHtml(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) {
    return `<p style="margin:0;">${escapeHtml(text.trim())}</p>`;
  }
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 12px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

function defaultCtaHref(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    process.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    "https://nexmusic.ai"
  );
}

export function customPayloadToContent(payload: CustomAnnouncementPayload): AnnouncementEmailContent {
  const ctaHref = payload.ctaHref?.trim() || defaultCtaHref();
  const ctaLabelEn = payload.ctaLabelEn?.trim() || "Open NEX";
  const ctaLabelKo = payload.ctaLabelKo?.trim() || "NEX 열기";
  const englishHtml = bodyTextToHtml(payload.bodyEn);
  const koreanHtml = bodyTextToHtml(payload.bodyKo);
  return {
    subjectEn: payload.subjectEn,
    subjectKo: payload.subjectKo,
    headlineEn: payload.headlineEn,
    headlineKo: payload.headlineKo,
    englishHtml,
    koreanHtml,
    ctaLabelEn,
    ctaLabelKo,
    ctaHref,
    textEn: `${payload.bodyEn}\n\n${ctaLabelEn}: ${ctaHref}`,
    textKo: `${payload.bodyKo}\n\n${ctaLabelKo}: ${ctaHref}`,
  };
}

function campaignDefinitionToContent(campaign: AnnouncementCampaignDefinition): AnnouncementEmailContent {
  return {
    subjectEn: campaign.subjectEn,
    subjectKo: campaign.subjectKo,
    headlineEn: campaign.headlineEn,
    headlineKo: campaign.headlineKo,
    englishHtml: campaign.englishHtml,
    koreanHtml: campaign.koreanHtml,
    ctaLabelEn: campaign.ctaLabelEn,
    ctaLabelKo: campaign.ctaLabelKo,
    ctaHref: campaign.ctaHref,
    textEn: campaign.textEn,
    textKo: campaign.textKo,
  };
}

function buildCustomSlug(internalTitle: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const id = Math.random().toString(36).slice(2, 8);
  const slugPart = internalTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `custom-${date}-${slugPart || "notice"}-${id}`;
}

export function isCustomAnnouncementSlug(slug: string): boolean {
  return slug.startsWith("custom-");
}

export const ANNOUNCEMENT_CAMPAIGNS = {
  "community-launch": {
    slug: "community-launch",
    nameEn: "NEX Community launch",
    nameKo: "NEX 커뮤니티 오픈",
    subjectEn: "NEX Community is now live",
    subjectKo: "NEX 커뮤니티가 열렸습니다",
    headlineEn: "NEX Community is now live",
    headlineKo: "NEX 커뮤니티가 열렸습니다",
    englishHtml: `
      <p style="margin:0 0 12px;">NEX now has an in-app community space for creators and listeners.</p>
      <p style="margin:0 0 12px;">Use it to share tracks, compare prompts, react to battle results, and suggest what NEX should build next.</p>
      <p style="margin:0;">Join the conversation early and help shape the culture around AI music on NEX.</p>
    `,
    koreanHtml: `
      <p style="margin:0 0 12px;">이제 NEX 안에서 창작자와 리스너가 함께 이야기할 수 있는 커뮤니티가 열렸습니다.</p>
      <p style="margin:0 0 12px;">트랙 공유, 프롬프트 비교, 배틀 결과 토론, 그리고 NEX에 바라는 기능 제안까지 한곳에서 나눌 수 있습니다.</p>
      <p style="margin:0;">초기 대화에 참여해서 NEX AI 음악 문화의 방향을 함께 만들어 주세요.</p>
    `,
    ctaLabelEn: "Open community",
    ctaLabelKo: "커뮤니티 열기",
    ctaHref: "https://nexmusic.ai/community",
    textEn:
      "NEX Community is now live.\nShare tracks, compare prompts, react to battles, and suggest what NEX should build next.\nOpen community: https://nexmusic.ai/community",
    textKo:
      "NEX 커뮤니티가 열렸습니다.\n트랙 공유, 프롬프트 비교, 배틀 토론, 기능 제안을 이제 NEX 안에서 바로 나눌 수 있습니다.\n커뮤니티 열기: https://nexmusic.ai/community",
  },
} as const satisfies Record<string, AnnouncementCampaignDefinition>;

export type AnnouncementCampaignSlug = keyof typeof ANNOUNCEMENT_CAMPAIGNS;

function getCampaign(slug: string): AnnouncementCampaignDefinition | null {
  return ANNOUNCEMENT_CAMPAIGNS[slug as AnnouncementCampaignSlug] ?? null;
}

export async function listAnnouncementRecipients(): Promise<AnnouncementRecipient[]> {
  const rows = await db.execute(sql`
    with creator_track_counts as (
      select p.user_id, count(t.id)::int as track_count
      from profiles p
      left join tracks t
        on t.creator_id = p.id
       and coalesce(t.is_deleted, false) = false
      group by p.user_id
    )
    select
      u.id as user_id,
      lower(trim(u.email)) as email,
      coalesce(ctc.track_count, 0)::int as track_count,
      coalesce(uas.visit_count, 0)::int as visit_count
    from users u
    left join creator_track_counts ctc on ctc.user_id = u.id
    left join user_activity_stats uas on uas.user_id = u.id
    where u.email is not null
      and trim(coalesce(u.email, '')) <> ''
  `);

  const deduped = new Map<string, AnnouncementRecipient>();
  for (const row of rows.rows as Array<Record<string, unknown>>) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!isDeliverableEmail(email)) continue;
    if (deduped.has(email)) continue;

    const trackCount = Number(row.track_count ?? 0);
    const visitCount = Number(row.visit_count ?? 0);
    deduped.set(email, {
      userId: String(row.user_id ?? ""),
      email,
      kind: trackCount > 0 ? "creator" : "visitor",
      trackCount,
      visitCount,
    });
  }

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "creator" ? -1 : 1;
    return a.email.localeCompare(b.email);
  });
}

async function previewCampaignBySlug(slug: string): Promise<{
  campaignSlug: string;
  totalRecipients: number;
  creatorRecipients: number;
  visitorRecipients: number;
  alreadySent: number;
  pending: number;
}> {
  const recipients = await listAnnouncementRecipients();
  const creatorRecipients = recipients.filter((item) => item.kind === "creator").length;
  const visitorRecipients = recipients.length - creatorRecipients;

  const delivered = await db
    .select({ recipientEmail: announcementEmailDeliveries.recipientEmail })
    .from(announcementEmailDeliveries)
    .where(eq(announcementEmailDeliveries.campaignSlug, slug));

  const deliveredSet = new Set(delivered.map((row) => row.recipientEmail.trim().toLowerCase()));
  const alreadySent = recipients.filter((item) => deliveredSet.has(item.email)).length;

  return {
    campaignSlug: slug,
    totalRecipients: recipients.length,
    creatorRecipients,
    visitorRecipients,
    alreadySent,
    pending: recipients.length - alreadySent,
  };
}

async function sendAnnouncementContent(
  campaignSlug: string,
  content: AnnouncementEmailContent,
  opts?: { dryRun?: boolean; limit?: number },
): Promise<{
  campaignSlug: string;
  totalRecipients: number;
  creatorRecipients: number;
  visitorRecipients: number;
  alreadySent: number;
  attempted: number;
  sent: number;
  failed: number;
  dryRun: boolean;
  failures: Array<{ email: string; reason: string; detail?: string }>;
}> {
  const preview = await previewCampaignBySlug(campaignSlug);
  const recipients = await listAnnouncementRecipients();

  const delivered = await db
    .select({ recipientEmail: announcementEmailDeliveries.recipientEmail })
    .from(announcementEmailDeliveries)
    .where(eq(announcementEmailDeliveries.campaignSlug, campaignSlug));
  const deliveredSet = new Set(delivered.map((row) => row.recipientEmail.trim().toLowerCase()));

  const pendingRecipients = recipients
    .filter((item) => !deliveredSet.has(item.email))
    .slice(0, opts?.limit && opts.limit > 0 ? opts.limit : undefined);

  if (opts?.dryRun) {
    return {
      ...preview,
      attempted: pendingRecipients.length,
      sent: 0,
      failed: 0,
      dryRun: true,
      failures: [],
    };
  }

  const failures: Array<{ email: string; reason: string; detail?: string }> = [];
  let sent = 0;

  for (const recipient of pendingRecipients) {
    const result = await sendPlatformAnnouncementEmail({
      to: recipient.email,
      ...content,
    });

    if (!result.sent) {
      failures.push({
        email: recipient.email,
        reason: result.reason,
        detail: result.detail,
      });
      continue;
    }

    await db
      .insert(announcementEmailDeliveries)
      .values({
        campaignSlug,
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email,
        recipientKind: recipient.kind,
      })
      .onConflictDoNothing();
    sent += 1;
  }

  return {
    ...preview,
    attempted: pendingRecipients.length,
    sent,
    failed: failures.length,
    dryRun: false,
    failures: failures.slice(0, 25),
  };
}

export async function sendAnnouncementTestEmail(
  content: AnnouncementEmailContent,
  to: string,
) {
  return sendPlatformAnnouncementEmail({ to, ...content });
}

export async function sendTemplateAnnouncementTest(slug: string, to: string) {
  const campaign = getCampaign(slug);
  if (!campaign) throw new Error(`Unknown announcement campaign: ${slug}`);
  return sendAnnouncementTestEmail(campaignDefinitionToContent(campaign), to);
}

export async function sendCustomAnnouncementTest(payload: CustomAnnouncementPayload | CustomAnnouncementDraft, to: string) {
  const resolved = await resolveCustomAnnouncementPayload(payload);
  const content = customPayloadToContent(resolved);
  return sendAnnouncementTestEmail(content, to);
}

export async function previewCustomAnnouncement(payload: CustomAnnouncementPayload | CustomAnnouncementDraft) {
  const parsed = await resolveCustomAnnouncementPayload(payload);
  const slug = buildCustomSlug(parsed.internalTitle);
  const preview = await previewCampaignBySlug(slug);
  return {
    ...preview,
    internalTitle: parsed.internalTitle,
    campaignSlug: slug,
    englishPreview: {
      subjectEn: parsed.subjectEn,
      headlineEn: parsed.headlineEn,
      bodyEn: parsed.bodyEn,
      ctaLabelEn: parsed.ctaLabelEn || "Open NEX",
    },
  };
}

export async function previewAnnouncementCampaign(slug: string): Promise<{
  campaign: AnnouncementCampaignDefinition;
  totalRecipients: number;
  creatorRecipients: number;
  visitorRecipients: number;
  alreadySent: number;
  pending: number;
}> {
  const campaign = getCampaign(slug);
  if (!campaign) throw new Error(`Unknown announcement campaign: ${slug}`);
  const preview = await previewCampaignBySlug(campaign.slug);
  return { campaign, ...preview };
}

type AnnouncementCampaignResult = {
  campaign: AnnouncementCampaignDefinition;
  totalRecipients: number;
  creatorRecipients: number;
  visitorRecipients: number;
  alreadySent: number;
  attempted: number;
  sent: number;
  failed: number;
  dryRun: boolean;
  failures: Array<{ email: string; reason: string; detail?: string }>;
};

export async function sendAnnouncementCampaign(
  slug: string,
  opts?: { dryRun?: boolean; limit?: number },
): Promise<AnnouncementCampaignResult> {
  const campaign = getCampaign(slug);
  if (!campaign) throw new Error(`Unknown announcement campaign: ${slug}`);
  const result = await sendAnnouncementContent(campaign.slug, campaignDefinitionToContent(campaign), opts);
  return {
    campaign,
    totalRecipients: result.totalRecipients,
    creatorRecipients: result.creatorRecipients,
    visitorRecipients: result.visitorRecipients,
    alreadySent: result.alreadySent,
    attempted: result.attempted,
    sent: result.sent,
    failed: result.failed,
    dryRun: result.dryRun,
    failures: result.failures,
  };
}

export async function sendCustomAnnouncementCampaign(
  payload: CustomAnnouncementPayload,
  opts: { slug: string; dryRun?: boolean; limit?: number },
) {
  const parsed = parseCustomAnnouncementPayload(payload);
  const content = customPayloadToContent(parsed);
  const result = await sendAnnouncementContent(opts.slug, content, opts);
  return {
    ...result,
    internalTitle: parsed.internalTitle,
    campaignSlug: opts.slug,
  };
}

export function listAnnouncementCampaigns(): AnnouncementCampaignDefinition[] {
  return Object.values(ANNOUNCEMENT_CAMPAIGNS);
}

export async function enqueueAnnouncementCampaign(
  slug: string,
  opts?: { dryRun?: boolean; limit?: number; requestedBy?: string | null },
): Promise<{ id: number; status: string; campaignSlug: string }> {
  const campaign = getCampaign(slug);
  if (!campaign) throw new Error(`Unknown announcement campaign: ${slug}`);

  const [row] = await db
    .insert(announcementEmailCampaignRuns)
    .values({
      campaignSlug: campaign.slug,
      dryRun: Boolean(opts?.dryRun),
      limit: opts?.limit && opts.limit > 0 ? Math.floor(opts.limit) : null,
      requestedBy: opts?.requestedBy?.trim() || null,
      status: "pending",
    })
    .returning({
      id: announcementEmailCampaignRuns.id,
      status: announcementEmailCampaignRuns.status,
      campaignSlug: announcementEmailCampaignRuns.campaignSlug,
    });

  return row;
}

export async function enqueueCustomAnnouncement(
  payload: CustomAnnouncementPayload | CustomAnnouncementDraft,
  opts?: { dryRun?: boolean; limit?: number; requestedBy?: string | null },
): Promise<{ id: number; status: string; campaignSlug: string }> {
  const parsed = await resolveCustomAnnouncementPayload(payload);
  const slug = buildCustomSlug(parsed.internalTitle);

  const [row] = await db
    .insert(announcementEmailCampaignRuns)
    .values({
      campaignSlug: slug,
      dryRun: Boolean(opts?.dryRun),
      limit: opts?.limit && opts.limit > 0 ? Math.floor(opts.limit) : null,
      requestedBy: opts?.requestedBy?.trim() || null,
      status: "pending",
      summary: { customPayload: parsed } as Record<string, unknown>,
    })
    .returning({
      id: announcementEmailCampaignRuns.id,
      status: announcementEmailCampaignRuns.status,
      campaignSlug: announcementEmailCampaignRuns.campaignSlug,
    });

  triggerAnnouncementCampaignWorker("queue");

  return row;
}

export async function listAnnouncementCampaignRuns(limit = 20) {
  return db
    .select()
    .from(announcementEmailCampaignRuns)
    .orderBy(sql`${announcementEmailCampaignRuns.requestedAt} desc`)
    .limit(limit);
}

const ANNOUNCEMENT_SAFETY_POLL_MS = 6 * 60 * 60 * 1000;

/**
 * Drain claimable pending campaign runs.
 * Ownership is only acquired when UPDATE … WHERE id AND status='pending' returns a row.
 */
export async function processPendingAnnouncementCampaigns(): Promise<void> {
  while (true) {
    const [nextRun] = await db
      .select()
      .from(announcementEmailCampaignRuns)
      .where(eq(announcementEmailCampaignRuns.status, "pending"))
      .orderBy(announcementEmailCampaignRuns.requestedAt)
      .limit(1);

    if (!nextRun) break;

    const [claimed] = await db
      .update(announcementEmailCampaignRuns)
      .set({
        status: "processing",
        startedAt: new Date(),
        completedAt: null,
        error: null,
      })
      .where(
        and(
          eq(announcementEmailCampaignRuns.id, nextRun.id),
          eq(announcementEmailCampaignRuns.status, "pending"),
        ),
      )
      .returning();

    // Another replica claimed this row (or it was cancelled) — try the next pending job.
    if (!claimed || claimed.status !== "processing") continue;

    try {
      let summary: Record<string, unknown>;
      if (isCustomAnnouncementSlug(claimed.campaignSlug)) {
        const stored = claimed.summary as { customPayload?: CustomAnnouncementPayload } | null;
        const payload = stored?.customPayload;
        if (!payload) throw new Error("Missing custom announcement payload");
        summary = (await sendCustomAnnouncementCampaign(payload, {
          slug: claimed.campaignSlug,
          dryRun: claimed.dryRun,
          limit: claimed.limit ?? undefined,
        })) as Record<string, unknown>;
      } else {
        summary = (await sendAnnouncementCampaign(claimed.campaignSlug, {
          dryRun: claimed.dryRun,
          limit: claimed.limit ?? undefined,
        })) as Record<string, unknown>;
      }

      await db
        .update(announcementEmailCampaignRuns)
        .set({
          status: "completed",
          summary: summary,
          completedAt: new Date(),
          error: null,
        })
        .where(eq(announcementEmailCampaignRuns.id, claimed.id));
    } catch (err) {
      await db
        .update(announcementEmailCampaignRuns)
        .set({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        })
        .where(eq(announcementEmailCampaignRuns.id, claimed.id));
    }
  }
}

const announcementCampaignWorker = createTriggeredWorker({
  safetyIntervalMs: ANNOUNCEMENT_SAFETY_POLL_MS,
  run: processPendingAnnouncementCampaigns,
  onError: (error, reason) => {
    console.error(`[announcement] worker failed (${reason})`, error);
  },
});

/** Fire-and-forget — do not await from HTTP handlers. */
export function triggerAnnouncementCampaignWorker(reason = "queue"): void {
  announcementCampaignWorker.trigger(reason);
}

export function startAnnouncementCampaignWorker(): void {
  announcementCampaignWorker.start();
}

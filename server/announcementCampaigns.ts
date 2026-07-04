import { announcementEmailCampaignRuns, announcementEmailDeliveries } from "@shared/schema";
import { db } from "./db";
import { sendPlatformAnnouncementEmail, isDeliverableEmail } from "./email";
import { eq, sql } from "drizzle-orm";

type RecipientKind = "creator" | "visitor";

type AnnouncementRecipient = {
  userId: string;
  email: string;
  kind: RecipientKind;
  trackCount: number;
  visitCount: number;
};

type AnnouncementCampaignDefinition = {
  slug: "community-launch";
  nameEn: string;
  nameKo: string;
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

  const recipients = await listAnnouncementRecipients();
  const creatorRecipients = recipients.filter((item) => item.kind === "creator").length;
  const visitorRecipients = recipients.length - creatorRecipients;

  const delivered = await db
    .select({ recipientEmail: announcementEmailDeliveries.recipientEmail })
    .from(announcementEmailDeliveries)
    .where(eq(announcementEmailDeliveries.campaignSlug, campaign.slug));

  const deliveredSet = new Set(delivered.map((row) => row.recipientEmail.trim().toLowerCase()));
  const alreadySent = recipients.filter((item) => deliveredSet.has(item.email)).length;

  return {
    campaign,
    totalRecipients: recipients.length,
    creatorRecipients,
    visitorRecipients,
    alreadySent,
    pending: recipients.length - alreadySent,
  };
}

export async function sendAnnouncementCampaign(
  slug: string,
  opts?: { dryRun?: boolean; limit?: number },
): Promise<AnnouncementCampaignResult> {
  const preview = await previewAnnouncementCampaign(slug);
  const recipients = await listAnnouncementRecipients();

  const delivered = await db
    .select({ recipientEmail: announcementEmailDeliveries.recipientEmail })
    .from(announcementEmailDeliveries)
    .where(eq(announcementEmailDeliveries.campaignSlug, preview.campaign.slug));
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
      subjectEn: preview.campaign.subjectEn,
      subjectKo: preview.campaign.subjectKo,
      headlineEn: preview.campaign.headlineEn,
      headlineKo: preview.campaign.headlineKo,
      englishHtml: preview.campaign.englishHtml,
      koreanHtml: preview.campaign.koreanHtml,
      ctaLabelEn: preview.campaign.ctaLabelEn,
      ctaLabelKo: preview.campaign.ctaLabelKo,
      ctaHref: preview.campaign.ctaHref,
      textEn: preview.campaign.textEn,
      textKo: preview.campaign.textKo,
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
        campaignSlug: preview.campaign.slug,
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

export async function listAnnouncementCampaignRuns(limit = 20) {
  return db
    .select()
    .from(announcementEmailCampaignRuns)
    .orderBy(sql`${announcementEmailCampaignRuns.requestedAt} desc`)
    .limit(limit);
}

let workerRunning = false;

export async function processPendingAnnouncementCampaigns(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
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
        .where(eq(announcementEmailCampaignRuns.id, nextRun.id))
        .returning();

      if (!claimed || claimed.status !== "processing") break;

      try {
        const summary = await sendAnnouncementCampaign(claimed.campaignSlug, {
          dryRun: claimed.dryRun,
          limit: claimed.limit ?? undefined,
        });

        await db
          .update(announcementEmailCampaignRuns)
          .set({
            status: "completed",
            summary: summary as Record<string, unknown>,
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
  } finally {
    workerRunning = false;
  }
}

export function startAnnouncementCampaignWorker(): void {
  void processPendingAnnouncementCampaigns().catch((err) => {
    console.error("[announcement] initial worker run failed", err);
  });

  setInterval(() => {
    void processPendingAnnouncementCampaigns().catch((err) => {
      console.error("[announcement] worker loop failed", err);
    });
  }, 60_000);
}

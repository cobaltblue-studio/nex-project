/**
 * One-shot: Arena Wow upgrade announcement → creators only.
 * Usage:
 *   npx tsx scripts/send-arena-wow-creator-announcement.ts --dry-run
 *   npx tsx scripts/send-arena-wow-creator-announcement.ts --send
 */
import "dotenv/config";
import {
  resolveCustomAnnouncementPayload,
  sendCustomAnnouncementCampaign,
} from "../server/announcementCampaigns";
import { isEmailEnabled, probeResendApiKey } from "../server/email";

const DRY = process.argv.includes("--dry-run") || !process.argv.includes("--send");

const draft = {
  internalTitle: "2026-09 Arena Wow Upgrade",
  subjectKo: "NEX 아레나가 업그레이드됐습니다",
  headlineKo: "Listen. Clash. Climb.",
  bodyKo: `크리에이터 여러분께.

NEX에 Arena Wow 업그레이드를 반영했습니다.
한 번에 전면 리디자인은 아니고, 배틀·차트·증명 쪽에 매주 한 겹씩 올렸습니다.

지금 바로 느껴보실 수 있는 것:
• 배틀 — 블라인드 장막, 판정(Verdict), 클래시 콜, 결과 공유 카드
• 금요일 클래시 — 연승·신규 가중 매치 + 승 보너스 (KST 금요일)
• 차트·라이징·신곡 — 아레나 톤 정리, 급등 스파이크
• 크리에이터 프로필 — Crest(증명) 티어

라이브에서 바로 확인해 주세요.
피드백은 언제나 환영입니다.

— NEX Team`,
  ctaLabelKo: "아레나 열기",
  ctaHref: "https://nexmusic.ai/battle",
  subjectEn: "NEX Arena just got an upgrade",
  headlineEn: "Listen. Clash. Climb.",
  bodyEn: `Creators,

We've shipped the Arena Wow upgrade on NEX.
Not a one-shot full redesign — we layered battle, chart, and proof week by week.

What's live now:
• Battle — blind veil, Verdict stamp, clash-call chips, share card
• Friday Clash — streak/new weighting + win bonus (KST Friday)
• Chart / Rising / New — Arena tone polish + rank spikes
• Creator profile — Crest proof tiers

Jump in on the live site.
Feedback welcome anytime.

— NEX Team`,
  ctaLabelEn: "Open Arena",
};

async function main() {
  const skipProbe = process.argv.includes("--dry-run") || !process.argv.includes("--send");
  if (!isEmailEnabled() && !skipProbe) {
    throw new Error("RESEND_API_KEY missing — abort");
  }
  if (!skipProbe) {
    const probe = await probeResendApiKey();
    if (!probe.ok) {
      throw new Error(`Resend probe failed: ${probe.reason} ${probe.detail ?? ""}`);
    }
  }

  const payload = await resolveCustomAnnouncementPayload(draft);
  const slug = `custom-20260919-arena-wow-upgrade-creators`;

  console.log(JSON.stringify({ mode: DRY ? "dry-run" : "SEND", audience: "creators", slug }, null, 2));

  const result = await sendCustomAnnouncementCampaign(payload, {
    slug,
    dryRun: DRY,
    audience: "creators",
  });

  console.log(
    JSON.stringify(
      {
        totalRecipients: result.totalRecipients,
        creatorRecipients: result.creatorRecipients,
        visitorRecipients: result.visitorRecipients,
        alreadySent: result.alreadySent,
        attempted: result.attempted,
        sent: result.sent,
        failed: result.failed,
        dryRun: result.dryRun,
        audience: result.audience,
        failures: result.failures,
      },
      null,
      2,
    ),
  );

  if (DRY) {
    console.log("\nDry-run only. Re-run with --send to deliver.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

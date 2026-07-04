/**
 * Transactional email via Resend (https://resend.com).
 * Set RESEND_API_KEY (+ optional NEX_EMAIL_FROM) on Railway.
 */

const RESEND_API = "https://api.resend.com/emails";

function siteOrigin(): string {
  const raw = (
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://nexmusic.ai"
  ).trim();
  return raw.replace(/\/+$/, "") || "https://nexmusic.ai";
}

function fromAddress(): string {
  return process.env.NEX_EMAIL_FROM?.trim() || "NEX <onboarding@resend.dev>";
}

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Real inbox only — skips auto-imported placeholder accounts. */
export function isDeliverableEmail(to: string): boolean {
  const lower = to.trim().toLowerCase();
  if (!lower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) return false;
  if (lower.endsWith("@artist.local") || lower.endsWith("@neo.ai")) return false;
  return true;
}

export function emailFromPreview(): string {
  const raw = fromAddress();
  const match = raw.match(/<([^>]+)>/);
  return match?.[1] ?? raw;
}

export type ResendProbeResult =
  | { ok: true; domains: number }
  | { ok: false; reason: "disabled" | "unauthorized" | "error"; detail?: string };

/** Validates RESEND_API_KEY without sending mail. */
export async function probeResendApiKey(): Promise<ResendProbeResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, reason: "disabled" };

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "unauthorized", detail: `HTTP ${res.status}` };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: "error", detail: `${res.status}: ${body.slice(0, 160)}` };
    }
    const data = (await res.json()) as { data?: unknown[] };
    return { ok: true, domains: Array.isArray(data.data) ? data.data.length : 0 };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendTestEmail(to: string): Promise<EmailSendResult> {
  const origin = siteOrigin();
  return sendEmail({
    to,
    subject: "[NEX] Email test",
    text: `NEX transactional email is working.\n${origin}`,
    html: emailLayout({
      headline: "Email test OK",
      bodyHtml: `<p style="margin:0;">NEX transactional email is configured correctly.</p>`,
      ctaLabel: "Open NEX",
      ctaHref: origin,
    }),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailLayout(opts: { headline: string; bodyHtml: string; ctaLabel: string; ctaHref: string }): string {
  const origin = siteOrigin();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#050505;font-family:Inter,system-ui,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0a0a0a;border:1px solid rgba(34,211,238,0.35);border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 28px 12px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.35em;color:#22d3ee;font-weight:700;">NEX</p>
          <h1 style="margin:12px 0 0;font-size:22px;color:#fff;line-height:1.35;">${opts.headline}</h1>
        </td></tr>
        <tr><td style="padding:8px 28px 20px;font-size:15px;line-height:1.6;color:#94a3b8;">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          <a href="${opts.ctaHref}" style="display:inline-block;padding:12px 22px;background:rgba(34,211,238,0.15);border:1px solid rgba(34,211,238,0.5);color:#67e8f9;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;border-radius:8px;text-transform:uppercase;">${opts.ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#64748b;">
          <a href="${origin}" style="color:#64748b;">${origin.replace(/^https?:\/\//, "")}</a> · AI Music Ranking
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function bilingualText(english: string, korean: string): string {
  return `English\n${english}\n\n한국어\n${korean}`;
}

function bilingualBody(englishHtml: string, koreanHtml: string): string {
  return `
    <div style="margin:0 0 20px;">
      <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;color:#67e8f9;font-weight:700;text-transform:uppercase;">English</p>
      ${englishHtml}
    </div>
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);">
      <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.18em;color:#67e8f9;font-weight:700;">한국어</p>
      ${koreanHtml}
    </div>
  `;
}

function composeBilingualEmail(opts: {
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
}): { subject: string; html: string; text: string } {
  return {
    subject: `[NEX] ${opts.subjectEn} / ${opts.subjectKo}`,
    text: bilingualText(opts.textEn, opts.textKo),
    html: emailLayout({
      headline: `${escapeHtml(opts.headlineEn)}<br/><span style="font-size:16px;color:#94a3b8;font-weight:600;">${escapeHtml(opts.headlineKo)}</span>`,
      bodyHtml: bilingualBody(opts.englishHtml, opts.koreanHtml),
      ctaLabel: `${escapeHtml(opts.ctaLabelEn)} / ${escapeHtml(opts.ctaLabelKo)}`,
      ctaHref: opts.ctaHref,
    }),
  };
}

export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "disabled" | "invalid_to" | "resend_error"; detail?: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailSendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.warn("[email] skipped — RESEND_API_KEY is not set");
    return { sent: false, reason: "disabled" };
  }

  const to = opts.to.trim().toLowerCase();
  if (!isDeliverableEmail(to)) {
    return { sent: false, reason: "invalid_to" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[email] Resend error", res.status, body.slice(0, 300));
      return { sent: false, reason: "resend_error", detail: `${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (err) {
    console.warn("[email] send failed", err);
    return { sent: false, reason: "resend_error", detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendPlatformAnnouncementEmail(opts: {
  to: string;
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
}): Promise<EmailSendResult> {
  const msg = composeBilingualEmail({
    subjectEn: opts.subjectEn,
    subjectKo: opts.subjectKo,
    headlineEn: opts.headlineEn,
    headlineKo: opts.headlineKo,
    englishHtml: opts.englishHtml,
    koreanHtml: opts.koreanHtml,
    ctaLabelEn: opts.ctaLabelEn,
    ctaLabelKo: opts.ctaLabelKo,
    ctaHref: opts.ctaHref,
    textEn: opts.textEn,
    textKo: opts.textKo,
  });
  return sendEmail({ to: opts.to, ...msg });
}

export async function sendTrackApprovedEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
  destination: string;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const href = `${siteOrigin()}/track/${opts.trackId}`;
  const msg = composeBilingualEmail({
    subjectEn: `Track approved — ${opts.trackTitle}`,
    subjectKo: `승인 완료 — ${opts.trackTitle}`,
    headlineEn: "Your track is approved",
    headlineKo: "트랙이 승인되었습니다",
    englishHtml: `<p style="margin:0 0 12px;">Congratulations. <strong style="color:#fff;">${title}</strong> was approved by NEX.</p>
      <p style="margin:0;">You can now find it in <strong style="color:#67e8f9;">${escapeHtml(opts.destination)}</strong>.</p>`,
    koreanHtml: `<p style="margin:0 0 12px;">축하합니다. <strong style="color:#fff;">${title}</strong>이(가) NEX 관리자 승인을 받았습니다.</p>
      <p style="margin:0;">지금 NEX에서 트랙 상태와 노출 위치를 확인해 보세요.</p>`,
    ctaLabelEn: "View track",
    ctaLabelKo: "트랙 보기",
    ctaHref: href,
    textEn: `Congratulations. "${opts.trackTitle}" was approved by NEX and is now visible in ${opts.destination}.\nTrack: ${href}`,
    textKo: `축하합니다. "${opts.trackTitle}"이(가) NEX 관리자 승인을 받아 현재 노출 중입니다.\n트랙 보기: ${href}`,
  });
  return sendEmail({ to: opts.to, ...msg });
}

export async function sendTrackRejectedEmail(opts: {
  to: string;
  trackTitle: string;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const href = `${siteOrigin()}/my-tracks`;
  const msg = composeBilingualEmail({
    subjectEn: `Review result — ${opts.trackTitle}`,
    subjectKo: `승인 안내 — ${opts.trackTitle}`,
    headlineEn: "Track review result",
    headlineKo: "트랙 승인 결과 안내",
    englishHtml: `<p style="margin:0 0 12px;"><strong style="color:#fff;">${title}</strong> was not approved this time.</p>
      <p style="margin:0;">Please improve the link or metadata, then submit an updated version.</p>`,
    koreanHtml: `<p style="margin:0 0 12px;"><strong style="color:#fff;">${title}</strong>은(는) 이번 심사에서 승인되지 않았습니다.</p>
      <p style="margin:0;">링크나 메타데이터를 보완한 뒤 다시 제출해 주세요.</p>`,
    ctaLabelEn: "Open my tracks",
    ctaLabelKo: "내 트랙 열기",
    ctaHref: href,
    textEn: `"${opts.trackTitle}" was not approved this time. Please update the source link or metadata and resubmit.\nMy tracks: ${href}`,
    textKo: `"${opts.trackTitle}"은(는) 이번 심사에서 승인되지 않았습니다. 링크나 메타데이터를 수정한 뒤 다시 제출해 주세요.\n내 트랙: ${href}`,
  });
  return sendEmail({ to: opts.to, ...msg });
}

export async function sendTrackLikedEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const trackHref = `${siteOrigin()}/track/${opts.trackId}`;
  const battleHref = `${siteOrigin()}/battle`;
  const msg = composeBilingualEmail({
    subjectEn: `New like — ${opts.trackTitle}`,
    subjectKo: `새 좋아요 — ${opts.trackTitle}`,
    headlineEn: "Your track got a new like",
    headlineKo: "새 좋아요가 도착했어요",
    englishHtml: `<p style="margin:0;">Someone liked <strong style="color:#fff;">${title}</strong> on NEX today.</p>
      <p style="margin:12px 0 0;">Visit NEX to check the reaction and launch another battle.</p>
      <p style="margin:12px 0 0;"><a href="${trackHref}" style="color:#67e8f9;">View track</a></p>`,
    koreanHtml: `<p style="margin:0;">누군가 오늘 NEX에서 <strong style="color:#fff;">${title}</strong>에 좋아요를 남겼습니다.</p>
      <p style="margin:12px 0 0;">지금 NEX에 들어와 반응을 확인하고, 다른 배틀에도 참여해 보세요.</p>
      <p style="margin:12px 0 0;"><a href="${trackHref}" style="color:#67e8f9;">트랙 보기</a></p>`,
    ctaLabelEn: "Open NEX Battle",
    ctaLabelKo: "NEX 배틀 열기",
    ctaHref: battleHref,
    textEn: `Someone liked "${opts.trackTitle}" on NEX today.\nVisit NEX to check the reaction and launch another battle.\nTrack: ${trackHref}\nBattle: ${battleHref}`,
    textKo: `누군가 오늘 NEX에서 "${opts.trackTitle}"에 좋아요를 남겼습니다.\n지금 NEX에 들어와 반응을 확인하고 다른 배틀에도 참여해 보세요.\n트랙 보기: ${trackHref}\n배틀 바로가기: ${battleHref}`,
  });
  return sendEmail({ to: opts.to, ...msg });
}

export async function sendBattleWinEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const trackHref = `${siteOrigin()}/track/${opts.trackId}`;
  const battleHref = `${siteOrigin()}/battle`;
  const msg = composeBilingualEmail({
    subjectEn: `Battle win — ${opts.trackTitle}`,
    subjectKo: `배틀 승리 — ${opts.trackTitle}`,
    headlineEn: "Your track won a battle",
    headlineKo: "배틀에서 승리했어요",
    englishHtml: `<p style="margin:0;">Your track <strong style="color:#fff;">${title}</strong> won a NEX battle today.</p>
      <p style="margin:12px 0 0;">Visit NEX now to check the result and launch another battle.</p>
      <p style="margin:12px 0 0;"><a href="${trackHref}" style="color:#67e8f9;">View track</a></p>`,
    koreanHtml: `<p style="margin:0;">당신의 곡 <strong style="color:#fff;">${title}</strong>이(가) 오늘 NEX 배틀에서 승리했습니다.</p>
      <p style="margin:12px 0 0;">지금 NEX에 들어와 결과를 확인하고, 또 다른 배틀에도 참여해 보세요.</p>
      <p style="margin:12px 0 0;"><a href="${trackHref}" style="color:#67e8f9;">트랙 보기</a></p>`,
    ctaLabelEn: "Launch another battle",
    ctaLabelKo: "배틀 다시 하기",
    ctaHref: battleHref,
    textEn: `Your track "${opts.trackTitle}" won a NEX battle today.\nVisit NEX now to check the result and launch another battle.\nTrack: ${trackHref}\nBattle: ${battleHref}`,
    textKo: `당신의 곡 "${opts.trackTitle}"이(가) 오늘 NEX 배틀에서 승리했습니다.\n지금 NEX에 들어와 결과를 확인하고 또 다른 배틀에도 참여해 보세요.\n트랙 보기: ${trackHref}\n배틀 바로가기: ${battleHref}`,
  });
  return sendEmail({ to: opts.to, ...msg });
}

export async function sendCreatorFollowedEmail(opts: {
  to: string;
  followerDisplayName: string;
  creatorProfilePath: string;
}): Promise<EmailSendResult> {
  const follower = escapeHtml(opts.followerDisplayName || "Someone");
  const profileHref = `${siteOrigin()}${opts.creatorProfilePath.startsWith("/") ? opts.creatorProfilePath : `/${opts.creatorProfilePath}`}`;
  const battleHref = `${siteOrigin()}/battle`;
  const msg = composeBilingualEmail({
    subjectEn: `New follower — ${opts.followerDisplayName || "New follower"}`,
    subjectKo: `새 팔로워 — ${opts.followerDisplayName || "New follower"}`,
    headlineEn: "You have a new follower",
    headlineKo: "새 팔로워가 생겼어요",
    englishHtml: `<p style="margin:0;"><strong style="color:#fff;">${follower}</strong> followed you on NEX.</p>
      <p style="margin:12px 0 0;">Visit NEX to review your latest activity and join more battles.</p>
      <p style="margin:12px 0 0;"><a href="${profileHref}" style="color:#67e8f9;">Open your profile</a></p>`,
    koreanHtml: `<p style="margin:0;"><strong style="color:#fff;">${follower}</strong>님이 NEX에서 당신을 팔로우했습니다.</p>
      <p style="margin:12px 0 0;">지금 NEX에 들어와 최근 반응을 확인하고, 더 많은 배틀에도 참여해 보세요.</p>
      <p style="margin:12px 0 0;"><a href="${profileHref}" style="color:#67e8f9;">내 프로필 보기</a></p>`,
    ctaLabelEn: "Open NEX Battle",
    ctaLabelKo: "NEX 배틀 열기",
    ctaHref: battleHref,
    textEn: `${opts.followerDisplayName || "Someone"} followed you on NEX.\nVisit NEX to review your latest activity and join more battles.\nProfile: ${profileHref}\nBattle: ${battleHref}`,
    textKo: `${opts.followerDisplayName || "누군가"}님이 NEX에서 당신을 팔로우했습니다.\n지금 NEX에 들어와 최근 반응을 확인하고 더 많은 배틀에도 참여해 보세요.\n프로필: ${profileHref}\n배틀 바로가기: ${battleHref}`,
  });
  return sendEmail({ to: opts.to, ...msg });
}

export async function sendTrackPlayedEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const trackHref = `${siteOrigin()}/track/${opts.trackId}`;
  const battleHref = `${siteOrigin()}/battle`;
  const msg = composeBilingualEmail({
    subjectEn: `New play — ${opts.trackTitle}`,
    subjectKo: `새 재생 — ${opts.trackTitle}`,
    headlineEn: "Someone played your track",
    headlineKo: "누군가 당신의 곡을 들었어요",
    englishHtml: `<p style="margin:0;"><strong style="color:#fff;">${title}</strong> received a new play on NEX.</p>
      <p style="margin:12px 0 0;">Visit NEX to check the reaction and join another battle.</p>
      <p style="margin:12px 0 0;"><a href="${trackHref}" style="color:#67e8f9;">View track</a></p>`,
    koreanHtml: `<p style="margin:0;"><strong style="color:#fff;">${title}</strong>에 새 재생이 기록되었습니다.</p>
      <p style="margin:12px 0 0;">지금 NEX에 들어와 반응을 확인하고, 다른 배틀에도 참여해 보세요.</p>
      <p style="margin:12px 0 0;"><a href="${trackHref}" style="color:#67e8f9;">트랙 보기</a></p>`,
    ctaLabelEn: "Open NEX Battle",
    ctaLabelKo: "NEX 배틀 열기",
    ctaHref: battleHref,
    textEn: `Someone played "${opts.trackTitle}" on NEX.\nVisit NEX to check the reaction and join another battle.\nTrack: ${trackHref}\nBattle: ${battleHref}`,
    textKo: `누군가 NEX에서 "${opts.trackTitle}"을(를) 재생했습니다.\n지금 NEX에 들어와 반응을 확인하고 다른 배틀에도 참여해 보세요.\n트랙 보기: ${trackHref}\n배틀 바로가기: ${battleHref}`,
  });
  return sendEmail({ to: opts.to, ...msg });
}

export async function sendTrackPlaybackIssueEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
  issueSummary: string;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const issue = escapeHtml(opts.issueSummary);
  const href = `${siteOrigin()}/my-tracks`;
  const msg = composeBilingualEmail({
    subjectEn: `Fix required for playback link — ${opts.trackTitle}`,
    subjectKo: `재생 불가 링크 수정 필요 — ${opts.trackTitle}`,
    headlineEn: "Please fix your uploaded link",
    headlineKo: "업로드한 링크를 수정해 주세요",
    englishHtml: `<p style="margin:0 0 12px;"><strong style="color:#fff;">${title}</strong> is not playing on NEX right now.</p>
      <p style="margin:0 0 12px;">Reason: <strong style="color:#fff;">${issue}</strong></p>
      <p style="margin:0;">NEX admins cannot fix this for you. Please make the source link public/playable on the original platform, or resubmit with a correct link.</p>`,
    koreanHtml: `<p style="margin:0 0 12px;"><strong style="color:#fff;">${title}</strong>은(는) 현재 NEX에서 정상 재생되지 않습니다.</p>
      <p style="margin:0 0 12px;">사유: <strong style="color:#fff;">${issue}</strong></p>
      <p style="margin:0;">이 문제는 NEX 관리자가 대신 수정할 수 없습니다. 원본 플랫폼에서 공개/재생 가능 상태를 확인한 뒤 링크를 수정하거나 다시 제출해 주세요.</p>`,
    ctaLabelEn: "Open my tracks",
    ctaLabelKo: "내 트랙 열기",
    ctaHref: href,
    textEn:
      `"${opts.trackTitle}" is not playing on NEX right now.\n` +
      `Reason: ${opts.issueSummary}\n` +
      `NEX admins cannot fix this for you. Please make the source link public/playable on the original platform, or resubmit with a correct link.\n` +
      `My tracks: ${href}`,
    textKo:
      `"${opts.trackTitle}"은(는) 현재 NEX에서 정상 재생되지 않습니다.\n` +
      `사유: ${opts.issueSummary}\n` +
      `이 문제는 NEX 관리자가 대신 수정할 수 없습니다. 원본 플랫폼에서 공개/재생 가능 상태를 확인한 뒤 링크를 수정하거나 다시 제출해 주세요.\n` +
      `내 트랙: ${href}`,
  });
  return sendEmail({ to: opts.to, ...msg });
}

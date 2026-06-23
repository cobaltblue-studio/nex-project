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
<html lang="ko">
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
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
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

export async function sendTrackApprovedEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
  destination: string;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const href = `${siteOrigin()}/track/${opts.trackId}`;
  const subject = `[NEX] 승인 완료 — ${opts.trackTitle}`;
  const text = `축하합니다! "${opts.trackTitle}"이(가) 승인되어 ${opts.destination}에 노출됩니다.\n${href}`;
  const html = emailLayout({
    headline: "트랙이 승인되었습니다 🎉",
    bodyHtml: `<p style="margin:0 0 12px;">축하합니다! <strong style="color:#fff;">${title}</strong>이(가) 관리자 승인을 받았습니다.</p>
      <p style="margin:0;">지금 <strong style="color:#67e8f9;">${escapeHtml(opts.destination)}</strong>에서 확인할 수 있어요.</p>`,
    ctaLabel: "트랙 보기",
    ctaHref: href,
  });
  return sendEmail({ to: opts.to, subject, html, text });
}

export async function sendTrackRejectedEmail(opts: {
  to: string;
  trackTitle: string;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const href = `${siteOrigin()}/my-tracks`;
  const subject = `[NEX] 승인 안내 — ${opts.trackTitle}`;
  const text = `"${opts.trackTitle}"은(는) 이번 심사에서 승인되지 않았습니다. 수정 후 다시 제출해 주세요.\n${href}`;
  const html = emailLayout({
    headline: "트랙 승인 결과 안내",
    bodyHtml: `<p style="margin:0 0 12px;"><strong style="color:#fff;">${title}</strong>은(는) 이번에는 승인되지 않았습니다.</p>
      <p style="margin:0;">링크·메타데이터를 보완한 뒤 다시 제출해 주세요.</p>`,
    ctaLabel: "내 트랙",
    ctaHref: href,
  });
  return sendEmail({ to: opts.to, subject, html, text });
}

export async function sendTrackLikedEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const href = `${siteOrigin()}/track/${opts.trackId}`;
  const subject = `[NEX] 새 좋아요 — ${opts.trackTitle}`;
  const text = `누군가 "${opts.trackTitle}"에 오늘 좋아요(치어)를 남겼습니다.\n${href}`;
  const html = emailLayout({
    headline: "새 좋아요가 도착했어요 💙",
    bodyHtml: `<p style="margin:0;">누군가 <strong style="color:#fff;">${title}</strong>에 오늘 NEX에서 좋아요를 눌렀습니다.</p>`,
    ctaLabel: "트랙 보기",
    ctaHref: href,
  });
  return sendEmail({ to: opts.to, subject, html, text });
}

export async function sendBattleWinEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const href = `${siteOrigin()}/track/${opts.trackId}`;
  const subject = `[NEX] 배틀 승리 — ${opts.trackTitle}`;
  const text = `당신이 올린 "${opts.trackTitle}"이(가) 배틀에서 승리했어요. 확인해보세요.\n${href}`;
  const html = emailLayout({
    headline: "배틀에서 승리했어요 🏆",
    bodyHtml: `<p style="margin:0;">당신이 올린 <strong style="color:#fff;">${title}</strong>이(가) 배틀에서 승리했어요.</p>
      <p style="margin:12px 0 0;">지금 NEX에서 결과를 확인해보세요.</p>`,
    ctaLabel: "트랙 보기",
    ctaHref: href,
  });
  return sendEmail({ to: opts.to, subject, html, text });
}

export async function sendCreatorFollowedEmail(opts: {
  to: string;
  followerDisplayName: string;
  creatorProfilePath: string;
}): Promise<EmailSendResult> {
  const follower = escapeHtml(opts.followerDisplayName || "Someone");
  const href = `${siteOrigin()}${opts.creatorProfilePath.startsWith("/") ? opts.creatorProfilePath : `/${opts.creatorProfilePath}`}`;
  const subject = `[NEX] 새 팔로워 — ${opts.followerDisplayName || "New follower"}`;
  const text = `${follower}님이 NEX에서 당신을 팔로우했습니다.\n${href}`;
  const html = emailLayout({
    headline: "새 팔로워가 생겼어요 ✨",
    bodyHtml: `<p style="margin:0;"><strong style="color:#fff;">${follower}</strong>님이 NEX에서 당신을 팔로우했습니다.</p>
      <p style="margin:12px 0 0;">프로필과 최신 활동을 확인해 보세요.</p>`,
    ctaLabel: "내 프로필 보기",
    ctaHref: href,
  });
  return sendEmail({ to: opts.to, subject, html, text });
}

export async function sendTrackPlayedEmail(opts: {
  to: string;
  trackTitle: string;
  trackId: number;
}): Promise<EmailSendResult> {
  const title = escapeHtml(opts.trackTitle);
  const href = `${siteOrigin()}/track/${opts.trackId}`;
  const subject = `[NEX] 새 재생 — ${opts.trackTitle}`;
  const text = `누군가 "${opts.trackTitle}"을(를) NEX에서 들었습니다.\n${href}`;
  const html = emailLayout({
    headline: "누군가 당신의 곡을 들었어요 🎧",
    bodyHtml: `<p style="margin:0;"><strong style="color:#fff;">${title}</strong>에 새 재생이 기록되었습니다.</p>
      <p style="margin:12px 0 0;">지금 NEX에서 반응을 확인해 보세요.</p>`,
    ctaLabel: "트랙 보기",
    ctaHref: href,
  });
  return sendEmail({ to: opts.to, subject, html, text });
}

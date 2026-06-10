import { createHmac } from "crypto";

/** Salt for irreversible listener id hashing in B2B exports (no PII). */
function exportSalt(): string {
  return (
    process.env.DATA_EXPORT_SALT?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "nex-b2b-export-dev-only"
  );
}

/** 16-char hex pseudonym — stable per user, not reversible without salt. */
export function anonymizeUserId(userId: string | null | undefined): string {
  const id = String(userId ?? "").trim();
  if (!id) return "";
  return createHmac("sha256", exportSalt()).update(`user:${id}`).digest("hex").slice(0, 16);
}

/** Guest sessions are already opaque; normalize to a short export token. */
export function anonymizeSessionKey(sessionKey: string | null | undefined): string {
  const key = String(sessionKey ?? "").trim();
  if (!key) return "";
  if (/^[a-f0-9]{8,32}$/i.test(key)) return key.slice(0, 16);
  return createHmac("sha256", exportSalt()).update(`session:${key}`).digest("hex").slice(0, 16);
}

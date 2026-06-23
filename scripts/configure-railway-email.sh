#!/usr/bin/env bash
# Set Resend env vars on Railway (requires `railway login` or RAILWAY_TOKEN).
# Usage:
#   RESEND_API_KEY=re_xxx ./scripts/configure-railway-email.sh
# Optional:
#   NEX_EMAIL_FROM='NEX <notifications@nexmusic.ai>'
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "RESEND_API_KEY is required." >&2
  exit 1
fi

FROM="${NEX_EMAIL_FROM:-NEX <notifications@nexmusic.ai>}"

echo "Setting Railway variables (RESEND_API_KEY, NEX_EMAIL_FROM)…"
npx --yes @railway/cli variables set \
  "RESEND_API_KEY=${RESEND_API_KEY}" \
  "NEX_EMAIL_FROM=${FROM}"

echo "Done. Railway will redeploy; then check:"
echo "  curl -s https://nexmusic.ai/api/health | jq .email"

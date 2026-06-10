#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "Installing gh..."
  brew install gh
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub login required (one time). Browser will open."
  gh auth login -h github.com -p https -w --scopes repo
  gh auth setup-git
fi

echo "Pushing main..."
git push origin main
git fetch origin
echo "origin/main: $(git rev-parse --short origin/main) $(git log -1 --oneline origin/main)"

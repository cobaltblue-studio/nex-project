#!/bin/bash
# Cursor/터미널이 옛 경로를 열었을 때, 현재 nex-project로 심볼릭 링크를 맞춰 준다.
set -euo pipefail

REAL="/Users/kangduckho/Desktop/CobaltBlue Studio Universe/02_NEX/nex-project"
# Optional legacy alias (only created if parent exists or can be created)
LINK="/Users/kangduckho/Desktop/CobaltBlue Studio Universe/02_NEX/nex-project-link"

if [[ ! -d "$REAL" ]]; then
  echo "실제 프로젝트 폴더가 없습니다: $REAL"
  exit 1
fi

echo "Canonical project path: $REAL"
echo "Cursor에서 위 경로를 워크스페이스 루트로 여세요."

# Keep a no-op success when already on the real path (script used as health check).
if [[ "$(pwd -P 2>/dev/null || true)" == "$(cd "$REAL" && pwd -P)" ]]; then
  echo "OK: already on canonical path"
  exit 0
fi

mkdir -p "$(dirname "$LINK")"
if [[ -e "$LINK" && ! -L "$LINK" ]]; then
  echo "이미 일반 폴더가 있습니다 (덮어쓰지 않음): $LINK"
  exit 1
fi

ln -sfn "$REAL" "$LINK"
echo "OK: $LINK -> $REAL"

#!/bin/bash
# Cursor가 예전 경로(01. 비즈니스/nex-project)를 워크스페이스로 열었을 때 터미널/Git 오류를 막는 심볼릭 링크 생성.
set -euo pipefail

REAL="/Users/kangduckho/Desktop/CobaltBlue_Archive/01. NEX 프로젝트/nex-project"
LINK="/Users/kangduckho/Desktop/01. 비즈니스/nex-project"

if [[ ! -d "$REAL" ]]; then
  echo "실제 프로젝트 폴더가 없습니다: $REAL"
  exit 1
fi

mkdir -p "$(dirname "$LINK")"

if [[ -e "$LINK" && ! -L "$LINK" ]]; then
  echo "이미 일반 폴더가 있습니다 (덮어쓰지 않음): $LINK"
  exit 1
fi

ln -sfn "$REAL" "$LINK"

if [[ -f "$LINK/package.json" ]]; then
  echo "OK: $LINK -> $REAL"
  echo "Cursor에서 이 창을 닫았다가 다시 열거나, 터미널을 새로 여세요."
else
  echo "심볼릭 링크는 만들었지만 package.json을 찾지 못했습니다."
  exit 1
fi

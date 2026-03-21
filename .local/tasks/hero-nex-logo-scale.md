# Hero NEX Logo 300% Scale Up

## What & Why
'The Future of AI Music' 텍스트 바로 아래에 위치한 히어로 섹션의 NEX 로고(텍스트) 크기를 현재의 3배(300%)로 키운다.

## Done looks like
- 홈 히어로 섹션에서 'THE FUTURE OF AI MUSIC' 아래 NEX 텍스트가 현재보다 3배 크게 표시된다.
- 모바일과 데스크탑 모두 비율에 맞게 확대된다.
- 기존 네온 글로우 효과와 그라디언트 스타일은 그대로 유지된다.

## Out of scope
- 네비게이션 바 NEX 로고 변경 없음
- 다른 페이지의 NEX 텍스트 변경 없음
- 색상, 효과 등 스타일 변경 없음

## Tasks
1. Home.tsx 히어로 섹션의 h1 NEX 텍스트의 폰트 크기 클래스를 현재의 3배로 변경한다. 현재 `text-5xl md:text-9xl`에서 모바일은 3배인 `text-[9rem]`, 데스크탑은 3배인 `text-[24rem]`으로 수정한다.

## Relevant files
- `client/src/pages/Home.tsx:269-281`

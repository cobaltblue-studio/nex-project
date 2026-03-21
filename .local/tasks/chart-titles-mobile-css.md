# Chart Titles Fix & Mobile CSS Update

## What & Why
Song titles on the Music (Top 100) and Rising chart pages are being hidden on mobile because fixed-width stat columns squeeze the title's flex container to zero width. Additionally, the existing forced mobile CSS overrides need to be updated to the latest specified values.

## Done looks like
- Song titles are clearly visible next to rank numbers on the Music and Rising pages on mobile
- The mobile layout correctly sizes the hero, CTA buttons, scroll indicator, video containers, vote/start buttons, and bottom nav per the specified values
- No elements overlap on mobile viewports (max-width 768px)

## Out of scope
- Any desktop layout changes
- New pages or features

## Tasks
1. **Fix chart title visibility on mobile** — On the Music and Rising pages, hide or collapse the stat columns (plays, win rate, battles) on mobile screens so the title/creator area has enough space to render. Ensure the `truncate` class does not clip the title to invisible on narrow screens.

2. **Update forced mobile CSS overrides** — In `index.css`, update the existing `/* FORCED MOBILE OVERRIDES */` block with these exact values:
   - `.hero-title`: font-size 24px, margin-bottom 5px
   - `.cta-buttons`: gap 10px, margin-bottom 80px, width 90%, margin-left/right auto
   - `.cta-button`: height 45px, font-size 14px
   - `.scroll-indicator`: bottom 85px, z-index 999, display block (remove flex column alignment)
   - `.video-container, iframe`: max-height 22vh
   - `.vote-btn, .start-btn`: height 42px, margin 3px 0, font-size 13px
   - `.bottom-nav`: height 60px, background #000
   - `.nav-item span`: font-size 8px, color #fff

## Relevant files
- `client/src/pages/Music.tsx`
- `client/src/pages/Rising.tsx`
- `client/src/index.css:330-389`

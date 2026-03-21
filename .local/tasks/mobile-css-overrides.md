# Mobile CSS Override Fixes

## What & Why
Append a set of forced mobile override styles to fix broken layout on screens 768px and under. These are targeted `!important` overrides covering the hero section, CTA buttons, scroll indicator, battle/radio video containers, bottom navigation, and creators grid.

## Done looks like
- On mobile (≤768px), the hero section fills the full viewport height and is properly centered
- CTA buttons are full-width, stacked vertically, with space for the scroll indicator below
- Scroll indicator is absolutely positioned at the bottom of the hero and not overlapping buttons
- Video containers and iframes in battle/radio views are capped at 25vh
- Vote and start buttons are compact and evenly sized
- Bottom navigation is 65px tall, evenly spaced, with safe-area inset padding
- Creators grid is a single-column vertical stack on mobile

## Out of scope
- Any logic or JavaScript changes
- Desktop layout changes
- Changes to existing non-mobile styles

## Tasks
1. Append the following CSS block at the very bottom of `client/src/index.css`:

```css
/* FORCED MOBILE OVERRIDES */
@media (max-width: 768px) {
  .hero-section {
    height: 100vh !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    padding: 20px !important;
    position: relative !important;
    overflow: hidden !important;
  }
  .hero-title { font-size: 26px !important; margin-bottom: 8px !important; }
  .hero-subtitle { font-size: 13px !important; line-height: 1.4 !important; }

  .cta-buttons {
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
    width: 100% !important;
    margin-top: 15px !important;
    margin-bottom: 80px !important;
  }
  .cta-button { height: 48px !important; width: 100% !important; font-size: 14px !important; }

  .scroll-indicator {
    position: absolute !important;
    bottom: 90px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    z-index: 9999 !important;
  }

  .video-container, iframe {
    max-height: 25vh !important;
    width: 100% !important;
    margin: 5px 0 !important;
  }
  .vote-btn, .start-btn {
    height: 45px !important;
    margin: 5px 0 !important;
    font-size: 14px !important;
  }

  .bottom-nav {
    height: 65px !important;
    display: flex !important;
    justify-content: space-around !important;
    align-items: center !important;
    padding-bottom: env(safe-area-inset-bottom) !important;
    background: rgba(0, 0, 0, 0.95) !important;
  }
  .nav-item i { font-size: 18px !important; }
  .nav-item span { font-size: 9px !important; display: block !important; }

  .creators-grid { display: flex !important; flex-direction: column !important; gap: 10px !important; }
  .creator-card { width: 100% !important; min-height: 160px !important; }
}
```

## Relevant files
- `client/src/index.css`

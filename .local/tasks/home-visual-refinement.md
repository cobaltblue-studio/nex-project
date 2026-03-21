# Home Page High-End Visual Refinement

## What & Why
Polish the Home page's visual layer to feel more premium and exclusive — without touching any voting or navigation logic. This covers four targeted improvements from the design brief: hero content repositioning, a sophisticated audio visualizer replacement, CTA button spacing, and consistent neon glow across all section titles.

## Done looks like
- The "NEX" title block sits noticeably higher on the hero — approximately 1/3 from the top of the viewport instead of centre-screen
- The background visualizer no longer renders vertical bars; instead it renders a smooth, silk-like SVG waveform or pulsating particles effect in semi-transparent Neon Green (#00FF80), layered tightly into the dark gradient background with a faint grain overlay for depth
- The space between the three CTA buttons (Start Battle / Submit Track / Radio) is increased by ~20px compared to the current `gap-5` setting
- The "NEX" heading retains its neon glow and has a subtle premium/metallic quality to the letterform (achieved via CSS text-shadow layering or a slight gradient fill, not an image)
- All section h2 titles ("The Billboard for AI Music", "Battle-Driven Rankings", "Creator Ecosystem", etc.) carry the same consistent `neon-text-strong neon-text-green` glow treatment and spacing alignment — none are missing or weaker than the others

## Out of scope
- Any changes to voting logic, navigation routing, or API calls
- Changes to pages other than Home.tsx
- New dependencies or external libraries

## Tasks
1. **Reposition the hero content block** — Adjust the hero section's vertical padding and flex alignment so the NEX title lands at roughly 1/3 from the top of the screen on both desktop and mobile.

2. **Replace HeroVisualizer with SVG waveform / particles** — Rewrite the `HeroVisualizer` component to render an animated SVG waveform (or canvas-drawn pulsating particles) using smooth sine-wave math. Use semi-transparent `#00FF80`, and ensure the grain overlay is tightened around the visualizer layer so it blends seamlessly into the dark background.

3. **Increase CTA button gap and add metallic NEX texture** — Change the flex container gap for the three CTA buttons from `gap-5` to approximately `gap-9` (≈36px). Enhance the NEX h1 with a subtle layered `text-shadow` or `background-clip: text` gradient to give the lettering a slightly metallic premium finish while preserving the existing neon glow.

4. **Audit and unify neon glow on all section titles** — Review every `h2` on the Home page and confirm each one has `neon-text-strong neon-text-green` applied with consistent uppercase tracking and spacing to match the hero title treatment.

## Relevant files
- `client/src/pages/Home.tsx`
- `client/src/index.css`

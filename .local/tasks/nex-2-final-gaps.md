# NEX 2.0 Final Gaps

## What & Why
Three remaining items from the NEX 2.0 spec are not yet implemented: the Home page needs to become an investor-ready landing page, Submit Track is missing an originality checkbox and duplicate URL prevention, and the battle result screen countdown is 5s instead of the spec's 7s.

## Done looks like
- Home page has distinct sections: Hero (title/subtitle/CTA), Platform Concept, Battle System Intro, Creator Ecosystem, and a final Call to Action — styled to appeal to investors and government funding audiences while matching the existing neon dark theme.
- Submit Track form has an "I confirm this track is original AI-generated content" checkbox that must be checked before submission is allowed.
- Submit Track backend rejects (and frontend detects) duplicate track URLs before the form is submitted.
- Battle result/countdown screen auto-advances after 7 seconds (not 5).

## Out of scope
- Changing the navigation structure (already correct).
- Changing the visual theme or fonts (already applied).
- Changing the battle daily limit (already 3/day).
- Chart 100-slot logic (already implemented).
- Creators 4×5 grid (already implemented).

## Tasks
1. **Investor-ready Home page** — Redesign `Home.tsx` to include five clear sections: Hero, Platform Concept (what NEX is and why it matters), Battle System Intro (how the battle engine works), Creator Ecosystem (stats/value for creators), and a Call to Action (join/invest/submit). Reuse the existing glassmorphism card style and neon accent colors; do not change the theme.
2. **Submit Track: originality checkbox + duplicate URL prevention** — Add a required "I confirm this is original AI-generated content" checkbox to the `SubmitTrack.tsx` form (submission blocked until checked). Add a backend endpoint or extend the existing submit route to check if the URL already exists in the tracks table and return a 409 conflict; surface the error clearly in the frontend before the user submits.
3. **Battle result timer fix** — Change the result-screen auto-advance countdown from 5 seconds to 7 seconds in `Battle.tsx`.

## Relevant files
- `client/src/pages/Home.tsx`
- `client/src/pages/SubmitTrack.tsx`
- `client/src/pages/Battle.tsx`
- `server/routes.ts`
- `server/storage.ts`
- `shared/schema.ts`

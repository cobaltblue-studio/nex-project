# Update Submit Track Genre List

## What & Why
Replace the current 6 genre options in the Submit Track form with a new set of 6 specific genres. The backend validation whitelist must also be updated to match.

## Done looks like
- The genre dropdown in the Submit Track form shows exactly these 6 options in order: Pop, Dance, Rock, Hip-Hop & Rap, Funk, Lo-Fi & Chill
- Submitting a track with any of these genres succeeds
- Submitting with any old genre value (e.g. "Synth Pop", "EDM") is rejected by the backend

## Out of scope
- Any visual or layout changes to the form
- Changes to other parts of the app

## Tasks
1. Update the `GENRES` constant in `SubmitTrack.tsx` to the new list: Pop, Dance, Rock, Hip-Hop & Rap, Funk, Lo-Fi & Chill
2. Update the backend `validGenres` array in `server/routes.ts` to match the same 6 strings exactly

## Relevant files
- `client/src/pages/SubmitTrack.tsx`
- `server/routes.ts`

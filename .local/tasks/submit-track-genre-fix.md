# Submit Track Genre Fix

## What & Why
The Submit Track form fails with a 400 error because the Genre field is missing from the UI — the form schema defines it but there is no dropdown rendered in the JSX, so nothing gets sent to the backend. Additionally, the genre list needs to be updated to the 6 agreed-upon genres, and the frontend schema needs to make genre required so the form catches the error before hitting the server.

## Done looks like
- A Genre dropdown (Select) appears between Creator Name and Track Type in the Submit Track form
- The 6 genre options are: Pop, Synth Pop, Rock, Hip-Hop/R&B, EDM, Funk/Lo-Fi
- Selecting a genre and submitting successfully saves the track as PENDING
- The form shows a validation error if genre is not selected (client-side)
- The backend validGenres list matches these same 6 genres
- The "SUBMIT TRACK" page title remains correctly aligned

## Out of scope
- Changes to any other pages or forms
- Changes to existing tracks' genre values in the database
- Any visual redesign of the form beyond adding the dropdown

## Tasks
1. **Add Genre dropdown to the form** — In `SubmitTrack.tsx`, add a Select (or styled native select) for genre between the Creator Name and Track Type fields. Make genre required in the Zod schema (remove `.optional()`). Update the `GENRES` constant to `["Pop", "Synth Pop", "Rock", "Hip-Hop/R&B", "EDM", "Funk/Lo-Fi"]`.

2. **Update backend genre validation** — In `server/routes.ts`, update the `validGenres` array on the `/api/tracks/submit` route to `["Pop", "Synth Pop", "Rock", "Hip-Hop/R&B", "EDM", "Funk/Lo-Fi"]` to match the new frontend list.

## Relevant files
- `client/src/pages/SubmitTrack.tsx`
- `server/routes.ts:268-295`

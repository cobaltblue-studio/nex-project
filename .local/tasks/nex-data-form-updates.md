# NEX Data, Form & Routing Updates

## What & Why
Add a Track Type field (Audio Track vs Music Video) to the submission flow, implement routing logic that sends music videos to the MV page instead of the battle/chart pipeline, and surface the existing `country` field in creator profile editing.

## Done looks like
- The Submit Track form has a new **Track Type** field with two options: "Audio Track" and "Music Video"
- Submitting an **Audio Track** follows the existing flow: NEW → BATTLE queue → MUSIC CHART
- Submitting a **Music Video** routes to the Music Video page instead of the battle queue
- Admin panel (or automatic logic) correctly assigns submitted tracks to the right pipeline based on `trackType`
- Creator profile edit form shows a **Country** input field; saved country value is displayed on the creator's public profile page

## Out of scope
- Visual/animation changes (covered in the companion task)
- Home page or chart color changes

## Tasks
1. **Schema update** — Add a `trackType` column (`"audio" | "video"`, default `"audio"`) to the `tracks` table in `shared/schema.ts` and update the insert schema and types accordingly. Run the migration.

2. **Submit Track form field** — Add a "Track Type" radio group to `SubmitTrack.tsx` with options "Audio Track" and "Music Video". Wire it to the form and include it in the POST payload to `/api/tracks` (or equivalent submit endpoint).

3. **Backend routing logic** — Update the track submission handler in `server/routes.ts` and `server/storage.ts` so that tracks with `trackType = "video"` get a status that routes them to the Music Video page, and tracks with `trackType = "audio"` continue through the existing battle/chart pipeline.

4. **Country field in profile** — Add the `country` text input to the profile creation/editing form (the onboarding modal and any profile settings page). Ensure the value is saved via the existing profile update endpoint and displayed on the public creator profile page.

## Relevant files
- `shared/schema.ts`
- `client/src/pages/SubmitTrack.tsx`
- `server/routes.ts`
- `server/storage.ts`
- `client/src/components/OnboardingModal.tsx`
- `client/src/pages/Music.tsx`
- `client/src/pages/MusicVideo.tsx`

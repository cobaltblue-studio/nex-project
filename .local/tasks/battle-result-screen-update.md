# Battle Result Screen Update

## What & Why
Update the battle result screen so it stays visible for 7 seconds (up from 4), and add a visible countdown timer so users know when it will auto-advance. Vote percentage, vote count, and winner title are already rendered — keep them as-is.

## Done looks like
- Result screen remains visible for 7 seconds before auto-advancing to the next battle
- A countdown indicator (e.g. "Next battle in 5s") is visible and ticks down in real time
- Vote percentages and counts for both tracks are still clearly shown
- Winner track title is prominently displayed
- "Next Battle" button remains functional and advances immediately when clicked
- No other battle logic (voting, genre selection, track playback) is changed

## Out of scope
- Redesigning the overall result layout
- Changing vote logic or backend behavior
- Modifying any phase other than "result"

## Tasks
1. **Extend auto-advance timer to 7 seconds** — Change the `setTimeout` in the `voteMutation.onSuccess` handler from 4000ms to 7000ms.
2. **Add countdown UI** — Track the remaining seconds with a `useEffect`-driven counter that starts at 7 when the result phase begins and decrements each second. Display it as a small label near the "Next Battle" button (e.g. "Auto-advancing in Xs…") that disappears once the user clicks "Next Battle".

## Relevant files
- `client/src/pages/Battle.tsx:161-189,508-660`

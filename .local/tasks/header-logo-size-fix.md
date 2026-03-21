# Header Logo Size Restore

## What & Why
The NEX header logo is oversized on mobile due to large font-size (`2.8rem`) and icon size (`w-12 h-12`) being applied at the base (mobile-first) level. This causes the logo to overflow the header bar. The desktop sizes are correct and must be preserved. Any `transform: scale(3)` or similarly excessive scaling must be removed.

## Done looks like
- On desktop (768px+): NEX logo text is ~30px (1.875rem) and icon is 32px — fitting cleanly inside the 80px header bar
- On mobile (<768px): NEX logo text is ~24px (1.5rem) and icon is 24px — contained within the header, not overflowing
- No `transform: scale()` or excessive font-size on the logo or icon
- Header bar looks professional and compact on all screen sizes

## Out of scope
- Any other navigation or layout changes
- Hero section logo (separate element)
- Any page content below the header

## Tasks
1. **Fix logo sizes in Layout header** — In the header `<Link>` containing the NEX brand, set the `<Disc3>` icon to `w-6 h-6 md:w-8 md:h-8` and the `<span>` text to `text-[1.5rem] md:text-[1.875rem]`. Remove any `transform: scale(3)` or oversized values. Ensure both elements remain vertically centered within the header.

## Relevant files
- `client/src/components/Layout.tsx:63-67`

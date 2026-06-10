# NEX B2B Data Dictionary

Machine-readable version: `GET /api/admin/export/data-dictionary.json` (admin auth).

## Export tiers

| File | PII | Use |
|------|-----|-----|
| `creator-tracks.csv` | Yes (email) | Internal creator outreach only |
| `b2b/*.csv` | No | Third-party data products |

## Anonymization

- `listener_id` = HMAC-SHA256(user id or session key) truncated to 16 hex chars
- Salt: `DATA_EXPORT_SALT` env (falls back to `SESSION_SECRET`)
- Raw `ai_prompt` text is **not** exported in B2B catalog (only `ai_prompt_char_count`)

## Daily snapshots

UTC midnight job (`startDailySnapshotScheduler`) writes:

- `data_daily_track_snapshots` — per-track metrics + chart rank
- `data_daily_platform_snapshots` — platform totals (insights history)

Manual capture: Admin panel **Capture today** or `npm run snapshots:capture`.

## Warehouse handoff

```bash
npm run export:b2b-bundle
```

Writes all B2B CSVs + dictionary to `exports/b2b-{date}/`. Set `B2B_EXPORT_WEBHOOK_URL` to push metadata (or full CSV payload via Admin **Push webhook**).

Legal: https://nexmusic.ai/data-policy

## Schema deploy

After pulling this release, run:

```bash
npm run db:push
```

New columns/tables: `tracks.provenance_status`, `track_plays.session_key`, `battles.is_archived`, snapshot tables.

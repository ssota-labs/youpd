# YouPD Notion Worker (`youpd-worker`)

Notion-hosted worker for **v0.5**: calls the YouPD REST API (`apps/web` `/api/youpd/rest`) with `YOUPD_API_TOKEN`, then applies **managed-database** upserts (`worker.sync`) for bulk collection without passing payloads through LLM tools.

## Secrets (via Notion CLI)

```bash
ntn workers env set YOUPD_API_TOKEN=your-rest-bearer-token
ntn workers env set YOUPD_API_BASE_URL=https://your-app.vercel.app
ntn workers env set SYNC_KEYWORDS=keyword-one,keyword-two
ntn workers env set TRACKED_VIDEOS_DATA_SOURCE_ID=notion-data-source-id-with-videoId-property
ntn workers env set HOT_REGION=KR
ntn workers env set COMMENT_VIDEO_ID=dQw4w9WgXcQ
```

`dailySnapshots` reads tracked video IDs from `TRACKED_VIDEOS_DATA_SOURCE_ID`.
The source database must expose one of these properties: `videoId`, `Video ID`, `영상 ID`, or `영상ID`.
If you start from a Notion database ID, resolve its data source ID with `ntn datasources resolve <database-id>`.

`NOTION_API_TOKEN` for sync schedules / local exec: see `.agents/skills/notion-workers/references/guide-notion-api.md`.

## Local smoke

```bash
pnpm --filter @youpd/notion-worker typecheck
ntn workers exec videosByKeyword -d '{"keyword":"test","max_results":5}' --local
```

# YouPD Notion Worker (`youpd-worker`)

Notion-hosted **tools-only** worker: each `worker.tool()` calls the YouPD REST API (`apps/web` `/api/youpd/rest` with `YOUPD_API_TOKEN`), then **upserts rows** into your **Custom Agent template** Notion databases via `context.notion` (no `worker.sync()`, no Worker-managed databases).

## Tools

| Tool | Purpose |
|------|---------|
| `checkWorkspace` | Read-only: validates env + data source IDs and schema (onboarding / troubleshooting). |
| `videosByKeyword` | `POST /search/keyword` → Videos DB upsert. |
| `channelAllVideos` | `GET /channels/{id}/videos` (paginated) → Videos DB upsert. Good for scheduler. |
| `videoComments` | `GET /videos/{id}/comments` → Comments DB upsert. |
| `snapshotTrackedVideos` | Reads tracked `videoId`s from Notion → `POST /snapshots/now` in batches → Video Snapshots DB upsert. Good for daily scheduler. |

Run `checkWorkspace` first after wiring env vars.

## Environment (Notion CLI / dashboard)

Secrets and **data source** wiring only (tracked videos/channels live as rows in Notion):

```bash
ntn workers env set YOUPD_API_TOKEN=your-rest-bearer-token
ntn workers env set YOUPD_API_BASE_URL=https://your-app.vercel.app

# Required for writes (data source IDs, not database page IDs — use `ntn datasources resolve`)
ntn workers env set YOUPD_VIDEOS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_SNAPSHOTS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_COMMENTS_DATA_SOURCE_ID=...

# Optional: only rows in this data source are snapshotted; if unset, all rows in Videos DS are used
ntn workers env set YOUPD_TRACKED_VIDEOS_DATA_SOURCE_ID=...
```

`NOTION_API_TOKEN` for local `ntn workers exec` / schedules: see `.agents/skills/notion-workers/references/guide-notion-api.md`.

### Property names

Upsert logic resolves columns by **name** (Korean or English). Videos need a **title** property and a `videoId` / `Video ID` / `영상 ID` style column. Snapshots use a stable **`rowKey`** (e.g. `videoId::snapshotDate`) and **title**. Comments use **`commentId`** (or equivalent).

## Custom Agent scheduler

Use **deterministic** tool calls with fixed args (minimal freeform prompt):

- **Daily:** `snapshotTrackedVideos` — e.g. empty object or defaults only.
- **Daily / weekly:** `channelAllVideos` per tracked channel (or a future wrapper that reads channel IDs from Notion and calls this tool in a loop).

## `workers.json` (Notion CLI)

`ntn` expects a valid `workers.json` next to the worker. After `ntn workers new` / `deploy`, it includes your IDs. Minimum shape for parsing (fill IDs after deploy):

```json
{
  "version": "1",
  "environment": "local",
  "workerId": "<from deploy>",
  "workspaceId": "<notion workspace id>"
}
```

`environment` must be one of: `local`, `dev`, `stg`, `prod`.

## Local checks

```bash
pnpm install
pnpm --filter @youpd/notion-worker typecheck
cd apps/notion-worker
ntn workers exec checkWorkspace -d '{}' --local
ntn workers exec videosByKeyword -d '{"keyword":"test","max_results":5}' --local
```

`--local` uses `tsx` (declared in this package). Load secrets from `.env` in this directory (`ntn` loads it by default) or pass `--dotenv`.

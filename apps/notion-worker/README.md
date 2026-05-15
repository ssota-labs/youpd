# YouPD Notion Worker (`youpd-worker`)

Notion-hosted **tools-only** worker: each `worker.tool()` calls the YouPD REST API (`apps/web` `/api/youpd/rest` with `YOUPD_API_TOKEN`), then **upserts rows** into your **Custom Agent template** Notion databases via `context.notion` (no `worker.sync()`, no Worker-managed databases).

## Canonical schema (SSOT)

Required column names and Notion types are defined in code: `src/lib/schema.ts` (`CANONICAL`, `validateCanonicalSchema`).  
Properties must match **exactly** (Korean labels as in the template). Examples:

- **Videos** — `제목`, `videoId`, `조회수(최신)`, `좋아요(최신)`, `댓글수(최신)`, `게시일`, `채널` (relation → Channels), `URL`, `수집일`
- **Channels** — `채널명`, `channelId`, `구독자`, `누적조회수`, `총 영상 수`, `개설일`, `평균좋아요`, `온라인 URL`
- **Video Snapshots** — `ID` (title), `영상` (relation → Videos), `스냅샷일`, `조회수`, `좋아요`, `댓글수`, `전일 대비 증가`
- **Channel Snapshots** — `ID` (title), `채널` (relation → Channels), `스냅샷일`, `구독자`, `누적조회수`, `총 영상 수`, `전일 대비 구독자 증가`
- **Comments** — `제목`, `commentId`, `영상` (relation → Videos), `본문`, `좋아요수`, `작성일시`

The `healthcheck` tool validates every configured data source against this contract.

## Tools

| Tool | Purpose |
|------|---------|
| `healthcheck` | Read-only: validates env + data source schemas vs canonical contract. |
| `videosByKeyword` | `POST /search/keyword` (optional `max_total_results` pagination) → Channels + Videos DB upsert. |
| `channelAllVideos` | `GET /channels/{id}/videos?all=true` → Channel row + Videos upserts. |
| `videoComments` | `GET /videos/{id}/comments` → Comments DB (requires the video row to exist in Videos). |
| `snapshotVideos` | Reads `videoId` from **Videos** DS → `POST /snapshots/now` → Video Snapshots DB. |
| `snapshotChannels` | Reads `channelId` from **Channels** DS → `POST /snapshots/channels` → Channel Snapshots DB. |

## Environment (Notion CLI / dashboard)

```bash
ntn workers env set YOUPD_API_TOKEN=your-rest-bearer-token
ntn workers env set YOUPD_API_BASE_URL=https://your-app.vercel.app

# Data source IDs (not database page IDs — use `ntn datasources resolve`)
ntn workers env set YOUPD_VIDEOS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_CHANNELS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_SNAPSHOTS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_CHANNEL_SNAPSHOTS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_COMMENTS_DATA_SOURCE_ID=...
```

`NOTION_API_TOKEN` for local `ntn workers exec` / schedules: see `.agents/skills/notion-workers/references/guide-notion-api.md`.

## Custom Agent scheduler

- **Daily:** `snapshotVideos`, `snapshotChannels`
- **Weekly / on demand:** `videosByKeyword`, `channelAllVideos`, `videoComments`

## `workers.json` (Notion CLI)

Minimum shape for `ntn` parsing:

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
ntn workers exec healthcheck -d '{}' --local
ntn workers exec videosByKeyword -d '{"keyword":"test","max_results":5}' --local
```

`--local` uses `tsx` (declared in this package). Load secrets from `.env` in this directory (`ntn` loads it by default) or pass `--dotenv`.

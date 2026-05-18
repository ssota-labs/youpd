# YouPD Notion Worker (`youpd-worker`)

Notion-hosted **tools-only** worker: each `worker.tool()` calls the YouPD REST API (`apps/web` `/api/youpd/rest` with `YOUPD_API_TOKEN`), then **upserts rows** into your **Custom Agent template** Notion databases via `context.notion` (no `worker.sync()`, no Worker-managed databases).

## Canonical schema (SSOT)

Required column names and Notion types are defined in code: `src/lib/schema.ts` (`CANONICAL`, `validateCanonicalSchema`).  
Properties must match **exactly** (Korean labels as in the template). Examples:

- **Videos** — `제목`, `videoId`, `조회수(최신)`, `좋아요(최신)`, `댓글수(최신)`, `게시일`, `채널` (relation → Channels), `URL`, `수집일`
- **Channels** — `채널명`, `channelId`, `구독자`, `누적조회수`, `총 영상 수`, `개설일`, `평균좋아요`, `온라인 URL`
- **Keywords** — `키워드` (title) + 상태/우선순위/명사 유형/마지막 수집일 + relations to Videos·Channels·후보 DB (see `schema.ts`)
- **Hot Video Daily** — `ID` (title), `진입일`, `차트 순위`, `regionCode`, `videoCategoryId`, `영상`, `출처`, optional `시드 키워드`, metrics columns (see `schema.ts`)
- **Selected Video Candidates** — `ID` (title), `영상 제목`, `videoId`, `영상`, `키워드`, `유스케이스`, `메모`, score fields, `URL`, `저장일`
- **Video Snapshots** — `ID` (title), `영상` (relation → Videos), `스냅샷일`, `조회수`, `좋아요`, `댓글수`, `전일 대비 증가`
- **Channel Snapshots** — `ID` (title), `채널` (relation → Channels), `스냅샷일`, `구독자`, `누적조회수`, `총 영상 수`, `전일 대비 구독자 증가`
- **Comments** — `제목`, `commentId`, `영상` (relation → Videos), `본문`, `좋아요수`, `작성일시`

The `healthcheck` tool validates every configured data source against this contract.

## Tools

| Tool | Purpose |
|------|---------|
| `healthcheck` | Read-only: validates env + data source schemas vs canonical contract. |
| `videosByKeyword` | `POST /search/keyword` → **Keywords** row (title = query) + merge **연결된 영상/채널** + Channels + Videos. |
| `saveVideoCandidatesToNotion` | `POST /query/video-candidates` → selected video candidate rows, with small input payload (`videoIds`, `useCase`, `keyword`, `note`). |
| `hotVideoDailyFromChart` | `GET /trending/hot-chart` → Channels/Videos + **Hot Video Daily** one row per chart rank. |
| `channelAllVideos` | `GET /channels/{id}/videos?all=true` → Channel row + Videos upserts. |
| `videoComments` | `GET /videos/{id}/comments` → Comments DB (requires the video row to exist in Videos). |
| `snapshotVideos` | Reads `videoId` from **Videos** DS → `POST /snapshots/now` → Video Snapshots DB. |
| `snapshotChannels` | Reads `channelId` from **Channels** DS → `POST /snapshots/channels` → Channel Snapshots DB. |

## Environment (Notion CLI / dashboard)

```bash
ntn workers env set YOUPD_API_TOKEN=your-rest-bearer-token
ntn workers env set YOUPD_API_BASE_URL=https://your-app.vercel.app

# Data source IDs (not database page IDs — use `ntn datasources resolve`)
ntn workers env set YOUPD_KEYWORDS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_HOT_VIDEO_DAILY_DATA_SOURCE_ID=...

ntn workers env set YOUPD_VIDEOS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_CHANNELS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_SNAPSHOTS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_CHANNEL_SNAPSHOTS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_COMMENTS_DATA_SOURCE_ID=...
ntn workers env set YOUPD_VIDEO_CANDIDATES_DATA_SOURCE_ID=...
```

`NOTION_API_TOKEN` for local `ntn workers exec` / schedules: see `.agents/skills/notion-workers/references/guide-notion-api.md`.

## Custom Agent scheduler

- **Daily / chart:** `snapshotVideos`, `snapshotChannels`, `hotVideoDailyFromChart` (region optional)
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

Copy [`.env.example`](./.env.example) to `.env` or `.env.local` and fill in values. If you use `.env.local`, pass **`--dotenv .env.local`** to `ntn` (default loads `.env` only).

```bash
pnpm install
pnpm --filter @youpd/notion-worker typecheck
cd apps/notion-worker
ntn workers exec healthcheck -d '{}' --local
ntn workers exec videosByKeyword -d '{"keyword":"test","max_results":5,"max_total_results":null}' --local
```

`--local` uses `tsx` (declared in this package). Load secrets from `.env` in this directory (`ntn` loads it by default) or pass `--dotenv`.

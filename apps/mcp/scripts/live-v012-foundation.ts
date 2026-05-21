/**
 * Live v0.12 REST smoke for the MCP Foundation surface.
 *
 * Usage:
 *   pnpm --filter @youpd/mcp test:live:v012 "퇴사"
 *
 * Requires @youpd/web running and apps/mcp/.env.local containing
 * YOUPD_API_BASE_URL, YOUPD_API_TOKEN, YOUTUBE_API_KEY, and DATABASE_URL.
 */
import fs from 'node:fs';
import path from 'node:path';

function loadDotenv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] !== undefined && process.env[key] !== '') continue;
    process.env[key] = value;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.replace(/\/+$/, '');
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function postJson<T>(pathName: string, body: unknown): Promise<T> {
  const base = requireEnv('YOUPD_API_BASE_URL');
  const token = requireEnv('YOUPD_API_TOKEN');
  const response = await fetch(`${base}${pathName}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`REST ${response.status} ${pathName}: ${text}`);
  }
  return JSON.parse(text) as T;
}

async function main(): Promise<void> {
  loadDotenv(path.resolve(process.cwd(), '.env.local'));
  const keyword = process.argv[2] ?? '퇴사';

  const search = await postJson<{
    data: {
      data: {
        videos: { videoId: string; title: string }[];
        quotaSessionId: string | null;
      };
      harvest: { id: string | null } | null;
    };
  }>('/api/youpd/rest/youtube/search/videos', {
    keyword,
    limit: 5,
    persist: true,
  });
  const first = search.data.data.videos[0];
  if (!first) throw new Error('expected at least one search result');
  console.log(`search ok: ${search.data.data.videos.length} videos, first=${first.videoId}`);

  const snapshots = await postJson<{
    data: {
      data: {
        videoSnapshots: { video_id: string; views: number | null }[];
      };
    };
  }>('/api/youpd/rest/youtube/snapshots/capture', {
    videoIds: [first.videoId],
    persist: true,
  });
  console.log(
    `snapshot ok: ${snapshots.data.data.videoSnapshots.length} rows for ${first.videoId}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

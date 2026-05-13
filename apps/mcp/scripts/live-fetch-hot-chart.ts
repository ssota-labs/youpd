/**
 * Live E2E for fetch_hot_chart against the real YouTube Data API + local
 * Supabase. 1 unit per call.
 *
 * Usage:
 *   pnpm --filter @youpd/mcp tsx scripts/live-fetch-hot-chart.ts [region] [category] [limit]
 *   pnpm --filter @youpd/mcp tsx scripts/live-fetch-hot-chart.ts KR 22 10
 */
import fs from 'node:fs';
import path from 'node:path';
import { fetchHotChart } from '@youpd/api/mcp/tools';
import { desc, getDbClient, searchSessions } from '@youpd/db';

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

async function main(): Promise<void> {
  loadDotenv(path.resolve(process.cwd(), '.env.local'));
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not set in apps/mcp/.env.local');
  }

  const region = process.argv[2] ?? 'KR';
  const category = process.argv[3];
  const limit = Number(process.argv[4] ?? 5);

  console.log(`▶ fetch_hot_chart(region=${region}, category=${category ?? '∅'}, limit=${limit})`);
  const out = await fetchHotChart({
    region_code: region,
    ...(category ? { category_id: category } : {}),
    limit,
  });

  console.log(`\n✅ videos returned: ${out.videos.length}`);
  for (const v of out.videos.slice(0, 5)) {
    console.log(`  - ${v.videoId}  ${v.title}  views=${v.views}  channel=${v.channelTitle}`);
  }
  console.log(`\n✅ units_consumed: ${out.units_consumed}`);
  console.log(`✅ source: ${out.source}`);

  const db = getDbClient();
  const rows = await db
    .select()
    .from(searchSessions)
    .orderBy(desc(searchSessions.occurredAt))
    .limit(1);
  console.log('\n✅ search_sessions row:');
  console.log(JSON.stringify(rows[0], null, 2));
}

main().catch((err) => {
  console.error('\n❌ live test failed:', err);
  process.exitCode = 1;
});

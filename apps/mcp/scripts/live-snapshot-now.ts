/**
 * Live E2E for snapshot_now against the real YouTube Data API + local Supabase.
 * 1 unit per 50-video batch.
 *
 * Usage:
 *   pnpm --filter @youpd/mcp tsx scripts/live-snapshot-now.ts vidA vidB vidC ...
 *   (defaults to a stable demo video if no ids given)
 */
import fs from 'node:fs';
import path from 'node:path';
import { snapshotNow } from '@youpd/api/mcp/tools';
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

  const ids = process.argv.slice(2);
  // Default: a few stable Korean videos from recent fetch_hot_chart runs.
  const videoIds = ids.length > 0
    ? ids
    : ['zuFEeNvc-ME', 'jpG_4K2W-yM', 'HmFRJA33sfg'];

  console.log(`▶ snapshot_now(video_ids=[${videoIds.length}])`);
  const out = await snapshotNow({ video_ids: videoIds });

  console.log(`\n✅ snapshots: ${out.snapshots.length}`);
  for (const s of out.snapshots) {
    console.log(`  - ${s.video_id}  date=${s.snapshot_date}  views=${s.views}  likes=${s.likes}  comments=${s.comments}`);
  }
  if (out.missing_video_ids.length > 0) {
    console.log(`\n⚠️  missing: ${out.missing_video_ids.join(', ')}`);
  }
  console.log(`\n✅ batches=${out.batches}  units_consumed=${out.units_consumed}`);

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

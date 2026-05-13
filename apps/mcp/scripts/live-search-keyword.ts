/**
 * Live E2E for search_keyword against the real YouTube Data API + local
 * Supabase. Reads apps/mcp/.env.local explicitly (Next.js' env loader is not
 * active outside `next dev` / `next build`).
 *
 * Usage:
 *   pnpm --filter @youpd/mcp tsx scripts/live-search-keyword.ts "시니어 케어"
 *
 * Exits non-zero on any error. Prints the first 3 videos + 1 channel + quota
 * accounting + a fresh search_sessions row.
 */
import fs from 'node:fs';
import path from 'node:path';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { searchKeyword } from '@youpd/api/mcp/tools';
import { getDbClient } from '@youpd/db';
import { searchSessions } from '@youpd/db';
import { desc } from 'drizzle-orm';

function loadDotenv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
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
  // Resolve env file relative to repo layout. cwd is apps/mcp when invoked via
  // the pnpm script; falling back to process.cwd() keeps this robust.
  loadDotenv(path.resolve(process.cwd(), '.env.local'));

  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not set in apps/mcp/.env.local');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in apps/mcp/.env.local');
  }

  const keyword = process.argv[2] ?? '시니어 케어';
  const maxResults = Number(process.argv[3] ?? 10);

  console.log(`▶ search_keyword(keyword=${JSON.stringify(keyword)}, max_results=${maxResults})`);

  const out = await searchKeyword({
    keyword,
    max_results: maxResults,
    order: 'relevance',
  });

  console.log(`\n✅ videos returned: ${out.videos.length}`);
  for (const v of out.videos.slice(0, 3)) {
    console.log(`  - ${v.videoId}  ${v.title}  views=${v.views}  duration=${v.durationSeconds}s`);
  }
  console.log(`\n✅ channels returned: ${out.channels.length}`);
  if (out.channels[0]) {
    const c = out.channels[0];
    console.log(`  - ${c.channelId}  ${c.title}  subs=${c.subscriberCount}  videos=${c.videoCount}`);
  }
  console.log(`\n✅ units_consumed: ${out.units_consumed}`);

  // Pull the most recent search_sessions row to confirm the audit log fired.
  const db = getDbClient();
  const rows = await db
    .select()
    .from(searchSessions)
    .orderBy(desc(searchSessions.occurredAt))
    .limit(1);

  if (rows.length === 0) {
    throw new Error('expected a search_sessions row but found none');
  }
  console.log('\n✅ search_sessions row:');
  console.log(JSON.stringify(rows[0], null, 2));
}

main().catch((err) => {
  console.error('\n❌ live test failed:', err);
  process.exitCode = 1;
});

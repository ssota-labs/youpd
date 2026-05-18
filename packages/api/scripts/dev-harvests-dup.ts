/**
 * Reproduces the production `ON CONFLICT DO UPDATE cannot affect row a
 * second time` failure by handing duplicated video ids to the upsert /
 * link path, then confirms the v0.9 dedup layer keeps the call green.
 *
 * Run with:
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
 *   pnpm --filter @youpd/api exec tsx --import ./scripts/register-shim.mjs \
 *     scripts/dev-harvests-dup.ts
 */
import {
  upsertChannels,
  upsertVideos,
} from '@youpd/supabase/repositories/youtube';
import {
  createHarvest,
  linkHarvestChannels,
  linkHarvestVideos,
} from '@youpd/supabase/repositories/harvests';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function main() {
  const ts = Date.now();
  const ch = `UC_dup_${ts}`;
  const v1 = `vid_dup_${ts}_x`;
  const v2 = `vid_dup_${ts}_y`;

  console.log('1. upsertChannels with intentional duplicates');
  await upsertChannels([
    {
      channelId: ch,
      title: 'first',
      subscriberCount: 1,
      viewCount: 1,
      videoCount: 1,
      publishedAt: null,
      url: null,
    },
    {
      channelId: ch,
      title: 'second',
      subscriberCount: 2,
      viewCount: 2,
      videoCount: 2,
      publishedAt: null,
      url: null,
    },
  ]);

  console.log('2. upsertVideos with intentional duplicates');
  await upsertVideos([
    {
      videoId: v1,
      channelId: ch,
      title: 'a',
      views: 1,
      likes: 0,
      comments: 0,
      durationSec: 1,
      publishedAt: null,
      url: null,
    },
    {
      videoId: v1, // duplicate
      channelId: ch,
      title: 'b',
      views: 99,
      likes: 0,
      comments: 0,
      durationSec: 1,
      publishedAt: null,
      url: null,
    },
    {
      videoId: v2,
      channelId: ch,
      title: 'c',
      views: 1,
      likes: 0,
      comments: 0,
      durationSec: 1,
      publishedAt: null,
      url: null,
    },
  ]);

  console.log('3. createHarvest + linkHarvestVideos with duplicate video_id');
  const h = await createHarvest({
    keywordIdeaPageId: `idea-dup-${ts}`,
    keyword: 'dup',
    searchSessionId: null,
    totalVideos: 2,
    totalChannels: 1,
  });
  await linkHarvestChannels(h.id, [ch, ch]); // duplicate channel
  await linkHarvestVideos(h.id, [
    { videoId: v1, position: 0 },
    { videoId: v1, position: 7 }, // duplicate — should be dropped
    { videoId: v2, position: 1 },
  ]);

  console.log('✅ All duplicate-input scenarios completed without Postgres 21000.');
  assert(true, 'unreachable');
}

main()
  .catch((e) => {
    console.error('\n❌ Failed (likely ON CONFLICT 21000):', e);
    process.exit(1);
  })
  .finally(() => process.exit(0));

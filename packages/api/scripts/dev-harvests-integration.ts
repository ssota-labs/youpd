/**
 * Local integration smoke test for the Supabase-staged harvest flow.
 *
 * Bypasses Notion + YouTube — wires the canonical-upsert / harvest-linkage /
 * mark-published / finalize repos directly against the local Supabase
 * Postgres started by `pnpm db:up`. Confirms the schema + RLS + repository
 * code path end-to-end without needing a YouTube API key.
 *
 * Run with:
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
 *   tsx scripts/dev-harvests-integration.ts
 */
import { getDbClient, videos, eq } from '@youpd/db';
import {
  upsertChannels,
  upsertVideos,
} from '@youpd/supabase/repositories/youtube';
import {
  createHarvest,
  finalizeHarvest,
  findActiveHarvest,
  getHarvestRow,
  getHarvestStatus,
  linkHarvestChannels,
  linkHarvestVideos,
  listSyncedPageIds,
  listUnpublishedHarvestChannels,
  listUnpublishedHarvestVideos,
  markHarvestItemsPublished,
  setHarvestPublishing,
} from '@youpd/supabase/repositories/harvests';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function main() {
  const ideaPageId = `idea-${Date.now()}`;
  const ch1 = `UC_test_${Date.now()}_a`;
  const ch2 = `UC_test_${Date.now()}_b`;
  const v1 = `vid_${Date.now()}_1`;
  const v2 = `vid_${Date.now()}_2`;
  const v3 = `vid_${Date.now()}_3`;

  console.log('1. Upsert canonical channels + videos');
  await upsertChannels([
    {
      channelId: ch1,
      title: 'Channel A',
      subscriberCount: 1000,
      viewCount: 50000,
      videoCount: 100,
      publishedAt: new Date('2020-01-01T00:00:00Z'),
      url: 'https://www.youtube.com/channel/A',
    },
    {
      channelId: ch2,
      title: 'Channel B',
      subscriberCount: null,
      viewCount: null,
      videoCount: null,
      publishedAt: null,
      url: null,
    },
  ]);
  await upsertVideos([
    {
      videoId: v1,
      channelId: ch1,
      title: 'V1',
      views: 500,
      likes: 10,
      comments: 2,
      durationSec: 60,
      publishedAt: new Date('2024-06-01T00:00:00Z'),
      url: `https://www.youtube.com/watch?v=${v1}`,
    },
    {
      videoId: v2,
      channelId: ch1,
      title: 'V2',
      views: 200,
      likes: 3,
      comments: 0,
      durationSec: 30,
      publishedAt: new Date('2024-07-01T00:00:00Z'),
      url: `https://www.youtube.com/watch?v=${v2}`,
    },
    {
      videoId: v3,
      channelId: ch2,
      title: 'V3',
      views: 1000,
      likes: 50,
      comments: 5,
      durationSec: 120,
      publishedAt: new Date('2024-08-01T00:00:00Z'),
      url: `https://www.youtube.com/watch?v=${v3}`,
    },
  ]);

  console.log('2. Create harvest + link junctions');
  const harvest = await createHarvest({
    keywordIdeaPageId: ideaPageId,
    keyword: 'localtest',
    searchSessionId: null,
    totalVideos: 3,
    totalChannels: 2,
  });
  console.log('   harvest_id =', harvest.id, 'status =', harvest.status);
  assert(harvest.status === 'fetched', 'new harvest must start fetched');

  await linkHarvestChannels(harvest.id, [ch1, ch2]);
  await linkHarvestVideos(harvest.id, [
    { videoId: v1, position: 0 },
    { videoId: v2, position: 1 },
    { videoId: v3, position: 2 },
  ]);

  console.log('3. findActiveHarvest by keyword_idea_page_id');
  const active = await findActiveHarvest(ideaPageId);
  assert(active?.id === harvest.id, 'active lookup must match created harvest');

  console.log('4. setHarvestPublishing (idempotent)');
  await setHarvestPublishing(harvest.id);
  await setHarvestPublishing(harvest.id); // second call: no-op
  const after1 = await getHarvestRow(harvest.id);
  assert(after1?.status === 'publishing', 'status must flip to publishing');

  console.log('5. listUnpublished* — should see all 3 videos + 2 channels');
  const pendingCh = await listUnpublishedHarvestChannels(harvest.id, 100);
  const pendingV = await listUnpublishedHarvestVideos(harvest.id, 100);
  assert(pendingCh.length === 2, `expected 2 channels, got ${pendingCh.length}`);
  assert(pendingV.length === 3, `expected 3 videos, got ${pendingV.length}`);
  assert(
    pendingV[0]!.position === 0 && pendingV[2]!.position === 2,
    'videos must be ordered by position ASC',
  );
  console.log('   pendingV positions:', pendingV.map((p) => p.position));

  console.log('6. markHarvestItemsPublished — mix of videos + channels');
  await markHarvestItemsPublished(harvest.id, [
    { kind: 'channel', id: ch1, notionPageId: 'np-ch1' },
    { kind: 'channel', id: ch2, notionPageId: 'np-ch2' },
    { kind: 'video', id: v1, notionPageId: 'np-v1' },
  ]);
  const status1 = await getHarvestStatus(harvest.id);
  console.log('   after partial publish:', {
    unpublished_v: status1!.unpublishedVideos,
    unpublished_c: status1!.unpublishedChannels,
  });
  assert(status1!.unpublishedChannels === 0, 'all channels should be synced');
  assert(status1!.unpublishedVideos === 2, '2 videos should still be pending');

  console.log('7. Verify notion_page_id cached on canonical videos/channels');
  const db = getDbClient();
  const [v1row] = await db
    .select()
    .from(videos)
    .where(eq(videos.videoId, v1))
    .limit(1);
  assert(
    v1row?.notionPageId === 'np-v1',
    'canonical video must cache notion_page_id',
  );
  console.log('   canonical', v1, '→', v1row?.notionPageId);

  console.log('8. mark remaining videos, then list synced page ids');
  await markHarvestItemsPublished(harvest.id, [
    { kind: 'video', id: v2, notionPageId: 'np-v2' },
    { kind: 'video', id: v3, notionPageId: 'np-v3' },
  ]);
  const status2 = await getHarvestStatus(harvest.id);
  assert(
    status2!.unpublishedVideos === 0 && status2!.unpublishedChannels === 0,
    'everything synced',
  );

  const synced = await listSyncedPageIds(harvest.id);
  console.log('   synced video page ids:', synced.videoPageIds.sort());
  console.log('   synced channel page ids:', synced.channelPageIds.sort());
  assert(
    synced.videoPageIds.sort().join(',') === ['np-v1', 'np-v2', 'np-v3'].join(','),
    'synced video page ids mismatch',
  );
  assert(
    synced.channelPageIds.sort().join(',') === ['np-ch1', 'np-ch2'].join(','),
    'synced channel page ids mismatch',
  );

  console.log('9. finalizeHarvest');
  await finalizeHarvest(harvest.id, 'np-kw');
  const final = await getHarvestStatus(harvest.id);
  assert(final?.status === 'published', 'status must be published');
  assert(final?.finalized === true, 'finalized flag must be true');
  assert(
    final?.notionKeywordPageId === 'np-kw',
    'notion_keyword_page_id must be stamped',
  );
  assert(final?.finishedAt != null, 'finished_at must be set');
  console.log('   final harvest status:', final?.status, 'finalized:', final?.finalized);

  console.log('10. findActiveHarvest now returns null (no longer non-finalized)');
  const active2 = await findActiveHarvest(ideaPageId);
  assert(active2 === null, 'finalized harvest must be excluded from active lookup');

  console.log('11. Repeat-mark is idempotent (no DB error)');
  await markHarvestItemsPublished(harvest.id, [
    { kind: 'video', id: v1, notionPageId: 'np-v1' },
  ]);

  console.log('\n✅ All integration assertions passed.');
}

main()
  .catch((e) => {
    console.error('\n❌ Integration test failed:', e);
    process.exit(1);
  })
  .finally(() => process.exit(0));

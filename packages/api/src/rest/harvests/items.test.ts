import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ListHarvestItemsInputSchema, listHarvestItems } from './items';
import { HarvestNotFoundError } from './errors';

vi.mock('@youpd/supabase/repositories/harvests', () => ({
  getHarvestRow: vi.fn(),
  listSyncedPageIds: vi.fn(),
  listUnpublishedHarvestChannels: vi.fn(),
  listUnpublishedHarvestVideos: vi.fn(),
  setHarvestPublishing: vi.fn(),
}));

import {
  getHarvestRow,
  listSyncedPageIds,
  listUnpublishedHarvestChannels,
  listUnpublishedHarvestVideos,
  setHarvestPublishing,
} from '@youpd/supabase/repositories/harvests';

describe('ListHarvestItemsInputSchema', () => {
  it('defaults size to 30 and include_published to false', () => {
    const parsed = ListHarvestItemsInputSchema.parse({ kind: 'video' });
    expect(parsed.size).toBe(30);
    expect(parsed.include_published).toBe(false);
  });
  it('rejects unknown kind', () => {
    expect(
      ListHarvestItemsInputSchema.safeParse({ kind: 'comment' }).success,
    ).toBe(false);
  });
  it('clamps size to ≤ 100', () => {
    expect(
      ListHarvestItemsInputSchema.safeParse({ kind: 'video', size: 101 })
        .success,
    ).toBe(false);
  });
});

describe('listHarvestItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws HarvestNotFoundError when the row is missing', async () => {
    vi.mocked(getHarvestRow).mockResolvedValue(null);
    await expect(
      listHarvestItems('h-missing', { kind: 'video', size: 10, include_published: false }),
    ).rejects.toBeInstanceOf(HarvestNotFoundError);
  });

  it('flips fetched → publishing on first call (idempotent)', async () => {
    vi.mocked(getHarvestRow).mockResolvedValue({
      id: 'h1',
      keywordIdeaPageId: 'p',
      keyword: 'k',
      searchSessionId: null,
      status: 'fetched',
      totalVideos: 0,
      totalChannels: 0,
      notionKeywordPageId: null,
      finalized: false,
      createdAt: new Date(),
      finishedAt: null,
    });
    vi.mocked(listUnpublishedHarvestVideos).mockResolvedValue([]);

    await listHarvestItems('h1', {
      kind: 'video',
      size: 10,
      include_published: false,
    });

    expect(setHarvestPublishing).toHaveBeenCalledWith('h1');
  });

  it('does not call setHarvestPublishing when status is already publishing', async () => {
    vi.mocked(getHarvestRow).mockResolvedValue({
      id: 'h2',
      keywordIdeaPageId: 'p',
      keyword: 'k',
      searchSessionId: null,
      status: 'publishing',
      totalVideos: 0,
      totalChannels: 0,
      notionKeywordPageId: null,
      finalized: false,
      createdAt: new Date(),
      finishedAt: null,
    });
    vi.mocked(listUnpublishedHarvestChannels).mockResolvedValue([]);

    await listHarvestItems('h2', {
      kind: 'channel',
      size: 10,
      include_published: false,
    });

    expect(setHarvestPublishing).not.toHaveBeenCalled();
  });

  it('returns synced page ids when include_published=true', async () => {
    vi.mocked(getHarvestRow).mockResolvedValue({
      id: 'h3',
      keywordIdeaPageId: 'p',
      keyword: 'k',
      searchSessionId: null,
      status: 'publishing',
      totalVideos: 0,
      totalChannels: 0,
      notionKeywordPageId: null,
      finalized: false,
      createdAt: new Date(),
      finishedAt: null,
    });
    vi.mocked(listSyncedPageIds).mockResolvedValue({
      videoPageIds: ['vp1', 'vp2'],
      channelPageIds: ['cp1'],
    });

    const out = await listHarvestItems('h3', {
      kind: 'video',
      size: 1,
      include_published: true,
    });

    expect(out.synced_video_page_ids).toEqual(['vp1', 'vp2']);
    expect(out.synced_channel_page_ids).toEqual(['cp1']);
    // include_published bypasses the per-row drain query.
    expect(listUnpublishedHarvestVideos).not.toHaveBeenCalled();
  });
});

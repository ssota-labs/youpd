import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  FinalizeHarvestInputSchema,
  finalizeHarvest,
  HarvestNotReadyError,
} from './finalize';
import { HarvestNotFoundError } from './errors';

vi.mock('@youpd/supabase/repositories/harvests', () => ({
  finalizeHarvest: vi.fn(async () => {}),
  getHarvestStatus: vi.fn(),
}));

import {
  finalizeHarvest as repoFinalize,
  getHarvestStatus,
} from '@youpd/supabase/repositories/harvests';

describe('FinalizeHarvestInputSchema', () => {
  it('requires notion_keyword_page_id', () => {
    expect(FinalizeHarvestInputSchema.safeParse({}).success).toBe(false);
  });
});

describe('finalizeHarvest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws HarvestNotFoundError when harvest is missing', async () => {
    vi.mocked(getHarvestStatus).mockResolvedValue(null);
    await expect(
      finalizeHarvest('h-missing', { notion_keyword_page_id: 'kw' }),
    ).rejects.toBeInstanceOf(HarvestNotFoundError);
  });

  it('throws HarvestNotReadyError when items remain unpublished', async () => {
    vi.mocked(getHarvestStatus).mockResolvedValue({
      id: 'h1',
      keywordIdeaPageId: 'p',
      keyword: 'k',
      status: 'publishing',
      totalVideos: 100,
      totalChannels: 20,
      unpublishedVideos: 30,
      unpublishedChannels: 5,
      finalized: false,
      notionKeywordPageId: null,
      createdAt: new Date(),
      finishedAt: null,
    });
    await expect(
      finalizeHarvest('h1', { notion_keyword_page_id: 'kw' }),
    ).rejects.toBeInstanceOf(HarvestNotReadyError);
    expect(repoFinalize).not.toHaveBeenCalled();
  });

  it('finalizes when all items are published', async () => {
    vi.mocked(getHarvestStatus).mockResolvedValue({
      id: 'h2',
      keywordIdeaPageId: 'p',
      keyword: 'k',
      status: 'publishing',
      totalVideos: 50,
      totalChannels: 10,
      unpublishedVideos: 0,
      unpublishedChannels: 0,
      finalized: false,
      notionKeywordPageId: null,
      createdAt: new Date(),
      finishedAt: null,
    });
    const out = await finalizeHarvest('h2', {
      notion_keyword_page_id: 'kw-page',
    });
    expect(out).toEqual({ harvest_id: 'h2', finalized: true });
    expect(repoFinalize).toHaveBeenCalledWith('h2', 'kw-page');
  });

  it('is idempotent on already-finalized harvests (skips ready-check)', async () => {
    vi.mocked(getHarvestStatus).mockResolvedValue({
      id: 'h3',
      keywordIdeaPageId: 'p',
      keyword: 'k',
      status: 'published',
      totalVideos: 50,
      totalChannels: 10,
      // Pretend there are unpublished rows lying around — finalized=true
      // means we still allow the call through as a no-op rewrite.
      unpublishedVideos: 1,
      unpublishedChannels: 1,
      finalized: true,
      notionKeywordPageId: 'kw-existing',
      createdAt: new Date(),
      finishedAt: new Date(),
    });
    await expect(
      finalizeHarvest('h3', { notion_keyword_page_id: 'kw-existing' }),
    ).resolves.toEqual({ harvest_id: 'h3', finalized: true });
    expect(repoFinalize).toHaveBeenCalled();
  });
});

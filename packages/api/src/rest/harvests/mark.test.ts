import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  MarkHarvestPublishedInputSchema,
  markHarvestPublished,
} from './mark';
import { HarvestNotFoundError } from './errors';

vi.mock('@youpd/supabase/repositories/harvests', () => ({
  getHarvestRow: vi.fn(),
  markHarvestItemsPublished: vi.fn(async () => {}),
}));

import {
  getHarvestRow,
  markHarvestItemsPublished,
} from '@youpd/supabase/repositories/harvests';

describe('MarkHarvestPublishedInputSchema', () => {
  it('requires at least one item', () => {
    expect(
      MarkHarvestPublishedInputSchema.safeParse({ items: [] }).success,
    ).toBe(false);
  });
  it('rejects unknown kind', () => {
    expect(
      MarkHarvestPublishedInputSchema.safeParse({
        items: [{ kind: 'comment', id: 'x', notion_page_id: 'y' }],
      }).success,
    ).toBe(false);
  });
  it('caps items at 200', () => {
    const big = Array.from({ length: 201 }, (_, i) => ({
      kind: 'video' as const,
      id: `v${i}`,
      notion_page_id: `p${i}`,
    }));
    expect(
      MarkHarvestPublishedInputSchema.safeParse({ items: big }).success,
    ).toBe(false);
  });
});

describe('markHarvestPublished', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws HarvestNotFoundError when the harvest is missing', async () => {
    vi.mocked(getHarvestRow).mockResolvedValue(null);
    await expect(
      markHarvestPublished('h-missing', {
        items: [
          { kind: 'video', id: 'v1', notion_page_id: 'p1' },
        ],
      }),
    ).rejects.toBeInstanceOf(HarvestNotFoundError);
    expect(markHarvestItemsPublished).not.toHaveBeenCalled();
  });

  it('forwards mapped items to the repository', async () => {
    vi.mocked(getHarvestRow).mockResolvedValue({
      id: 'h1',
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
    const out = await markHarvestPublished('h1', {
      items: [
        { kind: 'video', id: 'v1', notion_page_id: 'np1' },
        { kind: 'channel', id: 'c1', notion_page_id: 'np2' },
      ],
    });
    expect(out).toEqual({ harvest_id: 'h1', updated: 2 });
    expect(markHarvestItemsPublished).toHaveBeenCalledWith('h1', [
      { kind: 'video', id: 'v1', notionPageId: 'np1' },
      { kind: 'channel', id: 'c1', notionPageId: 'np2' },
    ]);
  });
});

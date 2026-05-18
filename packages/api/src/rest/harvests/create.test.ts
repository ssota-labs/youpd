import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CreateHarvestInputSchema,
  createHarvest,
} from './create';

vi.mock('../../mcp/tools/search-keyword', async (importOriginal) => {
  const real =
    await importOriginal<typeof import('../../mcp/tools/search-keyword')>();
  return {
    ...real,
    searchKeyword: vi.fn(),
  };
});

vi.mock('@youpd/supabase/repositories/youtube', () => ({
  upsertChannels: vi.fn(async () => {}),
  upsertVideos: vi.fn(async () => {}),
}));

vi.mock('@youpd/supabase/repositories/harvests', () => ({
  createHarvest: vi.fn(),
  linkHarvestChannels: vi.fn(async () => {}),
  linkHarvestVideos: vi.fn(async () => {}),
}));

// Pull in the mocks so we can assert against them.
import { searchKeyword } from '../../mcp/tools/search-keyword';
import {
  upsertChannels,
  upsertVideos,
} from '@youpd/supabase/repositories/youtube';
import {
  createHarvest as repoCreateHarvest,
  linkHarvestChannels,
  linkHarvestVideos,
} from '@youpd/supabase/repositories/harvests';

describe('CreateHarvestInputSchema', () => {
  it('requires keyword + keyword_idea_page_id', () => {
    expect(
      CreateHarvestInputSchema.safeParse({ keyword: 'k' }).success,
    ).toBe(false);
  });
  it('defaults results_per_keyword to 300', () => {
    const parsed = CreateHarvestInputSchema.parse({
      keyword: 'k',
      keyword_idea_page_id: 'p1',
    });
    expect(parsed.results_per_keyword).toBe(300);
  });
  it('rejects results_per_keyword > 500', () => {
    expect(
      CreateHarvestInputSchema.safeParse({
        keyword: 'k',
        keyword_idea_page_id: 'p1',
        results_per_keyword: 501,
      }).success,
    ).toBe(false);
  });
});

describe('createHarvest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts channels before videos, then creates harvest + links junctions', async () => {
    vi.mocked(searchKeyword).mockResolvedValue({
      keyword: 'cats',
      videos: [
        {
          videoId: 'v1',
          title: 'V1',
          description: '',
          channelId: 'c1',
          channelTitle: 'C1',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnails: {},
          durationSeconds: 60,
          views: 100,
          likes: 5,
          comments: 1,
          tags: [],
          categoryId: null,
          defaultAudioLanguage: null,
          url: 'https://www.youtube.com/watch?v=v1',
        },
        {
          videoId: 'v2',
          title: 'V2',
          description: '',
          channelId: 'c2',
          channelTitle: 'C2',
          publishedAt: '2024-01-02T00:00:00Z',
          thumbnails: {},
          durationSeconds: 120,
          views: 200,
          likes: 9,
          comments: 0,
          tags: [],
          categoryId: null,
          defaultAudioLanguage: null,
          url: 'https://www.youtube.com/watch?v=v2',
        },
      ],
      channels: [
        {
          channelId: 'c1',
          title: 'C1',
          description: '',
          publishedAt: '2020-01-01T00:00:00Z',
          thumbnails: {},
          subscriberCount: 1000,
          videoCount: 50,
          viewCount: 50000,
          hiddenSubscriberCount: false,
          uploadsPlaylistId: null,
          country: null,
          url: 'https://www.youtube.com/channel/c1',
        },
        {
          channelId: 'c2',
          title: 'C2',
          description: '',
          publishedAt: '2021-01-01T00:00:00Z',
          thumbnails: {},
          subscriberCount: null,
          videoCount: null,
          viewCount: null,
          hiddenSubscriberCount: true,
          uploadsPlaylistId: null,
          country: null,
          url: 'https://www.youtube.com/channel/c2',
        },
      ],
      units_consumed: 102,
      quota_session_id: 'sess-1',
      search_pages: 1,
    });
    vi.mocked(repoCreateHarvest).mockResolvedValue({
      id: 'h-abc',
      keywordIdeaPageId: 'idea-1',
      keyword: 'cats',
      status: 'fetched',
      totalVideos: 2,
      totalChannels: 2,
      searchSessionId: 'sess-1',
      notionKeywordPageId: null,
      finalized: false,
      createdAt: new Date('2026-05-18T00:00:00Z'),
      finishedAt: null,
    });

    const out = await createHarvest({
      keyword: 'cats',
      keyword_idea_page_id: 'idea-1',
      results_per_keyword: 50,
    });

    expect(out).toEqual({
      harvest_id: 'h-abc',
      keyword: 'cats',
      total_videos: 2,
      total_channels: 2,
      units_consumed: 102,
      search_pages: 1,
      quota_session_id: 'sess-1',
    });

    // Channels must be upserted before videos because videos.channel_id FKs
    // into channels.channel_id.
    const upsertChannelsCall = vi.mocked(upsertChannels).mock.invocationCallOrder[0];
    const upsertVideosCall = vi.mocked(upsertVideos).mock.invocationCallOrder[0];
    expect(upsertChannelsCall).toBeLessThan(upsertVideosCall!);

    expect(upsertChannels).toHaveBeenCalledWith([
      expect.objectContaining({ channelId: 'c1', subscriberCount: 1000 }),
      expect.objectContaining({ channelId: 'c2', subscriberCount: null }),
    ]);
    expect(upsertVideos).toHaveBeenCalledWith([
      expect.objectContaining({ videoId: 'v1', channelId: 'c1', durationSec: 60 }),
      expect.objectContaining({ videoId: 'v2', channelId: 'c2', durationSec: 120 }),
    ]);

    expect(linkHarvestChannels).toHaveBeenCalledWith('h-abc', ['c1', 'c2']);
    expect(linkHarvestVideos).toHaveBeenCalledWith('h-abc', [
      { videoId: 'v1', position: 0 },
      { videoId: 'v2', position: 1 },
    ]);
  });

  it('passes null search_session_id when searchKeyword does not return one', async () => {
    vi.mocked(searchKeyword).mockResolvedValue({
      keyword: 'k',
      videos: [],
      channels: [],
      units_consumed: 1,
      search_pages: 0,
    });
    vi.mocked(repoCreateHarvest).mockResolvedValue({
      id: 'h-empty',
      keywordIdeaPageId: 'p',
      keyword: 'k',
      status: 'fetched',
      totalVideos: 0,
      totalChannels: 0,
      searchSessionId: null,
      notionKeywordPageId: null,
      finalized: false,
      createdAt: new Date(),
      finishedAt: null,
    });

    await createHarvest({
      keyword: 'k',
      keyword_idea_page_id: 'p',
      results_per_keyword: 1,
    });

    expect(repoCreateHarvest).toHaveBeenCalledWith(
      expect.objectContaining({ searchSessionId: null }),
    );
  });
});

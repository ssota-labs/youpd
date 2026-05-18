import { describe, expect, it, vi } from 'vitest';
import type { Client } from '@notionhq/client';
import { CANONICAL } from './schema.js';
import { upsertSelectedVideoCandidateRow } from './notion-upsert.js';

describe('upsertSelectedVideoCandidateRow', () => {
  it('creates a candidate row with score and context properties', async () => {
    const create = vi.fn(async (input: unknown) => ({ id: 'new_page', input }));
    const notion = {
      dataSources: {
        query: vi.fn(async () => ({ results: [] })),
      },
      pages: {
        create,
      },
    } as unknown as Client;

    const kind = await upsertSelectedVideoCandidateRow(notion, 'ds1', {
      rowKey: '퇴사::key_content_research::v1',
      title: 'Good video',
      videoId: 'v1',
      videoPageId: 'video_page',
      keyword: '퇴사',
      useCase: 'key_content_research',
      note: 'Strong candidate',
      performanceRatio: 20,
      performanceGrade: 'Good',
      contributionRatio: 40,
      contributionGrade: 'Good',
      lengthAdjustedScore: 28.2,
      videoUrl: 'https://youtube.com/watch?v=v1',
      savedYmd: '2026-05-19',
    });

    expect(kind).toBe('created');
    expect(create).toHaveBeenCalledOnce();
    const payload = create.mock.calls[0]![0] as {
      properties: Record<string, unknown>;
    };
    expect(payload.properties).toHaveProperty(
      CANONICAL.selectedVideoCandidates.idTitle,
    );
    expect(payload.properties).toHaveProperty(
      CANONICAL.selectedVideoCandidates.videoRelation,
    );
    expect(payload.properties).toHaveProperty(
      CANONICAL.selectedVideoCandidates.performanceGrade,
    );
  });
});

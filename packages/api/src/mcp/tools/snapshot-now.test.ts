import { describe, expect, it, vi } from 'vitest';
import { snapshotNow } from './snapshot-now';
import { makeClient } from './test-utils';

vi.mock('../quota', () => ({
  attachQuotaSession: (result: unknown, sid: string | null) =>
    sid == null
      ? result
      : { ...(result as Record<string, unknown>), quota_session_id: sid },
  runWithBudget: async <T>(input: {
    units: number;
    call: () => Promise<{ resultCount: number; payload: T }>;
  }) => {
    const { payload } = await input.call();
    return { result: payload, unitsConsumed: input.units, sessionId: null };
  },
  QuotaExceededAtBudgetError: class extends Error {},
}));

function video(id: string, views = 100, likes = 5, comments = 1) {
  return {
    id,
    statistics: {
      viewCount: String(views),
      likeCount: String(likes),
      commentCount: String(comments),
    },
  };
}

describe('snapshotNow', () => {
  it('returns one snapshot per video with PT-calendar date', async () => {
    const client = makeClient({
      '/videos': () => ({ items: [video('v1', 10), video('v2', 20)] }),
    });
    const out = await snapshotNow({ video_ids: ['v1', 'v2'] }, client);
    expect(out.snapshots).toHaveLength(2);
    expect(out.snapshots[0]).toMatchObject({
      video_id: 'v1',
      views: 10,
      likes: 5,
      comments: 1,
    });
    // YYYY-MM-DD
    expect(out.snapshots[0]!.snapshot_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.missing_video_ids).toEqual([]);
    expect(out.batches).toBe(1);
    expect(out.units_consumed).toBe(1);
  });

  it('dedupes input video_ids before issuing requests', async () => {
    const client = makeClient({
      '/videos': (params) => {
        const ids = String(params.id ?? '').split(',');
        expect(ids).toEqual(['v1', 'v2']);
        return { items: [video('v1'), video('v2')] };
      },
    });
    const out = await snapshotNow(
      { video_ids: ['v1', 'v2', 'v1'] },
      client,
    );
    expect(out.snapshots).toHaveLength(2);
  });

  it('chunks into multiple batches when > 50 ids', async () => {
    const ids = Array.from({ length: 75 }, (_, i) => `v${i}`);
    let calls = 0;
    const client = makeClient({
      '/videos': (params) => {
        calls += 1;
        const batch = String(params.id ?? '').split(',');
        return { items: batch.map((id) => video(id)) };
      },
    });
    const out = await snapshotNow({ video_ids: ids }, client);
    expect(calls).toBe(2);
    expect(out.snapshots).toHaveLength(75);
    expect(out.batches).toBe(2);
    expect(out.units_consumed).toBe(2);
  });

  it('reports videos YouTube did not return as missing', async () => {
    const client = makeClient({
      '/videos': () => ({ items: [video('v1')] }),
    });
    const out = await snapshotNow(
      { video_ids: ['v1', 'private', 'deleted'] },
      client,
    );
    expect(out.snapshots).toHaveLength(1);
    expect(out.missing_video_ids).toEqual(['private', 'deleted']);
  });
});

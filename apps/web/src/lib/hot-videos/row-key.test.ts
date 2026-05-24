import { describe, expect, it } from 'vitest';
import type { HotVideoRow } from '@youpd/api/youtube';
import { dedupeHotVideoRows, hotVideoRowKey } from './row-key';

function row(overrides: Partial<HotVideoRow> = {}): HotVideoRow {
  return {
    hotDate: '2026-05-23',
    rank: 1,
    categoryId: '23',
    regionCode: 'KR',
    source: 'youtube_trending',
    video: { id: '7iPs58XWZVQ' } as HotVideoRow['video'],
    channel: null,
    ...overrides,
  };
}

describe('hotVideoRowKey', () => {
  it('includes rank and region so identical videos stay unique', () => {
    const first = row({ rank: 1 });
    const second = row({ rank: 2 });

    expect(hotVideoRowKey(first)).not.toBe(hotVideoRowKey(second));
  });
});

describe('dedupeHotVideoRows', () => {
  it('removes duplicate rows from infinite scroll merges', () => {
    const duplicate = row();
    const deduped = dedupeHotVideoRows([duplicate, duplicate, row({ rank: 2 })]);

    expect(deduped).toHaveLength(2);
  });
});

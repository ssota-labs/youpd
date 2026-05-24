import { describe, expect, it } from 'vitest';
import { parseHotVideoSearchParams } from './parse-params';
import {
  buildHotVideoSortHref,
  parseHotVideoSort,
  parseHotVideoViewMode,
} from './query-string';
import { getTodayInKorea } from './today-korea';

describe('parseHotVideoSearchParams', () => {
  it('parses filters and defaults', () => {
    const parsed = parseHotVideoSearchParams({
      q: '게임',
      date: '2026-05-20',
      categoryId: '20',
      page: '2',
      limit: '12',
    });

    expect(parsed).toMatchObject({
      q: '게임',
      date: '2026-05-20',
      regionCode: 'KR',
      categoryId: '20',
      page: 2,
      limit: 12,
    });
    expect(parsed.dateEnd).toBeUndefined();
  });

  it('defaults date to today in Korea when missing', () => {
    const parsed = parseHotVideoSearchParams({});
    expect(parsed.date).toBe(getTodayInKorea());
  });

  it('ignores dateEnd and keeps single-day date filter', () => {
    const parsed = parseHotVideoSearchParams({
      date: '2026-05-20',
      dateEnd: '2026-05-22',
    });

    expect(parsed.date).toBe('2026-05-20');
    expect(parsed.dateEnd).toBeUndefined();
  });

  it('parses sort and order when sort is set', () => {
    const parsed = parseHotVideoSearchParams({
      sort: 'views',
      order: 'asc',
    });

    expect(parsed).toMatchObject({
      sort: 'views',
      order: 'asc',
    });
  });

  it('omits order when sort is not set', () => {
    const parsed = parseHotVideoSearchParams({ order: 'asc' });
    expect(parsed.sort).toBeUndefined();
    expect(parsed.order).toBeUndefined();
  });

  it('treats all categories as undefined categoryId', () => {
    const parsed = parseHotVideoSearchParams({ categoryId: 'all' });
    expect(parsed.categoryId).toBeUndefined();
  });
});

describe('parseHotVideoViewMode', () => {
  it('defaults to grid and supports list', () => {
    expect(parseHotVideoViewMode({})).toBe('grid');
    expect(parseHotVideoViewMode({ view: 'list' })).toBe('list');
  });
});

describe('parseHotVideoSort', () => {
  it('ignores invalid sort values', () => {
    expect(parseHotVideoSort({ sort: 'invalid' })).toEqual({
      sort: undefined,
      order: 'desc',
    });
  });
});

describe('buildHotVideoSortHref', () => {
  it('toggles order for the active sort field', () => {
    expect(
      buildHotVideoSortHref('views', {
        sort: 'views',
        order: 'desc',
        date: '2026-05-20',
        view: 'grid',
      }),
    ).toBe('/hot-videos?date=2026-05-20&view=grid&sort=views&order=asc');
  });

  it('defaults to desc when switching sort fields', () => {
    expect(
      buildHotVideoSortHref('subscribers', {
        sort: 'views',
        order: 'asc',
        date: '2026-05-20',
        view: 'list',
        categoryId: '20',
      }),
    ).toBe(
      '/hot-videos?date=2026-05-20&categoryId=20&view=list&sort=subscribers&order=desc',
    );
  });
});

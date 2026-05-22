import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const collectMock = vi.hoisted(() => vi.fn());
const requireCronMock = vi.hoisted(() => vi.fn());

vi.mock('@youpd/api/youtube', () => ({
  CollectTrendingMatrixDailyInputSchema: {
    parse: (value: unknown) => value ?? {},
  },
  collectTrendingMatrixDaily: collectMock,
}));

vi.mock('@/server/cron-auth', () => ({
  requireCronSecret: requireCronMock,
}));

describe('/api/cron/youpd/trending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectMock.mockResolvedValue({
      data: {
        date: '2026-05-22',
        totalTargets: 14,
        successCount: 14,
        failedCount: 0,
        totalUnitsConsumed: 14,
        targets: [],
      },
      warnings: [],
    });
  });

  it('GET invokes bulk matrix collector with default input', async () => {
    const response = await GET(
      new Request('http://localhost/api/cron/youpd/trending'),
    );
    expect(requireCronMock).toHaveBeenCalled();
    expect(collectMock).toHaveBeenCalledWith({});
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.data.totalTargets).toBe(14);
  });

  it('POST forwards parsed body to bulk matrix collector', async () => {
    const response = await POST(
      new Request('http://localhost/api/cron/youpd/trending', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ regionCodes: ['KR'], categoryIds: ['22'] }),
      }),
    );
    expect(collectMock).toHaveBeenCalledWith({
      regionCodes: ['KR'],
      categoryIds: ['22'],
    });
    expect(response.status).toBe(200);
  });
});

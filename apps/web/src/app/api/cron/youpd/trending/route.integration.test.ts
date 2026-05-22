import { beforeEach, describe, expect, it, vi } from 'vitest';

const collectMock = vi.hoisted(() => vi.fn());

vi.mock('@youpd/api/youtube', () => ({
  CollectTrendingMatrixDailyInputSchema: {
    parse: (value: unknown) => value ?? {},
  },
  collectTrendingMatrixDaily: collectMock,
}));

describe('/api/cron/youpd/trending (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'integration-cron-test-secret';
    collectMock.mockResolvedValue({
      data: {
        date: '2099-01-01',
        totalTargets: 0,
        successCount: 0,
        failedCount: 0,
        totalUnitsConsumed: 0,
        targets: [],
      },
      warnings: [],
    });
  });

  it('returns 401 when Authorization bearer is missing', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://127.0.0.1/api/cron/youpd/trending'),
    );
    expect(response.status).toBe(401);
    expect(collectMock).not.toHaveBeenCalled();
  });

  it('returns 401 when bearer does not match CRON_SECRET', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://127.0.0.1/api/cron/youpd/trending', {
        headers: { Authorization: 'Bearer wrong-secret' },
      }),
    );
    expect(response.status).toBe(401);
    expect(collectMock).not.toHaveBeenCalled();
  });

  it('invokes collector when bearer matches CRON_SECRET', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://127.0.0.1/api/cron/youpd/trending', {
        headers: { Authorization: 'Bearer integration-cron-test-secret' },
      }),
    );
    expect(response.status).toBe(200);
    expect(collectMock).toHaveBeenCalledWith({});
    const body = await response.json();
    expect(body.data.data.date).toBe('2099-01-01');
  });
});

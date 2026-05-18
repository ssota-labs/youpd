// Unit tests for the YouTube key pool rotation wrapper. The DB-bound
// repository is module-mocked so the test stays offline.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuotaExceededError, RateLimitError } from '@youpd/youtube';

const exhaustedSpy = vi.fn(async (_id: string, _reason: string) => {});

vi.mock('@youpd/supabase/repositories/youtube-keys', () => ({
  listActiveKeysWithUsage: vi.fn(),
  markKeyExhausted: (id: string, reason: string) => exhaustedSpy(id, reason),
  seedKeyFromEnv: vi.fn(async () => ({ kind: 'skipped', reason: 'no_env_key' })),
  type: undefined,
}));

vi.mock('@youpd/supabase/repositories/quota', () => ({
  currentUsageDay: () => '2026-05-17',
}));

import * as ytKeys from '@youpd/supabase/repositories/youtube-keys';
import {
  withYouTubeKey,
  resetYouTubeKeyPoolForTests,
  setRateLimitSleepForTests,
} from './youtube-key-pool';

const listMock = ytKeys.listActiveKeysWithUsage as unknown as ReturnType<
  typeof vi.fn
>;

const originalEnvKey = process.env.YOUTUBE_API_KEY;
const sleepSpy = vi.fn(async (_ms: number) => {});

beforeEach(() => {
  resetYouTubeKeyPoolForTests();
  exhaustedSpy.mockClear();
  listMock.mockReset();
  sleepSpy.mockClear();
  setRateLimitSleepForTests(sleepSpy);
  delete process.env.YOUTUBE_API_KEY;
});

afterEach(() => {
  setRateLimitSleepForTests(null);
  if (originalEnvKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = originalEnvKey;
});

describe('withYouTubeKey', () => {
  it('picks the least-used active key', async () => {
    listMock.mockResolvedValueOnce([
      {
        id: 'k1',
        label: 'k1',
        key: 'KEY1',
        status: 'active',
        unitsConsumedToday: 1000,
        lastUsedAt: null,
      },
      {
        id: 'k2',
        label: 'k2',
        key: 'KEY2',
        status: 'active',
        unitsConsumedToday: 10,
        lastUsedAt: null,
      },
    ]);
    const seen: string[] = [];
    const out = await withYouTubeKey(async ({ apiKey, keyId }) => {
      seen.push(`${keyId}:${apiKey}`);
      return apiKey;
    });
    expect(out).toBe('KEY2');
    expect(seen).toEqual(['k2:KEY2']);
    expect(exhaustedSpy).not.toHaveBeenCalled();
  });

  it('rotates to the next key on QuotaExceededError and marks the first one exhausted', async () => {
    listMock
      .mockResolvedValueOnce([
        {
          id: 'k1',
          label: 'k1',
          key: 'KEY1',
          status: 'active',
          unitsConsumedToday: 0,
          lastUsedAt: null,
        },
        {
          id: 'k2',
          label: 'k2',
          key: 'KEY2',
          status: 'active',
          unitsConsumedToday: 1,
          lastUsedAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'k2',
          label: 'k2',
          key: 'KEY2',
          status: 'active',
          unitsConsumedToday: 1,
          lastUsedAt: null,
        },
      ]);

    let attempt = 0;
    const out = await withYouTubeKey(async ({ apiKey }) => {
      attempt += 1;
      if (attempt === 1) {
        throw new QuotaExceededError('{"error":{"errors":[{"reason":"quotaExceeded"}]}}');
      }
      return apiKey;
    });
    expect(out).toBe('KEY2');
    expect(attempt).toBe(2);
    expect(exhaustedSpy).toHaveBeenCalledWith('k1', 'quotaExceeded');
  });

  it('falls back to YOUTUBE_API_KEY env when the pool is empty', async () => {
    listMock.mockResolvedValueOnce([]);
    process.env.YOUTUBE_API_KEY = 'ENVKEY';
    const out = await withYouTubeKey(async ({ apiKey, keyId }) => `${keyId}:${apiKey}`);
    expect(out).toBe('null:ENVKEY');
  });

  it('rethrows QuotaExceededError when only env fallback is available', async () => {
    listMock.mockResolvedValueOnce([]);
    process.env.YOUTUBE_API_KEY = 'ENVKEY';
    await expect(
      withYouTubeKey(async () => {
        throw new QuotaExceededError(
          '{"error":{"errors":[{"reason":"quotaExceeded"}]}}',
        );
      }),
    ).rejects.toBeInstanceOf(QuotaExceededError);
    expect(exhaustedSpy).not.toHaveBeenCalled();
  });

  it('retries on RateLimitError with backoff and succeeds with the same key', async () => {
    listMock.mockResolvedValueOnce([
      {
        id: 'k1',
        label: 'k1',
        key: 'KEY1',
        status: 'active',
        unitsConsumedToday: 0,
        lastUsedAt: null,
      },
    ]);
    let attempts = 0;
    const seenKeys: string[] = [];
    const out = await withYouTubeKey(async ({ apiKey }) => {
      attempts += 1;
      seenKeys.push(apiKey);
      if (attempts <= 2) {
        throw new RateLimitError(
          'rateLimitExceeded',
          '{"error":{"errors":[{"reason":"rateLimitExceeded"}]}}',
        );
      }
      return apiKey;
    });
    expect(out).toBe('KEY1');
    expect(attempts).toBe(3);
    expect(seenKeys.every((k) => k === 'KEY1')).toBe(true);
    // 1s + 3s backoff before the third (successful) attempt.
    expect(sleepSpy).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenNthCalledWith(1, 1_000);
    expect(sleepSpy).toHaveBeenNthCalledWith(2, 3_000);
    expect(exhaustedSpy).not.toHaveBeenCalled();
  });

  it('gives up after the backoff schedule is exhausted on persistent rate limits', async () => {
    listMock.mockResolvedValueOnce([
      {
        id: 'k1',
        label: 'k1',
        key: 'KEY1',
        status: 'active',
        unitsConsumedToday: 0,
        lastUsedAt: null,
      },
    ]);
    await expect(
      withYouTubeKey(async () => {
        throw new RateLimitError(
          'rateLimitExceeded',
          '{"error":{"errors":[{"reason":"rateLimitExceeded"}]}}',
        );
      }),
    ).rejects.toBeInstanceOf(RateLimitError);
    // 1s + 3s + 7s before bailing.
    expect(sleepSpy).toHaveBeenCalledTimes(3);
    expect(exhaustedSpy).not.toHaveBeenCalled();
  });
});

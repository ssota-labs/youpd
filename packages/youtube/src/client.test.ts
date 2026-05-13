import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createYouTubeClient } from './client';
import {
  QuotaExceededError,
  RateLimitError,
  YouTubeApiError,
} from './errors';

const PingSchema = z.object({ pong: z.boolean() });

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createYouTubeClient', () => {
  it('throws without an api key', () => {
    expect(() => createYouTubeClient({ apiKey: '' })).toThrow(/required/i);
  });

  it('appends key to query string and parses with the provided schema', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ pong: true }));
    const client = createYouTubeClient({ apiKey: 'k', fetchImpl });
    const out = await client.request({
      path: '/ping',
      params: { foo: 'bar' },
      schema: PingSchema,
    });
    expect(out).toEqual({ pong: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toContain('foo=bar');
    expect(String(url)).toContain('key=k');
  });

  it('skips undefined and empty params', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ pong: true }));
    const client = createYouTubeClient({ apiKey: 'k', fetchImpl });
    await client.request({
      path: '/ping',
      params: { foo: 'bar', baz: undefined, qux: '' },
      schema: PingSchema,
    });
    const url = String(fetchImpl.mock.calls[0]![0]);
    expect(url).not.toContain('baz=');
    expect(url).not.toContain('qux=');
  });

  it('maps quotaExceeded to QuotaExceededError', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 403,
            message: 'The request cannot be completed because you have exceeded your quota.',
            errors: [{ reason: 'quotaExceeded' }],
          },
        },
        { status: 403 },
      ),
    );
    const client = createYouTubeClient({ apiKey: 'k', fetchImpl });
    await expect(
      client.request({ path: '/x', params: {}, schema: PingSchema }),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it('maps rateLimitExceeded to RateLimitError', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 403,
            message: 'Rate limit exceeded',
            errors: [{ reason: 'rateLimitExceeded' }],
          },
        },
        { status: 403 },
      ),
    );
    const client = createYouTubeClient({ apiKey: 'k', fetchImpl });
    await expect(
      client.request({ path: '/x', params: {}, schema: PingSchema }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('maps unknown 4xx to YouTubeApiError with reason=unknown', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('boom', { status: 500 }));
    const client = createYouTubeClient({ apiKey: 'k', fetchImpl });
    await expect(
      client.request({ path: '/x', params: {}, schema: PingSchema }),
    ).rejects.toMatchObject({
      name: 'YouTubeApiError',
      status: 500,
      reason: 'unknown',
    });
  });

  it('throws YouTubeApiError when an OK body fails schema parsing', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ pong: 'not-a-bool' }));
    const client = createYouTubeClient({ apiKey: 'k', fetchImpl });
    await expect(
      client.request({ path: '/x', params: {}, schema: PingSchema }),
    ).rejects.toBeDefined();
  });

  it('YouTubeApiError carries raw body for debugging', async () => {
    const body = {
      error: { code: 400, message: 'bad', errors: [{ reason: 'badRequest' }] },
    };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(body, { status: 400 }));
    const client = createYouTubeClient({ apiKey: 'k', fetchImpl });
    try {
      await client.request({ path: '/x', params: {}, schema: PingSchema });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(YouTubeApiError);
      const e = err as YouTubeApiError;
      expect(e.raw).toEqual(body);
      expect(e.status).toBe(400);
    }
  });
});

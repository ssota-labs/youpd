import { afterEach, describe, expect, it, vi } from 'vitest';
import { restGet, restPost } from './youpd-rest';

describe('v0.12 YouPD REST client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('adds bearer auth and unwraps the REST envelope for POST calls', async () => {
    vi.stubEnv('YOUPD_API_BASE_URL', 'https://api.example.test/');
    vi.stubEnv('YOUPD_API_TOKEN', 'secret');
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ data: { ok: true }, meta: { fetchedAt: 'now', source: 'youpd-rest' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(restPost('/api/youpd/rest/youtube/search/videos', { keyword: 'k' }))
      .resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/youpd/rest/youtube/search/videos',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer secret',
          'content-type': 'application/json',
        }),
      }),
    );
  });

  it('serializes GET query parameters', async () => {
    vi.stubEnv('YOUPD_API_BASE_URL', 'https://api.example.test');
    vi.stubEnv('YOUPD_API_TOKEN', 'secret');
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ data: { ok: true }, meta: { fetchedAt: 'now', source: 'youpd-rest' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await restGet('/api/youpd/rest/youtube/videos/v1', {
      persist: false,
      includeComments: true,
      empty: null,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.test/api/youpd/rest/youtube/videos/v1?persist=false&includeComments=true',
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIG_FETCH = globalThis.fetch;

async function loadModule() {
  vi.resetModules();
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_ANON_KEY = 'anon-test';
  return import('./supabase-fetch');
}

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
  vi.restoreAllMocks();
});

describe('supabase-fetch', () => {
  it('getAuthorization returns pending details when authorization is Pending', async () => {
    const { getAuthorization } = await loadModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authorization_id: 'abc',
          redirect_uri: 'http://localhost:9999/cb',
          client: { id: 'c1', name: 'Test Client' },
          user: { id: 'u1', email: 'a@b.test' },
          scope: 'openid',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const res = await getAuthorization('abc', 'user-jwt');
    expect(res.kind).toBe('pending');
    if (res.kind === 'pending') {
      expect(res.details.client.name).toBe('Test Client');
    }

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      'http://127.0.0.1:54321/auth/v1/oauth/authorizations/abc',
    );
    expect(init.method).toBe('GET');
    expect(init.headers.apikey).toBe('anon-test');
    expect(init.headers.authorization).toBe('Bearer user-jwt');
    expect(init.cache).toBe('no-store');
  });

  it('getAuthorization detects auto_approved shape and returns redirectUrl', async () => {
    const { getAuthorization } = await loadModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          redirect_url:
            'https://notion.so/workflows/mcp/oauth/callback?code=abc&state=xyz',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const res = await getAuthorization('abc', 'user-jwt');
    expect(res.kind).toBe('auto_approved');
    if (res.kind === 'auto_approved') {
      expect(res.redirectUrl).toContain('code=abc');
    }
  });

  it('decideAuthorization POSTs the action and returns redirect_url', async () => {
    const { decideAuthorization } = await loadModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ redirect_url: 'http://localhost:9999/cb?code=xyz' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const res = await decideAuthorization('abc', 'user-jwt', 'approve');
    expect(res.redirect_url).toContain('code=xyz');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ action: 'approve' });
    expect(init.headers['content-type']).toBe('application/json');
  });

  it('throws SupabaseAuthError on non-2xx', async () => {
    const { decideAuthorization, SupabaseAuthError } = await loadModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":"forbidden"}', { status: 403 }),
    );

    await expect(
      decideAuthorization('abc', 'user-jwt', 'deny'),
    ).rejects.toBeInstanceOf(SupabaseAuthError);
  });

  it('SupabaseAuthError parses error_code from JSON body', async () => {
    const { getAuthorization, SupabaseAuthError } = await loadModule();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        '{"code":400,"error_code":"validation_failed","msg":"authorization request cannot be processed"}',
        { status: 400 },
      ),
    );

    try {
      await getAuthorization('abc', 'user-jwt');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(SupabaseAuthError);
      if (err instanceof SupabaseAuthError) {
        expect(err.status).toBe(400);
        expect(err.errorCode).toBe('validation_failed');
      }
    }
  });

  it('throws when SUPABASE_URL is not set', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();
    const { supabaseAuthFetch } = await import('./supabase-fetch');
    await expect(
      supabaseAuthFetch({ method: 'GET', path: '/auth/v1/x' }),
    ).rejects.toThrow(/SUPABASE_URL/);
  });
});

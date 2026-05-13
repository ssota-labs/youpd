import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashToken } from './tokens';

// Mocks for every @youpd/supabase repository the token route touches. We test
// the route handler directly so we can drive valid/invalid paths without a DB.
const consumeAuthCode = vi.fn();
const consumeRefreshToken = vi.fn();
const getOauthClient = vi.fn();
const linkReplacedBy = vi.fn();
const mintAccessToken = vi.fn();
const mintRefreshToken = vi.fn();

vi.mock('@youpd/supabase', () => ({
  consumeAuthCode: (...a: unknown[]) => consumeAuthCode(...(a as [string])),
  consumeRefreshToken: (...a: unknown[]) => consumeRefreshToken(...(a as [string])),
  getOauthClient: (...a: unknown[]) => getOauthClient(...(a as [string])),
  linkReplacedBy: (...a: unknown[]) =>
    linkReplacedBy(...(a as [string, string])),
  mintAccessToken: (...a: unknown[]) =>
    mintAccessToken(...(a as [Record<string, unknown>])),
  mintRefreshToken: (...a: unknown[]) =>
    mintRefreshToken(...(a as [Record<string, unknown>])),
}));

const RESOURCE = 'http://localhost:3002/api/mcp';

async function loadRoute() {
  process.env.MCP_OAUTH_RESOURCE = RESOURCE;
  process.env.MCP_OAUTH_ISSUER = 'http://localhost:3002';
  vi.resetModules();
  return import('@/app/oauth/token/route');
}

function tokenRequest(body: Record<string, string>): Request {
  return new Request('http://localhost:3002/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
}

describe('token route — refresh_token rotation', () => {
  beforeEach(() => {
    consumeAuthCode.mockReset();
    consumeRefreshToken.mockReset();
    getOauthClient.mockReset();
    linkReplacedBy.mockReset();
    mintAccessToken.mockReset();
    mintRefreshToken.mockReset();
  });

  it('rotates: mints a new pair, links replaced_by on the old row', async () => {
    getOauthClient.mockResolvedValue({
      clientId: 'client-1',
      clientSecretHash: null,
      redirectUris: ['http://localhost:9999/cb'],
      tokenEndpointAuthMethod: 'none',
      clientName: 'test',
      metadata: {},
      createdAt: new Date(),
    });
    const oldRow = {
      id: 'old-refresh-id',
      tokenHash: hashToken('old-refresh'),
      clientId: 'client-1',
      userId: 'user-1',
      scope: 'mcp',
      resource: RESOURCE,
      expiresAt: new Date(Date.now() + 86400_000),
      revokedAt: null,
      replacedBy: null,
      createdAt: new Date(),
    };
    consumeRefreshToken.mockResolvedValue(oldRow);
    mintAccessToken.mockResolvedValue({ id: 'access-new' });
    mintRefreshToken.mockResolvedValue({ id: 'refresh-new-id' });

    const { POST } = await loadRoute();
    const resp = await POST(
      tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: 'old-refresh',
        client_id: 'client-1',
        resource: RESOURCE,
      }),
    );
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.token_type).toBe('Bearer');
    expect(body.access_token).toBeTruthy();
    expect(body.refresh_token).toBeTruthy();
    expect(body.scope).toBe('mcp');

    // consume saw the right token hash and the new refresh row was linked.
    expect(consumeRefreshToken).toHaveBeenCalledWith(hashToken('old-refresh'));
    expect(linkReplacedBy).toHaveBeenCalledWith(hashToken('old-refresh'), 'refresh-new-id');
    // The new access + refresh tokens were minted with the same client/user/resource.
    expect(mintAccessToken).toHaveBeenCalledTimes(1);
    expect(mintRefreshToken).toHaveBeenCalledTimes(1);
    const mintedAccess = mintAccessToken.mock.calls[0][0] as { clientId: string; userId: string; resource: string };
    expect(mintedAccess.clientId).toBe('client-1');
    expect(mintedAccess.userId).toBe('user-1');
    expect(mintedAccess.resource).toBe(RESOURCE);
  });

  it('rejects a replayed refresh_token with invalid_grant', async () => {
    getOauthClient.mockResolvedValue({
      clientId: 'client-1',
      clientSecretHash: null,
      redirectUris: [],
      tokenEndpointAuthMethod: 'none',
      clientName: null,
      metadata: {},
      createdAt: new Date(),
    });
    // Replay: consume returns null (already-revoked / unknown / expired).
    consumeRefreshToken.mockResolvedValue(null);

    const { POST } = await loadRoute();
    const resp = await POST(
      tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: 'already-used',
        client_id: 'client-1',
        resource: RESOURCE,
      }),
    );
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('invalid_grant');
    expect(linkReplacedBy).not.toHaveBeenCalled();
    expect(mintAccessToken).not.toHaveBeenCalled();
    expect(mintRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects when the refresh was issued for a different resource', async () => {
    getOauthClient.mockResolvedValue({
      clientId: 'client-1',
      clientSecretHash: null,
      redirectUris: [],
      tokenEndpointAuthMethod: 'none',
      clientName: null,
      metadata: {},
      createdAt: new Date(),
    });
    consumeRefreshToken.mockResolvedValue({
      id: 'old',
      tokenHash: hashToken('r'),
      clientId: 'client-1',
      userId: 'user-1',
      scope: 'mcp',
      resource: 'https://other-mcp.example.com/api/mcp',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedBy: null,
      createdAt: new Date(),
    });
    const { POST } = await loadRoute();
    const resp = await POST(
      tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: 'r',
        client_id: 'client-1',
        resource: RESOURCE,
      }),
    );
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('invalid_target');
    expect(mintAccessToken).not.toHaveBeenCalled();
  });

  it('rejects when the bound client_id mismatches the request', async () => {
    getOauthClient.mockResolvedValue({
      clientId: 'client-1',
      clientSecretHash: null,
      redirectUris: [],
      tokenEndpointAuthMethod: 'none',
      clientName: null,
      metadata: {},
      createdAt: new Date(),
    });
    consumeRefreshToken.mockResolvedValue({
      id: 'old',
      tokenHash: hashToken('r'),
      clientId: 'someone-else',
      userId: 'user-1',
      scope: 'mcp',
      resource: RESOURCE,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedBy: null,
      createdAt: new Date(),
    });
    const { POST } = await loadRoute();
    const resp = await POST(
      tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: 'r',
        client_id: 'client-1',
        resource: RESOURCE,
      }),
    );
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('invalid_grant');
  });
});

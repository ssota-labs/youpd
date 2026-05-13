import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashToken } from './tokens';

// Mock the repository module before importing the verifier so the verifier
// picks up our spy. The verifier only calls findActiveAccessToken; we control
// what it returns per test.
const findActiveAccessToken = vi.fn();
vi.mock('@youpd/supabase', () => ({
  findActiveAccessToken: (...args: unknown[]) =>
    findActiveAccessToken(...(args as [string])),
}));

const RESOURCE = 'http://localhost:3002/api/mcp';

async function loadVerifier() {
  process.env.MCP_OAUTH_RESOURCE = RESOURCE;
  vi.resetModules();
  return import('./verify-token');
}

describe('verifyAccessToken', () => {
  beforeEach(() => {
    findActiveAccessToken.mockReset();
  });

  it('returns undefined when no bearer is provided', async () => {
    const { verifyAccessToken } = await loadVerifier();
    expect(await verifyAccessToken(new Request('http://x'), undefined)).toBeUndefined();
    expect(findActiveAccessToken).not.toHaveBeenCalled();
  });

  it('returns undefined when the token is unknown / revoked / expired', async () => {
    findActiveAccessToken.mockResolvedValue(null);
    const { verifyAccessToken } = await loadVerifier();
    const result = await verifyAccessToken(new Request('http://x'), 'bogus');
    expect(result).toBeUndefined();
    expect(findActiveAccessToken).toHaveBeenCalledWith(hashToken('bogus'));
  });

  it('rejects tokens issued for a different MCP resource (RFC 8707)', async () => {
    findActiveAccessToken.mockResolvedValue({
      id: 'tok-1',
      tokenHash: hashToken('valid'),
      clientId: 'client-1',
      userId: 'user-1',
      scope: 'mcp',
      resource: 'https://different-mcp.example.com/api/mcp',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    });
    const { verifyAccessToken } = await loadVerifier();
    const result = await verifyAccessToken(new Request('http://x'), 'valid');
    expect(result).toBeUndefined();
  });

  it('returns AuthInfo with userId in extra when the token is valid', async () => {
    findActiveAccessToken.mockResolvedValue({
      id: 'tok-1',
      tokenHash: hashToken('valid'),
      clientId: 'client-1',
      userId: 'user-1',
      scope: 'mcp other-scope',
      resource: RESOURCE,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    });
    const { verifyAccessToken } = await loadVerifier();
    const result = await verifyAccessToken(new Request('http://x'), 'valid');
    expect(result).toEqual({
      token: 'valid',
      scopes: ['mcp', 'other-scope'],
      clientId: 'client-1',
      extra: { userId: 'user-1', tokenId: 'tok-1' },
    });
  });
});

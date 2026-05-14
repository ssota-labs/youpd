import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateKeyPair, SignJWT, exportJWK, type CryptoKey } from 'jose';
import { __setJwksForTests, verifyAccessToken } from './verify-token';

const ISSUER = 'https://test.supabase.co/auth/v1';
const RESOURCE = 'http://localhost:3002/api/mcp';
const KID = 'test-kid-1';

type SignArgs = {
  privateKey: CryptoKey;
  iss?: string;
  aud?: string | string[];
  sub?: string;
  scope?: string;
  client_id?: string;
  expSecondsFromNow?: number;
};

async function sign(opts: SignArgs): Promise<string> {
  const exp =
    Math.floor(Date.now() / 1000) + (opts.expSecondsFromNow ?? 60);
  return new SignJWT({
    scope: opts.scope ?? 'mcp',
    client_id: opts.client_id ?? 'client-1',
  })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? RESOURCE)
    .setSubject(opts.sub ?? 'user-1')
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(opts.privateKey);
}

let publicKey: CryptoKey;
let privateKey: CryptoKey;

beforeEach(async () => {
  process.env.MCP_OAUTH_ISSUER = ISSUER;
  process.env.MCP_OAUTH_RESOURCE = RESOURCE;
  ({ publicKey, privateKey } = await generateKeyPair('RS256'));
  const jwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256' };
  // Stand-in JWTVerifyGetKey resolver — returns our deterministic key for any
  // header asking for KID, ignoring HTTP entirely.
  __setJwksForTests(async () => publicKey);
  // Touch jwk so the import isn't flagged unused — exportJWK is exercised to
  // mirror the production setup even though jose accepts the CryptoKey directly.
  void jwk;
});

afterEach(() => {
  __setJwksForTests(null);
});

describe('verifyAccessToken', () => {
  it('returns undefined when no bearer is provided', async () => {
    const result = await verifyAccessToken(new Request('http://x'), undefined);
    expect(result).toBeUndefined();
  });

  it('returns undefined when the token is malformed / unsigned', async () => {
    const result = await verifyAccessToken(new Request('http://x'), 'bogus');
    expect(result).toBeUndefined();
  });

  it('rejects tokens with a wrong issuer', async () => {
    const token = await sign({ privateKey, iss: 'https://evil.example/auth/v1' });
    expect(await verifyAccessToken(new Request('http://x'), token)).toBeUndefined();
  });

  it('rejects tokens with a wrong audience (RFC 8707)', async () => {
    const token = await sign({
      privateKey,
      aud: 'https://different-mcp.example.com/api/mcp',
    });
    expect(await verifyAccessToken(new Request('http://x'), token)).toBeUndefined();
  });

  it('rejects tokens missing the mcp scope', async () => {
    const token = await sign({ privateKey, scope: 'openid email' });
    expect(await verifyAccessToken(new Request('http://x'), token)).toBeUndefined();
  });

  it('rejects expired tokens', async () => {
    const token = await sign({ privateKey, expSecondsFromNow: -10 });
    expect(await verifyAccessToken(new Request('http://x'), token)).toBeUndefined();
  });

  it('returns AuthInfo with userId in extra on a valid token', async () => {
    const token = await sign({
      privateKey,
      sub: 'user-42',
      client_id: 'client-7',
      scope: 'mcp openid',
    });
    const result = await verifyAccessToken(new Request('http://x'), token);
    expect(result).toEqual({
      token,
      scopes: ['mcp', 'openid'],
      clientId: 'client-7',
      extra: { userId: 'user-42' },
    });
  });
});

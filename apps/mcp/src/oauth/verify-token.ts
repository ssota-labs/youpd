import 'server-only';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { DEFAULT_SCOPE, getIssuer, getJwksUrl, getResource } from './config';

// `createRemoteJWKSet` returns a resolver that caches keys internally (~5 min).
// Memoise per JWKS URL so the cache survives across requests in a warm runtime.
const jwksCache = new Map<string, JWTVerifyGetKey>();

function getJwks(): JWTVerifyGetKey {
  const url = getJwksUrl().toString();
  const cached = jwksCache.get(url);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(new URL(url));
  jwksCache.set(url, jwks);
  return jwks;
}

// Test-only seam: inject a deterministic key resolver so the suite never
// touches the network. Pass null to clear.
export function __setJwksForTests(jwks: JWTVerifyGetKey | null): void {
  let url: string;
  try {
    url = getJwksUrl().toString();
  } catch {
    url = '__test__';
  }
  if (jwks) jwksCache.set(url, jwks);
  else jwksCache.delete(url);
}

function scopesFrom(payload: JWTPayload): string[] {
  const raw = payload['scope'];
  if (typeof raw === 'string') return raw.split(' ').filter(Boolean);
  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === 'string');
  }
  return [];
}

// Called by mcp-handler's withMcpAuth on every MCP request. Verifies a
// Supabase OAuth Server-issued JWT: signature via JWKS, iss against our
// configured issuer, aud against our resource (RFC 8707), and presence of
// the `mcp` scope. Returns undefined on any failure so withMcpAuth emits
// 401 WWW-Authenticate pointing at /.well-known/oauth-protected-resource.
export async function verifyAccessToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(bearerToken, getJwks(), {
      issuer: getIssuer(),
      audience: getResource(),
    }));
  } catch {
    return undefined;
  }

  const scopes = scopesFrom(payload);
  if (!scopes.includes(DEFAULT_SCOPE)) return undefined;

  const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
  if (!userId) return undefined;

  const clientId =
    typeof payload['client_id'] === 'string'
      ? (payload['client_id'] as string)
      : typeof payload['azp'] === 'string'
        ? (payload['azp'] as string)
        : 'unknown';

  return {
    token: bearerToken,
    scopes,
    clientId,
    extra: { userId },
  };
}

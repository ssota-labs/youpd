import 'server-only';
import { findActiveAccessToken } from '@youpd/supabase';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { getResource } from './config';
import { hashToken } from './tokens';

// Called by mcp-handler's withMcpAuth on every MCP request. Returning undefined
// causes a 401 with WWW-Authenticate: Bearer resource_metadata="..." pointing
// at /.well-known/oauth-protected-resource.
export async function verifyAccessToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const row = await findActiveAccessToken(hashToken(bearerToken));
  if (!row) return undefined;
  // RFC 8707 audience binding: reject tokens issued for any other MCP server.
  if (row.resource !== getResource()) return undefined;
  return {
    token: bearerToken,
    scopes: row.scope.split(' ').filter(Boolean),
    clientId: row.clientId,
    extra: { userId: row.userId, tokenId: row.id },
  };
}

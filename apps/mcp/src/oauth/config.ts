import 'server-only';

// Trim trailing slash so all derived URLs are well-formed via string concat.
function trimSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

// Supabase OAuth Server issuer base, e.g. `https://<ref>.supabase.co/auth/v1`.
// Tokens carry this exact value in the `iss` claim; verify-token rejects
// anything else. Read at runtime (not module load) so build-time sandboxes
// without secrets don't crash during Next.js page-data collection.
export function getIssuer(): string {
  const v = process.env.MCP_OAUTH_ISSUER;
  if (!v) throw new Error('MCP_OAUTH_ISSUER is not set');
  return trimSlash(v);
}

// Canonical MCP resource URI for RFC 8707 audience binding. Tokens are issued
// for this exact string; verify-token rejects anything else. Supabase OAuth
// Server populates this via a Custom Access Token Hook configured per project.
export function getResource(): string {
  const v = process.env.MCP_OAUTH_RESOURCE;
  if (!v) throw new Error('MCP_OAUTH_RESOURCE is not set');
  return v;
}

// JWKS URL Supabase publishes for the project. `jose.createRemoteJWKSet`
// caches keys for ~5 minutes; a key rotation can briefly fail verification.
export function getJwksUrl(): URL {
  return new URL(`${getIssuer()}/.well-known/jwks.json`);
}

export const SUPPORTED_SCOPES = ['mcp'] as const;
export const DEFAULT_SCOPE = 'mcp';

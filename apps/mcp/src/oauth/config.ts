import 'server-only';

// Trim trailing slash so all derived URLs are well-formed via string concat.
function trimSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

export function getIssuer(): string {
  const v = process.env.MCP_OAUTH_ISSUER;
  if (!v) throw new Error('MCP_OAUTH_ISSUER is not set');
  return trimSlash(v);
}

// Canonical MCP resource URI for RFC 8707 audience binding. Tokens are issued
// for this exact string; verify-token rejects anything else.
export function getResource(): string {
  const v = process.env.MCP_OAUTH_RESOURCE;
  if (!v) throw new Error('MCP_OAUTH_RESOURCE is not set');
  return v;
}

export const SUPPORTED_SCOPES = ['mcp'] as const;
export const DEFAULT_SCOPE = 'mcp';

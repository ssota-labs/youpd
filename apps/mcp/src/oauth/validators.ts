import 'server-only';

// RFC 7591 §2.1 + MCP spec: redirect URIs must be https, OR http loopback
// (localhost / 127.0.0.1) for local-development MCP clients. Anything else is
// rejected at registration time so we never have to validate it again.
export function isAllowedRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.protocol === 'https:') return true;
  if (
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
  ) {
    return true;
  }
  return false;
}

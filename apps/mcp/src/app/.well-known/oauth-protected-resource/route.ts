import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler';
import { getIssuer } from '@/oauth/config';

// Build the handler per request so MCP_OAUTH_ISSUER is only read at runtime —
// otherwise Next.js page-data collection crashes when the env var is absent in
// the build sandbox (Vercel preview without secrets, CI smoke jobs, etc.).
export function GET(req: Request): Response | Promise<Response> {
  const handler = protectedResourceHandler({ authServerUrls: [getIssuer()] });
  return handler(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();

import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { registerTools } from '@/server';
import { verifyAccessToken } from '@/oauth/verify-token';

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {},
  {
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV !== 'production',
  },
);

const authedHandler = withMcpAuth(handler, verifyAccessToken, {
  required: true,
  requiredScopes: ['mcp'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };

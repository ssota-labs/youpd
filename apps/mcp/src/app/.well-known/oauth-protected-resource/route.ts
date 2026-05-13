import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler';
import { getIssuer } from '@/oauth/config';

const handler = protectedResourceHandler({ authServerUrls: [getIssuer()] });

export const GET = handler;
export const OPTIONS = metadataCorsOptionsRequestHandler();

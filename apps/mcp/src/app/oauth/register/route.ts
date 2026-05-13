import { z } from 'zod';
import { createOauthClient } from '@youpd/supabase';
import { generateToken, hashToken } from '@/oauth/tokens';
import { oauthErrorResponse } from '@/oauth/errors';
import { isAllowedRedirectUri } from '@/oauth/validators';

export const dynamic = 'force-dynamic';

const RegisterBody = z
  .object({
    redirect_uris: z.array(z.string().url()).min(1),
    token_endpoint_auth_method: z
      .enum(['none', 'client_secret_basic'])
      .optional()
      .default('none'),
    client_name: z.string().min(1).max(200).optional(),
    grant_types: z.array(z.string()).optional(),
    response_types: z.array(z.string()).optional(),
    scope: z.string().optional(),
  })
  .passthrough();

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return oauthErrorResponse('invalid_request', 'request body is not valid JSON');
  }
  const parsed = RegisterBody.safeParse(json);
  if (!parsed.success) {
    return oauthErrorResponse('invalid_request', parsed.error.message);
  }

  for (const uri of parsed.data.redirect_uris) {
    if (!isAllowedRedirectUri(uri)) {
      return oauthErrorResponse(
        'invalid_request',
        `redirect_uri ${uri} must be https:// or http://localhost*`,
      );
    }
  }

  const clientId = generateToken();
  const isConfidential = parsed.data.token_endpoint_auth_method === 'client_secret_basic';
  const clientSecret = isConfidential ? generateToken() : null;
  const clientSecretHash = clientSecret ? hashToken(clientSecret) : null;

  const { redirect_uris, token_endpoint_auth_method, client_name, ...metadata } = parsed.data;

  await createOauthClient({
    clientId,
    clientSecretHash,
    redirectUris: redirect_uris,
    clientName: client_name ?? null,
    tokenEndpointAuthMethod: token_endpoint_auth_method,
    metadata: metadata as Record<string, unknown>,
  });

  const body: Record<string, unknown> = {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris,
    token_endpoint_auth_method,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  };
  if (client_name) body.client_name = client_name;
  if (clientSecret) body.client_secret = clientSecret;

  return Response.json(body, { status: 201, headers: { 'cache-control': 'no-store' } });
}

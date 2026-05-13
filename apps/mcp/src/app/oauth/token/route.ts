import { z } from 'zod';
import {
  consumeAuthCode,
  consumeRefreshToken,
  getOauthClient,
  linkReplacedBy,
  mintAccessToken,
  mintRefreshToken,
} from '@youpd/supabase';
import { getResource } from '@/oauth/config';
import { oauthErrorResponse } from '@/oauth/errors';
import { generateToken, hashToken, secretsEqual, verifyPkceS256 } from '@/oauth/tokens';

export const dynamic = 'force-dynamic';

const AUTH_CODE_GRANT = 'authorization_code' as const;
const REFRESH_GRANT = 'refresh_token' as const;

const Body = z.discriminatedUnion('grant_type', [
  z.object({
    grant_type: z.literal(AUTH_CODE_GRANT),
    code: z.string().min(1),
    redirect_uri: z.string().url(),
    client_id: z.string().min(1),
    code_verifier: z.string().min(43).max(128),
    resource: z.string().url(),
  }),
  z.object({
    grant_type: z.literal(REFRESH_GRANT),
    refresh_token: z.string().min(1),
    client_id: z.string().min(1),
    resource: z.string().url().optional(),
  }),
]);

const ACCESS_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function parseBasicAuth(header: string | null): { id: string; secret: string } | null {
  if (!header?.toLowerCase().startsWith('basic ')) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
  } catch {
    return null;
  }
  const idx = decoded.indexOf(':');
  if (idx < 0) return null;
  return { id: decoded.slice(0, idx), secret: decoded.slice(idx + 1) };
}

async function authenticateClient(
  req: Request,
  clientId: string,
): Promise<{ ok: true } | { ok: false; resp: Response }> {
  const client = await getOauthClient(clientId);
  if (!client) {
    return { ok: false, resp: oauthErrorResponse('invalid_client', 'unknown client', 401) };
  }
  if (client.tokenEndpointAuthMethod === 'none') {
    return { ok: true };
  }
  const basic = parseBasicAuth(req.headers.get('authorization'));
  if (!basic || basic.id !== clientId) {
    return {
      ok: false,
      resp: oauthErrorResponse('invalid_client', 'missing client authentication', 401),
    };
  }
  if (!client.clientSecretHash || !secretsEqual(basic.secret, client.clientSecretHash)) {
    return { ok: false, resp: oauthErrorResponse('invalid_client', 'bad client secret', 401) };
  }
  return { ok: true };
}

function issuePair(opts: {
  clientId: string;
  userId: string;
  scope: string;
  resource: string;
}) {
  return mintTokens(opts);
}

async function mintTokens(opts: {
  clientId: string;
  userId: string;
  scope: string;
  resource: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  expiresIn: number;
}> {
  const now = Date.now();
  const accessToken = generateToken();
  const refreshToken = generateToken();
  await mintAccessToken({
    tokenHash: hashToken(accessToken),
    clientId: opts.clientId,
    userId: opts.userId,
    scope: opts.scope,
    resource: opts.resource,
    expiresAt: new Date(now + ACCESS_TTL_MS),
  });
  const refreshRow = await mintRefreshToken({
    tokenHash: hashToken(refreshToken),
    clientId: opts.clientId,
    userId: opts.userId,
    scope: opts.scope,
    resource: opts.resource,
    expiresAt: new Date(now + REFRESH_TTL_MS),
  });
  return {
    accessToken,
    refreshToken,
    refreshTokenId: refreshRow.id,
    expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
  };
}

export async function POST(req: Request) {
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/x-www-form-urlencoded')) {
    return oauthErrorResponse('invalid_request', 'content-type must be application/x-www-form-urlencoded');
  }
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const parsed = Body.safeParse(params);
  if (!parsed.success) {
    return oauthErrorResponse('invalid_request', parsed.error.message);
  }

  if (parsed.data.grant_type === AUTH_CODE_GRANT) {
    const { code, redirect_uri, client_id, code_verifier, resource } = parsed.data;

    const auth = await authenticateClient(req, client_id);
    if (!auth.ok) return auth.resp;

    const codeRow = await consumeAuthCode(hashToken(code));
    if (!codeRow) {
      return oauthErrorResponse('invalid_grant', 'authorization code invalid, expired, or already used');
    }
    if (codeRow.clientId !== client_id) {
      return oauthErrorResponse('invalid_grant', 'client_id mismatch');
    }
    if (codeRow.redirectUri !== redirect_uri) {
      return oauthErrorResponse('invalid_grant', 'redirect_uri mismatch');
    }
    if (codeRow.resource !== resource || resource !== getResource()) {
      return oauthErrorResponse('invalid_target', 'resource mismatch');
    }
    if (!verifyPkceS256(code_verifier, codeRow.codeChallenge)) {
      return oauthErrorResponse('invalid_grant', 'PKCE verification failed');
    }

    const pair = await issuePair({
      clientId: codeRow.clientId,
      userId: codeRow.userId,
      scope: codeRow.scope,
      resource: codeRow.resource,
    });
    return Response.json(
      {
        access_token: pair.accessToken,
        token_type: 'Bearer',
        expires_in: pair.expiresIn,
        refresh_token: pair.refreshToken,
        scope: codeRow.scope,
      },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  }

  // refresh_token grant
  const { refresh_token, client_id, resource } = parsed.data;
  const auth = await authenticateClient(req, client_id);
  if (!auth.ok) return auth.resp;

  const oldHash = hashToken(refresh_token);
  const consumed = await consumeRefreshToken(oldHash);
  if (!consumed) {
    return oauthErrorResponse('invalid_grant', 'refresh token invalid, expired, or already used');
  }
  if (consumed.clientId !== client_id) {
    return oauthErrorResponse('invalid_grant', 'client_id mismatch');
  }
  if (resource && resource !== consumed.resource) {
    return oauthErrorResponse('invalid_target', 'resource mismatch');
  }
  if (consumed.resource !== getResource()) {
    return oauthErrorResponse('invalid_target', 'resource not valid for this server');
  }

  const pair = await issuePair({
    clientId: consumed.clientId,
    userId: consumed.userId,
    scope: consumed.scope,
    resource: consumed.resource,
  });
  await linkReplacedBy(oldHash, pair.refreshTokenId);

  return Response.json(
    {
      access_token: pair.accessToken,
      token_type: 'Bearer',
      expires_in: pair.expiresIn,
      refresh_token: pair.refreshToken,
      scope: consumed.scope,
    },
    { status: 200, headers: { 'cache-control': 'no-store' } },
  );
}

import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  getDbClient,
  oauthAuthorizationCodes,
  type OauthAuthorizationCodeRow,
} from '@youpd/db';

export type CreateAuthCodeInput = {
  codeHash: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  scope: string;
  resource: string;
  expiresAt: Date;
};

export async function createAuthCode(
  input: CreateAuthCodeInput,
): Promise<OauthAuthorizationCodeRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(oauthAuthorizationCodes)
    .values(input)
    .returning();
  if (!row) throw new Error('failed to insert oauth_authorization_codes row');
  return row;
}

// Atomically marks the code used and returns the row; returns null if the code
// is already consumed, expired, or unknown. The single UPDATE … WHERE used_at
// IS NULL serializes the consume step so a replay races to "row not found".
export async function consumeAuthCode(
  codeHash: string,
): Promise<OauthAuthorizationCodeRow | null> {
  const db = getDbClient();
  const now = new Date();
  const [row] = await db
    .update(oauthAuthorizationCodes)
    .set({ usedAt: now })
    .where(
      and(
        eq(oauthAuthorizationCodes.codeHash, codeHash),
        isNull(oauthAuthorizationCodes.usedAt),
        gt(oauthAuthorizationCodes.expiresAt, now),
      ),
    )
    .returning();
  return row ?? null;
}

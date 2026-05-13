import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  getDbClient,
  oauthAccessTokens,
  type OauthAccessTokenRow,
} from '@youpd/db';

export type MintAccessTokenInput = {
  tokenHash: string;
  clientId: string;
  userId: string;
  scope: string;
  resource: string;
  expiresAt: Date;
};

export async function mintAccessToken(
  input: MintAccessTokenInput,
): Promise<OauthAccessTokenRow> {
  const db = getDbClient();
  const [row] = await db.insert(oauthAccessTokens).values(input).returning();
  if (!row) throw new Error('failed to insert oauth_access_tokens row');
  return row;
}

export async function findActiveAccessToken(
  tokenHash: string,
): Promise<OauthAccessTokenRow | null> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(oauthAccessTokens)
    .where(
      and(
        eq(oauthAccessTokens.tokenHash, tokenHash),
        isNull(oauthAccessTokens.revokedAt),
        gt(oauthAccessTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeAccessToken(tokenHash: string): Promise<void> {
  const db = getDbClient();
  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthAccessTokens.tokenHash, tokenHash),
        isNull(oauthAccessTokens.revokedAt),
      ),
    );
}

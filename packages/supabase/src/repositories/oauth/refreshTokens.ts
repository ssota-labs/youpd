import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  getDbClient,
  oauthRefreshTokens,
  type OauthRefreshTokenRow,
} from '@youpd/db';

export type MintRefreshTokenInput = {
  tokenHash: string;
  clientId: string;
  userId: string;
  scope: string;
  resource: string;
  expiresAt: Date;
};

export async function mintRefreshToken(
  input: MintRefreshTokenInput,
): Promise<OauthRefreshTokenRow> {
  const db = getDbClient();
  const [row] = await db.insert(oauthRefreshTokens).values(input).returning();
  if (!row) throw new Error('failed to insert oauth_refresh_tokens row');
  return row;
}

export async function findActiveRefreshToken(
  tokenHash: string,
): Promise<OauthRefreshTokenRow | null> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(oauthRefreshTokens)
    .where(
      and(
        eq(oauthRefreshTokens.tokenHash, tokenHash),
        isNull(oauthRefreshTokens.revokedAt),
        gt(oauthRefreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// Atomically marks the old refresh row revoked; returns its contents so the
// caller can mint the replacement pair. The UPDATE … WHERE revoked_at IS NULL
// ensures replay attempts lose the race. The replaced_by pointer is set later
// via linkReplacedBy once the new row's id is known.
export async function consumeRefreshToken(
  tokenHash: string,
): Promise<OauthRefreshTokenRow | null> {
  const db = getDbClient();
  const now = new Date();
  const [row] = await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(oauthRefreshTokens.tokenHash, tokenHash),
        isNull(oauthRefreshTokens.revokedAt),
        gt(oauthRefreshTokens.expiresAt, now),
      ),
    )
    .returning();
  return row ?? null;
}

export async function linkReplacedBy(
  oldTokenHash: string,
  newId: string,
): Promise<void> {
  const db = getDbClient();
  await db
    .update(oauthRefreshTokens)
    .set({ replacedBy: newId })
    .where(eq(oauthRefreshTokens.tokenHash, oldTokenHash));
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  const db = getDbClient();
  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthRefreshTokens.tokenHash, tokenHash),
        isNull(oauthRefreshTokens.revokedAt),
      ),
    );
}

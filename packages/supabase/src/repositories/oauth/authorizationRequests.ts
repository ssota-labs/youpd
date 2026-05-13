import { and, eq, gt } from 'drizzle-orm';
import {
  getDbClient,
  oauthAuthorizationRequests,
  type OauthAuthorizationRequestRow,
} from '@youpd/db';

export type CreateAuthRequestInput = {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  resource: string;
  userId: string | null;
  expiresAt: Date;
};

export async function createAuthRequest(
  input: CreateAuthRequestInput,
): Promise<OauthAuthorizationRequestRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(oauthAuthorizationRequests)
    .values(input)
    .returning();
  if (!row) throw new Error('failed to insert oauth_authorization_requests row');
  return row;
}

export async function getAuthRequest(
  id: string,
): Promise<OauthAuthorizationRequestRow | null> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(oauthAuthorizationRequests)
    .where(
      and(
        eq(oauthAuthorizationRequests.id, id),
        gt(oauthAuthorizationRequests.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function approveAuthRequest(
  id: string,
  userId: string,
): Promise<OauthAuthorizationRequestRow | null> {
  const db = getDbClient();
  const [row] = await db
    .update(oauthAuthorizationRequests)
    .set({ userId, approvedAt: new Date() })
    .where(eq(oauthAuthorizationRequests.id, id))
    .returning();
  return row ?? null;
}

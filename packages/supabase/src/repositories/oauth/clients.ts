import { eq } from 'drizzle-orm';
import {
  getDbClient,
  oauthClients,
  type OauthClientRow,
} from '@youpd/db';

export type CreateOauthClientInput = {
  clientId: string;
  clientSecretHash: string | null;
  redirectUris: string[];
  clientName: string | null;
  tokenEndpointAuthMethod: 'none' | 'client_secret_basic';
  metadata: Record<string, unknown>;
};

export async function createOauthClient(
  input: CreateOauthClientInput,
): Promise<OauthClientRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(oauthClients)
    .values({
      clientId: input.clientId,
      clientSecretHash: input.clientSecretHash,
      redirectUris: input.redirectUris,
      clientName: input.clientName,
      tokenEndpointAuthMethod: input.tokenEndpointAuthMethod,
      metadata: input.metadata,
    })
    .returning();
  if (!row) throw new Error('failed to insert oauth_clients row');
  return row;
}

export async function getOauthClient(
  clientId: string,
): Promise<OauthClientRow | null> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);
  return rows[0] ?? null;
}

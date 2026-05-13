import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Registered MCP OAuth clients (RFC 7591 Dynamic Client Registration).
// Public clients have client_secret_hash = null. Confidential clients store a
// sha256 hex digest of the secret; the plaintext is shown to the client exactly
// once at registration.
export const oauthClients = pgTable('oauth_clients', {
  clientId: text('client_id').primaryKey(),
  clientSecretHash: text('client_secret_hash'),
  redirectUris: jsonb('redirect_uris').$type<string[]>().notNull(),
  clientName: text('client_name'),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method')
    .notNull()
    .default('none'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type OauthClientRow = typeof oauthClients.$inferSelect;

// Short-lived scratch row created at /oauth/authorize and consumed by the
// consent flow. user_id is null until the user signs in + approves; once
// approved, /oauth/consent/decision swaps the row for an oauth_authorization_codes
// entry. Auto-expires after 10 minutes.
export const oauthAuthorizationRequests = pgTable(
  'oauth_authorization_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: text('client_id').notNull(),
    redirectUri: text('redirect_uri').notNull(),
    scope: text('scope').notNull().default('mcp'),
    state: text('state').notNull(),
    codeChallenge: text('code_challenge').notNull(),
    codeChallengeMethod: text('code_challenge_method').notNull(),
    resource: text('resource').notNull(),
    userId: uuid('user_id'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

export type OauthAuthorizationRequestRow =
  typeof oauthAuthorizationRequests.$inferSelect;

// Issued authorization codes. code_hash is sha256 hex of the random code; the
// plaintext is only ever in the redirect to the client. Single-use enforced by
// used_at being set atomically when /oauth/token consumes it.
export const oauthAuthorizationCodes = pgTable(
  'oauth_authorization_codes',
  {
    codeHash: text('code_hash').primaryKey(),
    clientId: text('client_id').notNull(),
    userId: uuid('user_id').notNull(),
    redirectUri: text('redirect_uri').notNull(),
    codeChallenge: text('code_challenge').notNull(),
    codeChallengeMethod: text('code_challenge_method').notNull(),
    scope: text('scope').notNull(),
    resource: text('resource').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientUserIdx: index('oauth_authorization_codes_client_user_idx').on(
      table.clientId,
      table.userId,
    ),
  }),
);

export type OauthAuthorizationCodeRow =
  typeof oauthAuthorizationCodes.$inferSelect;

// Issued bearer access tokens. token_hash is sha256 hex. resource is the
// canonical MCP URI (RFC 8707 audience binding) — every request hits this row.
export const oauthAccessTokens = pgTable(
  'oauth_access_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    clientId: text('client_id').notNull(),
    userId: uuid('user_id').notNull(),
    scope: text('scope').notNull(),
    resource: text('resource').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientUserIdx: index('oauth_access_tokens_client_user_idx').on(
      table.clientId,
      table.userId,
    ),
    expiresIdx: index('oauth_access_tokens_expires_idx').on(table.expiresAt),
  }),
);

export type OauthAccessTokenRow = typeof oauthAccessTokens.$inferSelect;

// Refresh tokens, rotated on every use per OAuth 2.1 §6.1. replaced_by points
// at the new row in the rotation chain; revoked_at is set on the old row in
// the same transaction.
export const oauthRefreshTokens = pgTable(
  'oauth_refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    clientId: text('client_id').notNull(),
    userId: uuid('user_id').notNull(),
    scope: text('scope').notNull(),
    resource: text('resource').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBy: uuid('replaced_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientUserIdx: index('oauth_refresh_tokens_client_user_idx').on(
      table.clientId,
      table.userId,
    ),
    expiresIdx: index('oauth_refresh_tokens_expires_idx').on(table.expiresAt),
  }),
);

export type OauthRefreshTokenRow = typeof oauthRefreshTokens.$inferSelect;

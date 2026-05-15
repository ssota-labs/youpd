import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Org/account boundary for YouPD. Thumbnails and template usage are scoped to
// an org so the iframe / MCP can enforce ownership before serving designer
// state. owner_email mirrors the auth user's primary email at creation time.
export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerEmail: text('owner_email').notNull(),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type OrgRow = typeof orgs.$inferSelect;

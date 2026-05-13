import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const healthChecks = pgTable('health_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type HealthCheckRow = typeof healthChecks.$inferSelect;

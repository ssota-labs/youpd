import {
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Pool of YouTube Data API keys. The MCP/REST server picks an active key
// per request, falls back to the next key on QuotaExceededError, and marks
// keys exhausted for the rest of the PT-quota day. Backfilled at boot from
// the legacy YOUTUBE_API_KEY env so existing deployments keep working.
export const youtubeApiKeys = pgTable(
  'youtube_api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    label: text('label').notNull().unique(),
    key: text('key').notNull(),
    status: text('status').notNull().default('active'),
    disabledReason: text('disabled_reason'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusCheck: check(
      'youtube_api_keys_status_check',
      sql`${table.status} in ('active','disabled','exhausted')`,
    ),
    statusIdx: index('youtube_api_keys_status_idx').on(table.status),
  }),
);

export type YoutubeApiKeyRow = typeof youtubeApiKeys.$inferSelect;

// Per-key, per-PT-day units rollup. Mirrors dailyQuotaUsage but split by key
// so the rotation picker can prefer the key with the most remaining headroom.
export const youtubeApiKeyDailyUsage = pgTable(
  'youtube_api_key_daily_usage',
  {
    keyId: uuid('key_id')
      .notNull()
      .references(() => youtubeApiKeys.id, { onDelete: 'cascade' }),
    usageDay: date('usage_day').notNull(),
    unitsConsumed: integer('units_consumed').notNull().default(0),
    status: text('status').notNull().default('ok'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.keyId, table.usageDay] }),
    statusCheck: check(
      'youtube_api_key_daily_usage_status_check',
      sql`${table.status} in ('ok','quota_exceeded')`,
    ),
  }),
);

export type YoutubeApiKeyDailyUsageRow =
  typeof youtubeApiKeyDailyUsage.$inferSelect;

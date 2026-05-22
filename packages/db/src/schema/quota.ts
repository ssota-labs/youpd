import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Per-day rollup of YouTube Data API units consumed by the MCP server. A single
// row per UTC date; concurrent tools increment via the searchSessions write
// path. usage_day is the PT-normalised calendar date YouTube resets quota at.
export const dailyQuotaUsage = pgTable('daily_quota_usage', {
  usageDay: date('usage_day').primaryKey(),
  unitsConsumed: integer('units_consumed').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type DailyQuotaUsageRow = typeof dailyQuotaUsage.$inferSelect;

// One row per outbound YouTube Data API call (or attempted call). operation is
// a stable audit label; status records success, error, or local budget refusal.
export const searchSessions = pgTable(
  'search_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    operation: text('operation').notNull(),
    keyword: text('keyword'),
    videoIds: text('video_ids').array(),
    channelId: text('channel_id'),
    resultCount: integer('result_count').notNull().default(0),
    unitsConsumed: integer('units_consumed').notNull().default(0),
    status: text('status').notNull(),
    errorReason: text('error_reason'),
  },
  (table) => ({
    occurredAtIdx: index('search_sessions_occurred_at_idx').on(table.occurredAt),
    operationIdx: index('search_sessions_operation_idx').on(table.operation),
    statusCheck: check(
      'search_sessions_status_check',
      sql`${table.status} in ('success','error','quota_exceeded')`,
    ),
  }),
);

export type SearchSessionRow = typeof searchSessions.$inferSelect;


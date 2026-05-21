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

// One row per outbound YouTube Data API call (or attempted call) made by an
// MCP tool. operation matches the Search Sessions DB enum so the agent can
// surface units consumed in S4. status records whether the call returned
// data, errored, or was refused by the local budget gate.
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

// Server-side registry for YouTube Data API keys. Keys are never exposed to
// browser clients; RLS denies anon/authenticated access and server code uses
// privileged database credentials.
export const youtubeApiKeys = pgTable(
  'youtube_api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),
    keyHash: text('key_hash').notNull().unique(),
    keyValue: text('key_value').notNull(),
    status: text('status').notNull().default('active'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    quotaExhaustedAt: timestamp('quota_exhausted_at', { withTimezone: true }),
    failureCount: integer('failure_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusLastUsedIdx: index('youtube_api_keys_status_last_used_idx').on(
      table.status,
      table.lastUsedAt,
    ),
    statusCheck: check(
      'youtube_api_keys_status_check',
      sql`${table.status} in ('active','quota_exhausted','disabled')`,
    ),
  }),
);

export type YouTubeApiKeyRow = typeof youtubeApiKeys.$inferSelect;

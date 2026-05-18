import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { searchSessions } from './quota';
import { channels, videos } from './youtube';

/**
 * One keyword search cycle. Tool A creates the row, then Tool B advances it
 * to `publishing` and finally to `published` once every junction row is
 * synced into Notion and the Keywords-DB relations are merged.
 */
export const searchHarvests = pgTable(
  'search_harvests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Notion `Keyword Ideas` row that triggered this harvest. */
    keywordIdeaPageId: text('keyword_idea_page_id').notNull(),
    keyword: text('keyword').notNull(),
    searchSessionId: uuid('search_session_id').references(() => searchSessions.id),
    status: text('status').notNull(),
    totalVideos: integer('total_videos').notNull().default(0),
    totalChannels: integer('total_channels').notNull().default(0),
    /** Notion `Keywords` row id, set during finalize. */
    notionKeywordPageId: text('notion_keyword_page_id'),
    /** True once relation-merges + Keyword Ideas finalize completed. */
    finalized: boolean('finalized').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => ({
    keywordIdeaIdx: index('search_harvests_keyword_idea_idx').on(
      table.keywordIdeaPageId,
      table.createdAt,
    ),
    statusIdx: index('search_harvests_status_idx').on(table.status),
    statusCheck: check(
      'search_harvests_status_check',
      sql`${table.status} in ('fetched','publishing','published','failed')`,
    ),
  }),
);

export type SearchHarvestRow = typeof searchHarvests.$inferSelect;

/** Junction: which canonical videos belong to a harvest, at what rank. */
export const searchHarvestVideos = pgTable(
  'search_harvest_videos',
  {
    harvestId: uuid('harvest_id')
      .notNull()
      .references(() => searchHarvests.id, { onDelete: 'cascade' }),
    videoId: text('video_id')
      .notNull()
      .references(() => videos.videoId, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    notionRelationSynced: boolean('notion_relation_synced')
      .notNull()
      .default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.harvestId, table.videoId] }),
    pendingIdx: index('search_harvest_videos_pending_idx').on(table.harvestId),
  }),
);

export type SearchHarvestVideoRow = typeof searchHarvestVideos.$inferSelect;

/** Junction: which canonical channels belong to a harvest. */
export const searchHarvestChannels = pgTable(
  'search_harvest_channels',
  {
    harvestId: uuid('harvest_id')
      .notNull()
      .references(() => searchHarvests.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.channelId, { onDelete: 'restrict' }),
    notionRelationSynced: boolean('notion_relation_synced')
      .notNull()
      .default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.harvestId, table.channelId] }),
    pendingIdx: index('search_harvest_channels_pending_idx').on(table.harvestId),
  }),
);

export type SearchHarvestChannelRow = typeof searchHarvestChannels.$inferSelect;

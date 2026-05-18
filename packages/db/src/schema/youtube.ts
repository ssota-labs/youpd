import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Canonical YouTube channel. One row per `channel_id`; new harvests update
// the existing row in place. `notion_page_id` is cached on first successful
// publish so subsequent runs can skip the Notion lookup query.
export const channels = pgTable(
  'channels',
  {
    channelId: text('channel_id').primaryKey(),
    title: text('title'),
    subscriberCount: bigint('subscriber_count', { mode: 'number' }),
    viewCount: bigint('view_count', { mode: 'number' }),
    videoCount: integer('video_count'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    url: text('url'),
    notionPageId: text('notion_page_id'),
    notionSyncedAt: timestamp('notion_synced_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    notionSyncedIdx: index('channels_notion_synced_idx').on(table.notionSyncedAt),
  }),
);

export type ChannelRow = typeof channels.$inferSelect;

// Canonical YouTube video. PK is `video_id`; the same id seen in a second
// harvest only updates stats. References `channels` so we can join when we
// reconstruct a search-result view from canonical tables.
export const videos = pgTable(
  'videos',
  {
    videoId: text('video_id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.channelId, { onDelete: 'restrict' }),
    title: text('title'),
    views: bigint('views', { mode: 'number' }),
    likes: bigint('likes', { mode: 'number' }),
    comments: bigint('comments', { mode: 'number' }),
    durationSec: integer('duration_sec'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    url: text('url'),
    notionPageId: text('notion_page_id'),
    notionSyncedAt: timestamp('notion_synced_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    channelIdx: index('videos_channel_id_idx').on(table.channelId),
    notionSyncedIdx: index('videos_notion_synced_idx').on(table.notionSyncedAt),
  }),
);

export type VideoRow = typeof videos.$inferSelect;

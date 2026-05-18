import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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

export const videoComments = pgTable(
  'video_comments',
  {
    commentId: text('comment_id').primaryKey(),
    videoId: text('video_id')
      .notNull()
      .references(() => videos.videoId, { onDelete: 'cascade' }),
    authorDisplayName: text('author_display_name').notNull().default(''),
    authorChannelId: text('author_channel_id'),
    body: text('body').notNull(),
    likeCount: integer('like_count').notNull().default(0),
    totalReplyCount: integer('total_reply_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    videoIdx: index('video_comments_video_id_idx').on(table.videoId),
    likeCountIdx: index('video_comments_like_count_idx').on(table.likeCount),
  }),
);

export type VideoCommentRow = typeof videoComments.$inferSelect;

export const hotVideos = pgTable(
  'hot_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    hotDate: date('hot_date').notNull(),
    videoId: text('video_id')
      .notNull()
      .references(() => videos.videoId, { onDelete: 'cascade' }),
    source: text('source').notNull().default('chart=mostPopular'),
    regionCode: text('region_code'),
    categoryId: text('category_id'),
    chartRank: integer('chart_rank'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueDailyVideo: uniqueIndex('hot_videos_hot_date_video_id_source_unique').on(
      table.hotDate,
      table.videoId,
      table.source,
    ),
    hotDateIdx: index('hot_videos_hot_date_idx').on(table.hotDate),
    videoIdx: index('hot_videos_video_id_idx').on(table.videoId),
  }),
);

export type HotVideoRow = typeof hotVideos.$inferSelect;

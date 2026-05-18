import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { searchSessions } from './quota';

export const youtubeChannels = pgTable('youtube_channels', {
  channelId: text('channel_id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  thumbnails: jsonb('thumbnails').notNull().default({}),
  subscriberCount: bigint('subscriber_count', { mode: 'number' }),
  viewCount: bigint('view_count', { mode: 'number' }),
  videoCount: bigint('video_count', { mode: 'number' }),
  averageViewCount: bigint('average_view_count', { mode: 'number' }),
  hiddenSubscriberCount: boolean('hidden_subscriber_count').notNull().default(false),
  uploadsPlaylistId: text('uploads_playlist_id'),
  country: text('country'),
  url: text('url').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});

export const youtubeVideos = pgTable(
  'youtube_videos',
  {
    videoId: text('video_id').primaryKey(),
    channelId: text('channel_id')
      .notNull()
      .references(() => youtubeChannels.channelId, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    thumbnails: jsonb('thumbnails').notNull().default({}),
    durationSec: integer('duration_sec'),
    viewCount: bigint('view_count', { mode: 'number' }),
    likeCount: bigint('like_count', { mode: 'number' }),
    commentCount: bigint('comment_count', { mode: 'number' }),
    tags: text('tags').array().notNull().default(sql`ARRAY[]::text[]`),
    categoryId: text('category_id'),
    defaultAudioLanguage: text('default_audio_language'),
    url: text('url').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    channelIdx: index('youtube_videos_channel_id_idx').on(table.channelId),
    viewCountIdx: index('youtube_videos_view_count_idx').on(table.viewCount),
    publishedAtIdx: index('youtube_videos_published_at_idx').on(table.publishedAt),
  }),
);

export const youtubeComments = pgTable(
  'youtube_comments',
  {
    commentId: text('comment_id').primaryKey(),
    videoId: text('video_id')
      .notNull()
      .references(() => youtubeVideos.videoId, { onDelete: 'cascade' }),
    authorDisplayName: text('author_display_name').notNull().default(''),
    authorChannelId: text('author_channel_id'),
    body: text('body').notNull(),
    likeCount: integer('like_count').notNull().default(0),
    totalReplyCount: integer('total_reply_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    videoIdx: index('youtube_comments_video_id_idx').on(table.videoId),
    likeCountIdx: index('youtube_comments_like_count_idx').on(table.likeCount),
  }),
);

export const hotVideos = pgTable(
  'hot_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    hotDate: date('hot_date').notNull(),
    videoId: text('video_id')
      .notNull()
      .references(() => youtubeVideos.videoId, { onDelete: 'cascade' }),
    source: text('source').notNull().default('chart=mostPopular'),
    regionCode: text('region_code'),
    categoryId: text('category_id'),
    chartRank: integer('chart_rank'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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

export const searchHarvests = pgTable(
  'search_harvests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    keyword: text('keyword').notNull(),
    status: text('status').notNull().default('fetched'),
    quotaSessionId: uuid('quota_session_id').references(() => searchSessions.id, {
      onDelete: 'set null',
    }),
    totalVideos: integer('total_videos').notNull().default(0),
    totalChannels: integer('total_channels').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    keywordCreatedIdx: index('search_harvests_keyword_created_at_idx').on(
      table.keyword,
      table.createdAt,
    ),
    statusCheck: check(
      'search_harvests_status_check',
      sql`${table.status} in ('fetched','failed')`,
    ),
  }),
);

export const searchHarvestVideos = pgTable(
  'search_harvest_videos',
  {
    harvestId: uuid('harvest_id')
      .notNull()
      .references(() => searchHarvests.id, { onDelete: 'cascade' }),
    videoId: text('video_id')
      .notNull()
      .references(() => youtubeVideos.videoId, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.harvestId, table.videoId] }),
    harvestPositionIdx: index('search_harvest_videos_harvest_position_idx').on(
      table.harvestId,
      table.position,
    ),
  }),
);

export const searchHarvestChannels = pgTable(
  'search_harvest_channels',
  {
    harvestId: uuid('harvest_id')
      .notNull()
      .references(() => searchHarvests.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => youtubeChannels.channelId, { onDelete: 'restrict' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.harvestId, table.channelId] }),
  }),
);

export type YoutubeChannelRow = typeof youtubeChannels.$inferSelect;
export type YoutubeVideoRow = typeof youtubeVideos.$inferSelect;
export type YoutubeCommentRow = typeof youtubeComments.$inferSelect;
export type HotVideoRow = typeof hotVideos.$inferSelect;
export type SearchHarvestRow = typeof searchHarvests.$inferSelect;

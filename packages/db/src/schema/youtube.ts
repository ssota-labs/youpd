import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const youtubeChannels = pgTable(
  'youtube_channels',
  {
    channelId: text('channel_id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    subscriberCount: bigint('subscriber_count', { mode: 'number' }),
    videoCount: bigint('video_count', { mode: 'number' }),
    viewCount: bigint('view_count', { mode: 'number' }),
    hiddenSubscriberCount: boolean('hidden_subscriber_count')
      .notNull()
      .default(false),
    averageViewCount: bigint('average_view_count', { mode: 'number' }),
    averageViewCountBasis: jsonb('average_view_count_basis'),
    uploadsPlaylistId: text('uploads_playlist_id'),
    country: text('country'),
    url: text('url'),
    raw: jsonb('raw'),
    collectedAt: timestamp('collected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    collectedAtIdx: index('youtube_channels_collected_at_idx').on(
      table.collectedAt,
    ),
  }),
);

export const youtubeVideos = pgTable(
  'youtube_videos',
  {
    videoId: text('video_id').primaryKey(),
    channelId: text('channel_id').references(() => youtubeChannels.channelId, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    videoUrl: text('video_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    durationSec: integer('duration_sec'),
    isShort: boolean('is_short'),
    viewCount: bigint('view_count', { mode: 'number' }),
    likeCount: bigint('like_count', { mode: 'number' }),
    commentCount: bigint('comment_count', { mode: 'number' }),
    categoryId: text('category_id'),
    tags: jsonb('tags'),
    defaultAudioLanguage: text('default_audio_language'),
    raw: jsonb('raw'),
    collectedAt: timestamp('collected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    channelPublishedIdx: index('youtube_videos_channel_published_idx').on(
      table.channelId,
      table.publishedAt,
    ),
    publishedAtIdx: index('youtube_videos_published_at_idx').on(table.publishedAt),
  }),
);

export const youtubeHarvestSessions = pgTable(
  'youtube_harvest_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').notNull(),
    query: jsonb('query').notNull(),
    status: text('status').notNull().default('running'),
    resultCount: integer('result_count').notNull().default(0),
    error: jsonb('error'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    typeStartedIdx: index('youtube_harvest_sessions_type_started_idx').on(
      table.type,
      table.startedAt,
    ),
    statusCheck: check(
      'youtube_harvest_sessions_status_check',
      sql`${table.status} in ('pending','running','success','partial_success','failed')`,
    ),
  }),
);

export const youtubeKeywords = pgTable(
  'youtube_keywords',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    keyword: text('keyword').notNull(),
    normalizedKeyword: text('normalized_keyword').notNull(),
    regionCode: text('region_code').notNull().default('KR'),
    searchOrder: text('search_order').notNull().default('relevance'),
    lastHarvestId: uuid('last_harvest_id').references(
      () => youtubeHarvestSessions.id,
      { onDelete: 'set null' },
    ),
    lastCollectedAt: timestamp('last_collected_at', { withTimezone: true }),
    cacheExpiresAt: timestamp('cache_expires_at', { withTimezone: true }),
    resultCount: integer('result_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    normalizedRegionOrderUnique: uniqueIndex(
      'youtube_keywords_norm_region_order_uidx',
    ).on(table.normalizedKeyword, table.regionCode, table.searchOrder),
    cacheExpiresIdx: index('youtube_keywords_cache_expires_idx').on(
      table.cacheExpiresAt,
    ),
    lastCollectedIdx: index('youtube_keywords_last_collected_idx').on(
      table.lastCollectedAt,
    ),
  }),
);

export const youtubeKeywordVideoResults = pgTable(
  'youtube_keyword_video_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    harvestId: uuid('harvest_id').references(() => youtubeHarvestSessions.id, {
      onDelete: 'set null',
    }),
    keyword: text('keyword').notNull(),
    videoId: text('video_id')
      .references(() => youtubeVideos.videoId, { onDelete: 'cascade' })
      .notNull(),
    rank: integer('rank').notNull(),
    searchOrder: text('search_order').notNull().default('relevance'),
    regionCode: text('region_code').notNull().default('KR'),
    publishedAfter: timestamp('published_after', { withTimezone: true }),
    publishedBefore: timestamp('published_before', { withTimezone: true }),
    collectedAt: timestamp('collected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    harvestKeywordVideoUnique: uniqueIndex(
      'youtube_keyword_results_harvest_keyword_video_uidx',
    ).on(table.harvestId, table.keyword, table.videoId),
    keywordCollectedIdx: index('youtube_keyword_results_keyword_collected_idx').on(
      table.keyword,
      table.collectedAt,
    ),
  }),
);

export const youtubeHotVideos = pgTable(
  'youtube_hot_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    hotDate: date('hot_date').notNull(),
    regionCode: text('region_code').notNull().default('KR'),
    categoryId: text('category_id'),
    videoId: text('video_id')
      .references(() => youtubeVideos.videoId, { onDelete: 'cascade' })
      .notNull(),
    rank: integer('rank').notNull(),
    source: text('source').notNull().default('youtube_trending'),
    collectedAt: timestamp('collected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    dateRegionRankIdx: index('youtube_hot_videos_date_region_rank_idx').on(
      table.hotDate,
      table.regionCode,
      table.categoryId,
      table.rank,
    ),
  }),
);

export const youtubeVideoMetricSnapshots = pgTable(
  'youtube_video_metric_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    snapshotDate: date('snapshot_date').notNull(),
    videoId: text('video_id')
      .references(() => youtubeVideos.videoId, { onDelete: 'cascade' })
      .notNull(),
    viewCount: bigint('view_count', { mode: 'number' }),
    likeCount: bigint('like_count', { mode: 'number' }),
    commentCount: bigint('comment_count', { mode: 'number' }),
    source: text('source').notNull().default('video_detail'),
    collectedAt: timestamp('collected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    snapshotVideoUnique: uniqueIndex('youtube_video_snapshots_date_video_uidx').on(
      table.snapshotDate,
      table.videoId,
    ),
    videoDateIdx: index('youtube_video_snapshots_video_date_idx').on(
      table.videoId,
      table.snapshotDate,
    ),
  }),
);

export const youtubeChannelMetricSnapshots = pgTable(
  'youtube_channel_metric_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    snapshotDate: date('snapshot_date').notNull(),
    channelId: text('channel_id')
      .references(() => youtubeChannels.channelId, { onDelete: 'cascade' })
      .notNull(),
    subscriberCount: bigint('subscriber_count', { mode: 'number' }),
    viewCount: bigint('view_count', { mode: 'number' }),
    videoCount: bigint('video_count', { mode: 'number' }),
    source: text('source').notNull().default('channel_detail'),
    collectedAt: timestamp('collected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    snapshotChannelUnique: uniqueIndex(
      'youtube_channel_snapshots_date_channel_uidx',
    ).on(table.snapshotDate, table.channelId),
    channelDateIdx: index('youtube_channel_snapshots_channel_date_idx').on(
      table.channelId,
      table.snapshotDate,
    ),
  }),
);

export type YouTubeChannelRow = typeof youtubeChannels.$inferSelect;
export type YouTubeVideoRow = typeof youtubeVideos.$inferSelect;
export type YouTubeHarvestSessionRow = typeof youtubeHarvestSessions.$inferSelect;
export type YouTubeKeywordRow = typeof youtubeKeywords.$inferSelect;
export type YouTubeKeywordVideoResultRow =
  typeof youtubeKeywordVideoResults.$inferSelect;
export type YouTubeHotVideoRow = typeof youtubeHotVideos.$inferSelect;
export type YouTubeVideoMetricSnapshotRow =
  typeof youtubeVideoMetricSnapshots.$inferSelect;
export type YouTubeChannelMetricSnapshotRow =
  typeof youtubeChannelMetricSnapshots.$inferSelect;

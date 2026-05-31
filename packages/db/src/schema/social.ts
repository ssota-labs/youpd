import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { referenceFolders } from './reference-folders';

export const socialSources = pgTable(
  'social_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    provider: text('provider').notNull(),
    connectionStatus: text('connection_status').notNull(),
    configJson: jsonb('config_json'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userProviderUnique: uniqueIndex('social_sources_user_provider_uidx').on(
      table.userId,
      table.provider,
    ),
    userIdx: index('social_sources_user_idx').on(table.userId),
  }),
);

export const socialPosts = pgTable(
  'social_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    provider: text('provider').notNull(),
    externalId: text('external_id'),
    permalink: text('permalink').notNull(),
    permalinkHash: text('permalink_hash').notNull(),
    authorHandle: text('author_handle').notNull(),
    authorDisplayName: text('author_display_name'),
    textContent: text('text_content').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ingestMode: text('ingest_mode').notNull(),
    fetchStatus: text('fetch_status').notNull(),
    rawPayloadJson: jsonb('raw_payload_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userPermalinkUnique: uniqueIndex('social_posts_user_permalink_uidx').on(
      table.userId,
      table.permalinkHash,
    ),
    userUpdatedIdx: index('social_posts_user_updated_idx').on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const socialPostMetricSnapshots = pgTable(
  'social_post_metric_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => socialPosts.id, { onDelete: 'cascade' }),
    capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
    metricsJson: jsonb('metrics_json').notNull(),
    source: text('source').notNull(),
  },
  (table) => ({
    postCapturedIdx: index('social_post_metric_snapshots_post_idx').on(
      table.postId,
      table.capturedAt,
    ),
  }),
);

export const socialPostScores = pgTable(
  'social_post_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => socialPosts.id, { onDelete: 'cascade' }),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => socialPostMetricSnapshots.id, { onDelete: 'cascade' }),
    policyVersion: text('policy_version').notNull(),
    performanceGrade: text('performance_grade').notNull(),
    engagementGrade: text('engagement_grade').notNull(),
    recencyGrade: text('recency_grade').notNull(),
    rankScore: numeric('rank_score'),
    scoreBreakdownJson: jsonb('score_breakdown_json').notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    postComputedIdx: index('social_post_scores_post_idx').on(
      table.postId,
      table.computedAt,
    ),
  }),
);

export const referenceFolderSocialPosts = pgTable(
  'reference_folder_social_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => referenceFolders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    socialPostId: uuid('social_post_id')
      .notNull()
      .references(() => socialPosts.id, { onDelete: 'cascade' }),
    lineage: jsonb('lineage').notNull(),
    saveReason: text('save_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    folderPostUnique: uniqueIndex('reference_folder_social_posts_folder_post_uidx').on(
      table.folderId,
      table.socialPostId,
    ),
  }),
);

export type SocialSourceRow = typeof socialSources.$inferSelect;
export type SocialPostRow = typeof socialPosts.$inferSelect;
export type SocialPostMetricSnapshotRow = typeof socialPostMetricSnapshots.$inferSelect;
export type SocialPostScoreRow = typeof socialPostScores.$inferSelect;
export type ReferenceFolderSocialPostRow = typeof referenceFolderSocialPosts.$inferSelect;

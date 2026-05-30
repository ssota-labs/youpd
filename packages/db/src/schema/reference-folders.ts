import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { userKeywordProbes } from './home-probes';

export const referenceFolderGroups = pgTable(
  'reference_folder_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id'),
    title: text('title').notNull(),
    audience: text('audience').notNull(),
    seedTheme: text('seed_theme').notNull(),
    intentSummary: text('intent_summary').notNull(),
    originUserProbeId: uuid('origin_user_probe_id').references(
      () => userKeywordProbes.id,
      { onDelete: 'set null' },
    ),
    profileSnapshot: jsonb('profile_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userUpdatedIdx: index('reference_folder_groups_user_updated_idx').on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const referenceFolders = pgTable(
  'reference_folders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => referenceFolderGroups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    consumerStage: text('consumer_stage'),
    sortOrder: integer('sort_order').notNull().default(0),
    isStageTemplate: boolean('is_stage_template').notNull().default(false),
    isUnspecified: boolean('is_unspecified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    groupNameUnique: uniqueIndex('reference_folders_group_name_uidx').on(
      table.groupId,
      table.name,
    ),
  }),
);

export const referenceFolderVideos = pgTable(
  'reference_folder_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => referenceFolders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    videoId: text('video_id').notNull(),
    lineage: jsonb('lineage').notNull(),
    saveReason: text('save_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    folderVideoUnique: uniqueIndex('reference_folder_videos_folder_video_uidx').on(
      table.folderId,
      table.videoId,
    ),
  }),
);

export type ReferenceFolderGroupRow = typeof referenceFolderGroups.$inferSelect;
export type ReferenceFolderRow = typeof referenceFolders.$inferSelect;
export type ReferenceFolderVideoRow = typeof referenceFolderVideos.$inferSelect;

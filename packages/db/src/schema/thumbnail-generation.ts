import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { creativeTemplates } from './creative-templates';

export const thumbnailGenerationDrafts = pgTable(
  'thumbnail_generation_drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    templateVersion: text('template_version').notNull(),
    slotValuesJson: jsonb('slot_values_json').notNull(),
    selectedReferenceVideoIds: jsonb('selected_reference_video_ids'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userTemplateUnique: uniqueIndex('thumbnail_generation_drafts_user_template_uidx').on(
      table.userId,
      table.templateId,
    ),
    userUpdatedIdx: index('thumbnail_generation_drafts_user_updated_idx').on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const thumbnailGenerationJobs = pgTable(
  'thumbnail_generation_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    draftId: uuid('draft_id').references(() => thumbnailGenerationDrafts.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull(),
    providerKey: text('provider_key').notNull(),
    promptText: text('prompt_text').notNull(),
    promptVersion: text('prompt_version').notNull(),
    slotValuesJson: jsonb('slot_values_json').notNull(),
    referenceContextJson: jsonb('reference_context_json'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('thumbnail_generation_jobs_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const generatedAssets = pgTable(
  'generated_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => thumbnailGenerationJobs.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    storageBucket: text('storage_bucket').notNull(),
    storagePath: text('storage_path').notNull(),
    mimeType: text('mime_type').notNull().default('image/png'),
    width: integer('width'),
    height: integer('height'),
    lineageJson: jsonb('lineage_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    jobIdx: index('generated_assets_job_idx').on(table.jobId),
  }),
);

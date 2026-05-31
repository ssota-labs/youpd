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
import { youtubeVideos } from './youtube';
import { referenceFolderVideos } from './reference-folders';
import { creativeTemplates } from './creative-templates';

export const videoTranscripts = pgTable(
  'video_transcripts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    videoId: text('video_id')
      .notNull()
      .references(() => youtubeVideos.videoId, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id'),
    provider: text('provider').notNull(),
    availability: text('availability').notNull(),
    legalNoticeCode: text('legal_notice_code'),
    language: text('language').notNull().default('ko'),
    segmentsJson: jsonb('segments_json'),
    fullText: text('full_text'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
    errorMessage: text('error_message'),
    userTriggered: text('user_triggered').notNull().default('true'),
  },
  (table) => ({
    videoUnique: uniqueIndex('video_transcripts_video_uidx').on(table.videoId),
  }),
);

export const videoIntroSegments = pgTable(
  'video_intro_segments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    videoId: text('video_id')
      .notNull()
      .references(() => youtubeVideos.videoId, { onDelete: 'cascade' }),
    transcriptId: uuid('transcript_id').references(() => videoTranscripts.id, {
      onDelete: 'set null',
    }),
    sourceFolderVideoId: uuid('source_folder_video_id').references(
      () => referenceFolderVideos.id,
      { onDelete: 'set null' },
    ),
    windowStartMs: integer('window_start_ms').notNull().default(0),
    windowEndMs: integer('window_end_ms').notNull().default(30000),
    excerptText: text('excerpt_text').notNull(),
    structureSlotsJson: jsonb('structure_slots_json').notNull(),
    manualStructureNotesJson: jsonb('manual_structure_notes_json'),
    sourceMode: text('source_mode').notNull(),
    structureExtractor: text('structure_extractor').notNull(),
    lineageSnapshot: jsonb('lineage_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    videoWindowIdx: index('video_intro_segments_video_idx').on(table.videoId),
  }),
);

export const creativeTemplateIntroExamples = pgTable(
  'creative_template_intro_examples',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    filledIntro: text('filled_intro').notNull(),
    slotValuesJson: jsonb('slot_values_json').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
);

export const creativeTemplateIntroEvidence = pgTable(
  'creative_template_intro_evidence',
  {
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    introSegmentId: uuid('intro_segment_id')
      .notNull()
      .references(() => videoIntroSegments.id, { onDelete: 'cascade' }),
    evidenceNote: text('evidence_note'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    templateSegmentUnique: uniqueIndex('creative_template_intro_evidence_uidx').on(
      table.templateId,
      table.introSegmentId,
    ),
  }),
);

export const introGenerationJobs = pgTable(
  'intro_generation_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    introTemplateId: uuid('intro_template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    userBrief: text('user_brief').notNull(),
    status: text('status').notNull(),
    resultDraftText: text('result_draft_text'),
    lineageJson: jsonb('lineage_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('intro_generation_jobs_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
  }),
);

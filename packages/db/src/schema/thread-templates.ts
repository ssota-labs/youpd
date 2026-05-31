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
import { socialPosts } from './social';

export const socialPostStructureEvidence = pgTable(
  'social_post_structure_evidence',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    socialPostId: uuid('social_post_id')
      .notNull()
      .references(() => socialPosts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    structureType: text('structure_type').notNull(),
    hookStyle: text('hook_style'),
    structureSlotsJson: jsonb('structure_slots_json').notNull(),
    sequencePatternJson: jsonb('sequence_pattern_json'),
    manualStructureNotesJson: jsonb('manual_structure_notes_json'),
    sourceMode: text('source_mode').notNull(),
    structureExtractor: text('structure_extractor').notNull(),
    lineageSnapshot: jsonb('lineage_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    socialPostUnique: uniqueIndex('social_post_structure_evidence_post_uidx').on(
      table.socialPostId,
    ),
    userIdx: index('social_post_structure_evidence_user_idx').on(table.userId),
  }),
);

export const creativeTemplateThreadExamples = pgTable(
  'creative_template_thread_examples',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    filledThreadText: text('filled_thread_text').notNull(),
    slotValuesJson: jsonb('slot_values_json').notNull(),
    partCount: integer('part_count'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
);

export const creativeTemplateThreadEvidence = pgTable(
  'creative_template_thread_evidence',
  {
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    structureEvidenceId: uuid('structure_evidence_id')
      .notNull()
      .references(() => socialPostStructureEvidence.id, { onDelete: 'cascade' }),
    evidenceNote: text('evidence_note'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    templateEvidenceUnique: uniqueIndex('creative_template_thread_evidence_uidx').on(
      table.templateId,
      table.structureEvidenceId,
    ),
  }),
);

export const threadGenerationJobs = pgTable(
  'thread_generation_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    threadTemplateId: uuid('thread_template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    topic: text('topic').notNull(),
    audience: text('audience'),
    contextNotes: text('context_notes'),
    locale: text('locale').notNull().default('ko'),
    status: text('status').notNull(),
    resultDraftText: text('result_draft_text'),
    resultPartsJson: jsonb('result_parts_json'),
    lineageJson: jsonb('lineage_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('thread_generation_jobs_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
  }),
);

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

export const creativeTemplateCategories = pgTable(
  'creative_template_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex('creative_template_categories_code_uidx').on(table.code),
  }),
);

export const creativeTemplateTags = pgTable(
  'creative_template_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    kind: text('kind').notNull().default('technique'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex('creative_template_tags_code_uidx').on(table.code),
  }),
);

export const creativeTemplates = pgTable(
  'creative_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind').notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    summary: text('summary').notNull(),
    useWhen: text('use_when').notNull(),
    skeletonJson: jsonb('skeleton_json').notNull(),
    slotSchemaJson: jsonb('slot_schema_json').notNull(),
    promptScaffold: text('prompt_scaffold').notNull(),
    defaultStyleJson: jsonb('default_style_json').notNull(),
    previewImageUrl: text('preview_image_url'),
    status: text('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex('creative_templates_code_uidx').on(table.code),
    kindStatusUpdatedIdx: index('creative_templates_kind_status_updated_idx').on(
      table.kind,
      table.status,
      table.updatedAt,
    ),
  }),
);

export const creativeTemplateCategoryLinks = pgTable(
  'creative_template_category_links',
  {
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => creativeTemplateCategories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    templateCategoryUnique: uniqueIndex(
      'creative_template_category_links_uidx',
    ).on(table.templateId, table.categoryId),
  }),
);

export const creativeTemplateTagLinks = pgTable(
  'creative_template_tag_links',
  {
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => creativeTemplateTags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    templateTagUnique: uniqueIndex('creative_template_tag_links_uidx').on(
      table.templateId,
      table.tagId,
    ),
  }),
);

export const creativeTemplateReferenceVideos = pgTable(
  'creative_template_reference_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => creativeTemplates.id, { onDelete: 'cascade' }),
    videoId: text('video_id')
      .notNull()
      .references(() => youtubeVideos.videoId, { onDelete: 'cascade' }),
    sourceFolderVideoId: uuid('source_folder_video_id').references(
      () => referenceFolderVideos.id,
      { onDelete: 'set null' },
    ),
    evidenceNote: text('evidence_note'),
    observedAxesJson: jsonb('observed_axes_json').notNull(),
    lineageSnapshot: jsonb('lineage_snapshot'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    templateVideoUnique: uniqueIndex(
      'creative_template_reference_videos_uidx',
    ).on(table.templateId, table.videoId),
  }),
);

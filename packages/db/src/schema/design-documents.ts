import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orgs } from './orgs';

// Generic design composition row. Each row is a single composition (canvas +
// layers); the `kind` discriminator lets multiple agent products
// (thumbnail, detail-page, …) share storage without their data shapes
// drifting apart. `canvas` is jsonb so non-thumbnail profiles can declare
// any width/height pair.
export const designDocuments = pgTable(
  'design_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .references(() => orgs.id, { onDelete: 'cascade' })
      .notNull(),
    kind: text('kind').notNull().default('thumbnail'),
    notionCandidateUrl: text('notion_candidate_url'),
    channelId: text('channel_id'),
    name: text('name'),
    // YouPD-specific aspect enum kept for the thumbnail profile's
    // back-compat (Notion AI prompt vocabulary). Other profiles can leave it
    // null and rely on canvas alone — see the SQL migration which makes the
    // column nullable for future profiles.
    aspect: text('aspect'),
    // Stored as { width, height } jsonb. Mirrors the Composition schema.
    canvas: jsonb('canvas').notNull(),
    background: jsonb('background'),
    layers: jsonb('layers').notNull(),
    exportPngUrl: text('export_png_url'),
    exportShortPngUrl: text('export_short_png_url'),
    version: integer('version').notNull().default(1),
    historyCursor: integer('history_cursor').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: text('updated_by'),
  },
  (table) => ({
    orgCandidateIdx: index('idx_design_documents_org_candidate').on(
      table.orgId,
      table.notionCandidateUrl,
    ),
    updatedAtIdx: index('idx_design_documents_updated_at').on(table.updatedAt),
    kindIdx: index('idx_design_documents_kind').on(table.kind),
    kindCheck: check(
      'design_documents_kind_check',
      sql`${table.kind} in ('thumbnail','detail-page')`,
    ),
  }),
);
export type DesignDocumentRow = typeof designDocuments.$inferSelect;

// Append-only snapshot log used by undo/redo. version mirrors the host row's
// version at the time the snapshot was pushed.
export const designDocumentVersions = pgTable(
  'design_document_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .references(() => designDocuments.id, { onDelete: 'cascade' })
      .notNull(),
    version: integer('version').notNull(),
    layers: jsonb('layers').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: text('created_by'),
  },
  (table) => ({
    documentVersionIdx: index('idx_design_document_versions_doc_version').on(
      table.documentId,
      table.version,
    ),
  }),
);
export type DesignDocumentVersionRow =
  typeof designDocumentVersions.$inferSelect;

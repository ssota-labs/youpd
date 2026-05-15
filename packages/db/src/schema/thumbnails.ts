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

// One row per thumbnail design. `layers` holds the full Konva-compatible
// document; the iframe re-renders from this JSON and the server renders the
// same shape via satori for PNG export. `version` is a monotonic counter used
// for optimistic locking against concurrent agent + iframe edits.
export const thumbnails = pgTable(
  'thumbnails',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .references(() => orgs.id, { onDelete: 'cascade' })
      .notNull(),
    notionCandidateUrl: text('notion_candidate_url'),
    channelId: text('channel_id'),
    name: text('name'),
    aspect: text('aspect').notNull().default('16:9'),
    background: jsonb('background'),
    layers: jsonb('layers').notNull(),
    exportPngUrl: text('export_png_url'),
    exportShortPngUrl: text('export_short_png_url'),
    version: integer('version').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: text('updated_by'),
  },
  (table) => ({
    orgCandidateIdx: index('idx_thumbnails_org_candidate').on(
      table.orgId,
      table.notionCandidateUrl,
    ),
    updatedAtIdx: index('idx_thumbnails_updated_at').on(table.updatedAt),
    aspectCheck: check(
      'thumbnails_aspect_check',
      sql`${table.aspect} in ('16:9','9:16')`,
    ),
  }),
);
export type ThumbnailRow = typeof thumbnails.$inferSelect;

// Optional history table — v0.4 MVP just increments thumbnails.version. Kept
// here so the writer can snapshot pre-patch state when we wire it up later.
export const thumbnailVersions = pgTable(
  'thumbnail_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    thumbnailId: uuid('thumbnail_id')
      .references(() => thumbnails.id, { onDelete: 'cascade' })
      .notNull(),
    version: integer('version').notNull(),
    layers: jsonb('layers').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: text('created_by'),
  },
  (table) => ({
    thumbnailVersionIdx: index('idx_thumbnail_versions_thumbnail_version').on(
      table.thumbnailId,
      table.version,
    ),
  }),
);
export type ThumbnailVersionRow = typeof thumbnailVersions.$inferSelect;

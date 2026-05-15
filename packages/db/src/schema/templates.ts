import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Built-in thumbnail templates (8 patterns × 2 aspects). `document` holds a
// layers array with {placeholder} markers in text fields that
// apply-template.ts substitutes against caller-supplied fillers.
export const templates = pgTable(
  'templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    aspect: text('aspect').notNull(),
    document: jsonb('document').notNull(),
    previewUrl: text('preview_url'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isPublic: boolean('is_public').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeIdx: index('idx_templates_code').on(table.code),
  }),
);

export type TemplateRow = typeof templates.$inferSelect;

import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import {
  creativeTemplateCategories,
  creativeTemplateCategoryLinks,
  creativeTemplateReferenceVideos,
  creativeTemplates,
  creativeTemplateTagLinks,
  creativeTemplateTags,
  youtubeChannels,
  youtubeVideos,
} from '@youpd/db/schema';
import { getDbClient } from '@youpd/db';

const PUBLISHED = 'published';
const THUMBNAIL_KIND = 'thumbnail';

export async function listCreativeTemplateCategories() {
  const db = getDbClient();
  const rows = await db
    .select({
      category: creativeTemplateCategories,
      templateCount: count(creativeTemplates.id),
    })
    .from(creativeTemplateCategories)
    .leftJoin(
      creativeTemplateCategoryLinks,
      eq(creativeTemplateCategoryLinks.categoryId, creativeTemplateCategories.id),
    )
    .leftJoin(
      creativeTemplates,
      and(
        eq(creativeTemplates.id, creativeTemplateCategoryLinks.templateId),
        eq(creativeTemplates.kind, THUMBNAIL_KIND),
        eq(creativeTemplates.status, PUBLISHED),
      ),
    )
    .groupBy(creativeTemplateCategories.id)
    .orderBy(asc(creativeTemplateCategories.sortOrder));

  return rows.map((row) => ({
    ...row.category,
    templateCount: Number(row.templateCount),
  }));
}

export async function listCreativeTemplateTags() {
  const db = getDbClient();
  const rows = await db
    .select({
      tag: creativeTemplateTags,
      templateCount: count(creativeTemplates.id),
    })
    .from(creativeTemplateTags)
    .leftJoin(
      creativeTemplateTagLinks,
      eq(creativeTemplateTagLinks.tagId, creativeTemplateTags.id),
    )
    .leftJoin(
      creativeTemplates,
      and(
        eq(creativeTemplates.id, creativeTemplateTagLinks.templateId),
        eq(creativeTemplates.kind, THUMBNAIL_KIND),
        eq(creativeTemplates.status, PUBLISHED),
      ),
    )
    .groupBy(creativeTemplateTags.id)
    .orderBy(asc(creativeTemplateTags.name));

  return rows.map((row) => ({
    ...row.tag,
    templateCount: Number(row.templateCount),
  }));
}

export async function listPublishedThumbnailTemplates(input: {
  categoryCode?: string;
  tagCode?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}) {
  const db = getDbClient();
  const limit = input.limit ?? 24;

  const conditions = [
    eq(creativeTemplates.kind, THUMBNAIL_KIND),
    eq(creativeTemplates.status, PUBLISHED),
  ];

  if (input.q?.trim()) {
    const pattern = `%${input.q.trim()}%`;
    conditions.push(
      or(
        ilike(creativeTemplates.name, pattern),
        ilike(creativeTemplates.summary, pattern),
      )!,
    );
  }

  if (input.categoryCode) {
    const [category] = await db
      .select({ id: creativeTemplateCategories.id })
      .from(creativeTemplateCategories)
      .where(eq(creativeTemplateCategories.code, input.categoryCode))
      .limit(1);
    if (!category) {
      return { templates: [], nextCursor: null as string | null };
    }
    const linked = await db
      .select({ templateId: creativeTemplateCategoryLinks.templateId })
      .from(creativeTemplateCategoryLinks)
      .where(eq(creativeTemplateCategoryLinks.categoryId, category.id));
    const ids = linked.map((row) => row.templateId);
    if (ids.length === 0) {
      return { templates: [], nextCursor: null };
    }
    conditions.push(inArray(creativeTemplates.id, ids));
  }

  if (input.tagCode) {
    const [tag] = await db
      .select({ id: creativeTemplateTags.id })
      .from(creativeTemplateTags)
      .where(eq(creativeTemplateTags.code, input.tagCode))
      .limit(1);
    if (!tag) {
      return { templates: [], nextCursor: null };
    }
    const linked = await db
      .select({ templateId: creativeTemplateTagLinks.templateId })
      .from(creativeTemplateTagLinks)
      .where(eq(creativeTemplateTagLinks.tagId, tag.id));
    const ids = linked.map((row) => row.templateId);
    if (ids.length === 0) {
      return { templates: [], nextCursor: null };
    }
    conditions.push(inArray(creativeTemplates.id, ids));
  }

  if (input.cursor) {
    const [cursorRow] = await db
      .select({ updatedAt: creativeTemplates.updatedAt })
      .from(creativeTemplates)
      .where(eq(creativeTemplates.id, input.cursor))
      .limit(1);
    if (cursorRow) {
      conditions.push(
        sql`(${creativeTemplates.updatedAt}, ${creativeTemplates.id}) < (${cursorRow.updatedAt}, ${input.cursor}::uuid)`,
      );
    }
  }

  const templates = await db
    .select()
    .from(creativeTemplates)
    .where(and(...conditions))
    .orderBy(desc(creativeTemplates.updatedAt), desc(creativeTemplates.id))
    .limit(limit + 1);

  const page = templates.slice(0, limit);
  const nextCursor =
    templates.length > limit ? (page[page.length - 1]?.id ?? null) : null;

  return { templates: page, nextCursor };
}

export async function getPublishedThumbnailTemplateById(templateId: string) {
  const db = getDbClient();
  const [template] = await db
    .select()
    .from(creativeTemplates)
    .where(
      and(
        eq(creativeTemplates.id, templateId),
        eq(creativeTemplates.kind, THUMBNAIL_KIND),
        eq(creativeTemplates.status, PUBLISHED),
      ),
    )
    .limit(1);
  return template ?? null;
}

export async function getTemplateCategoryLinks(templateIds: string[]) {
  if (templateIds.length === 0) return [];
  const db = getDbClient();
  return db
    .select({
      templateId: creativeTemplateCategoryLinks.templateId,
      category: creativeTemplateCategories,
    })
    .from(creativeTemplateCategoryLinks)
    .innerJoin(
      creativeTemplateCategories,
      eq(creativeTemplateCategories.id, creativeTemplateCategoryLinks.categoryId),
    )
    .where(inArray(creativeTemplateCategoryLinks.templateId, templateIds))
    .orderBy(asc(creativeTemplateCategories.sortOrder));
}

export async function getTemplateTagLinks(templateIds: string[]) {
  if (templateIds.length === 0) return [];
  const db = getDbClient();
  return db
    .select({
      templateId: creativeTemplateTagLinks.templateId,
      tag: creativeTemplateTags,
    })
    .from(creativeTemplateTagLinks)
    .innerJoin(
      creativeTemplateTags,
      eq(creativeTemplateTags.id, creativeTemplateTagLinks.tagId),
    )
    .where(inArray(creativeTemplateTagLinks.templateId, templateIds))
    .orderBy(asc(creativeTemplateTags.name));
}

export async function getTemplateReferenceVideos(templateId: string) {
  const db = getDbClient();
  return db
    .select({
      link: creativeTemplateReferenceVideos,
      video: youtubeVideos,
      channelTitle: youtubeChannels.title,
    })
    .from(creativeTemplateReferenceVideos)
    .innerJoin(
      youtubeVideos,
      eq(youtubeVideos.videoId, creativeTemplateReferenceVideos.videoId),
    )
    .leftJoin(youtubeChannels, eq(youtubeChannels.channelId, youtubeVideos.channelId))
    .where(eq(creativeTemplateReferenceVideos.templateId, templateId))
    .orderBy(
      asc(creativeTemplateReferenceVideos.sortOrder),
      desc(creativeTemplateReferenceVideos.createdAt),
    );
}

export async function countTemplateReferences(templateIds: string[]) {
  if (templateIds.length === 0) return new Map<string, number>();
  const db = getDbClient();
  const rows = await db
    .select({
      templateId: creativeTemplateReferenceVideos.templateId,
      referenceCount: count(),
    })
    .from(creativeTemplateReferenceVideos)
    .where(inArray(creativeTemplateReferenceVideos.templateId, templateIds))
    .groupBy(creativeTemplateReferenceVideos.templateId);

  return new Map(
    rows.map((row) => [row.templateId, Number(row.referenceCount)]),
  );
}

export async function getTemplateReferenceLineages(templateIds: string[]) {
  if (templateIds.length === 0) return [];
  const db = getDbClient();
  return db
    .select({
      templateId: creativeTemplateReferenceVideos.templateId,
      lineageSnapshot: creativeTemplateReferenceVideos.lineageSnapshot,
    })
    .from(creativeTemplateReferenceVideos)
    .where(inArray(creativeTemplateReferenceVideos.templateId, templateIds));
}

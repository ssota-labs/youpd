import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import {
  creativeTemplateCategories,
  creativeTemplateCategoryLinks,
  creativeTemplateTags,
  creativeTemplateTagLinks,
  creativeTemplateThreadEvidence,
  creativeTemplateThreadExamples,
  creativeTemplates,
  socialPostStructureEvidence,
  socialPosts,
  threadGenerationJobs,
} from '@youpd/db/schema';
import { getDbClient } from '@youpd/db';

const PUBLISHED = 'published';
const THREAD_KIND = 'thread';

export async function listThreadTemplateCategories() {
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
        eq(creativeTemplates.kind, THREAD_KIND),
        eq(creativeTemplates.status, PUBLISHED),
      ),
    )
    .groupBy(creativeTemplateCategories.id)
    .having(sql`count(${creativeTemplates.id}) > 0`)
    .orderBy(asc(creativeTemplateCategories.sortOrder));

  return rows.map((row) => ({
    ...row.category,
    templateCount: Number(row.templateCount),
  }));
}

export async function listThreadTemplateTags() {
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
        eq(creativeTemplates.kind, THREAD_KIND),
        eq(creativeTemplates.status, PUBLISHED),
      ),
    )
    .groupBy(creativeTemplateTags.id)
    .having(sql`count(${creativeTemplates.id}) > 0`)
    .orderBy(asc(creativeTemplateTags.name));

  return rows.map((row) => ({
    ...row.tag,
    templateCount: Number(row.templateCount),
  }));
}

export async function listPublishedThreadTemplates(input: {
  categoryCode?: string;
  tagCode?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}) {
  const db = getDbClient();
  const limit = input.limit ?? 24;

  const conditions = [
    eq(creativeTemplates.kind, THREAD_KIND),
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

export async function getPublishedThreadTemplateById(templateId: string) {
  const db = getDbClient();
  const [template] = await db
    .select()
    .from(creativeTemplates)
    .where(
      and(
        eq(creativeTemplates.id, templateId),
        eq(creativeTemplates.kind, THREAD_KIND),
        eq(creativeTemplates.status, PUBLISHED),
      ),
    )
    .limit(1);
  return template ?? null;
}

export async function getThreadTemplateCategoryLinks(templateIds: string[]) {
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

export async function getThreadTemplateTagLinks(templateIds: string[]) {
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

export async function countThreadTemplateEvidence(templateIds: string[]) {
  if (templateIds.length === 0) return new Map<string, number>();
  const db = getDbClient();
  const rows = await db
    .select({
      templateId: creativeTemplateThreadEvidence.templateId,
      referenceCount: count(),
    })
    .from(creativeTemplateThreadEvidence)
    .where(inArray(creativeTemplateThreadEvidence.templateId, templateIds))
    .groupBy(creativeTemplateThreadEvidence.templateId);

  return new Map(
    rows.map((row) => [row.templateId, Number(row.referenceCount)]),
  );
}

export async function getThreadTemplateExamples(templateId: string) {
  const db = getDbClient();
  return db
    .select()
    .from(creativeTemplateThreadExamples)
    .where(eq(creativeTemplateThreadExamples.templateId, templateId))
    .orderBy(asc(creativeTemplateThreadExamples.sortOrder));
}

export async function getThreadTemplateEvidence(templateId: string) {
  const db = getDbClient();
  return db
    .select({
      link: creativeTemplateThreadEvidence,
      structureEvidence: socialPostStructureEvidence,
      post: socialPosts,
    })
    .from(creativeTemplateThreadEvidence)
    .innerJoin(
      socialPostStructureEvidence,
      eq(
        socialPostStructureEvidence.id,
        creativeTemplateThreadEvidence.structureEvidenceId,
      ),
    )
    .innerJoin(
      socialPosts,
      eq(socialPosts.id, socialPostStructureEvidence.socialPostId),
    )
    .where(eq(creativeTemplateThreadEvidence.templateId, templateId))
    .orderBy(
      asc(creativeTemplateThreadEvidence.sortOrder),
      desc(socialPostStructureEvidence.createdAt),
    );
}

export async function getThreadEvidenceForTemplate(templateId: string) {
  const db = getDbClient();
  return db
    .select({
      structureEvidenceId: socialPostStructureEvidence.id,
      socialPostId: socialPostStructureEvidence.socialPostId,
      sourceMode: socialPostStructureEvidence.sourceMode,
      structureExtractor: socialPostStructureEvidence.structureExtractor,
    })
    .from(creativeTemplateThreadEvidence)
    .innerJoin(
      socialPostStructureEvidence,
      eq(
        socialPostStructureEvidence.id,
        creativeTemplateThreadEvidence.structureEvidenceId,
      ),
    )
    .where(eq(creativeTemplateThreadEvidence.templateId, templateId));
}

export async function insertThreadGenerationJob(input: {
  id?: string;
  userId: string;
  threadTemplateId: string;
  topic: string;
  audience?: string | null;
  contextNotes?: string | null;
  locale?: string;
  status: string;
  resultDraftText?: string | null;
  resultPartsJson?: unknown | null;
  lineageJson?: unknown | null;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(threadGenerationJobs)
    .values({
      id: input.id,
      userId: input.userId,
      threadTemplateId: input.threadTemplateId,
      topic: input.topic,
      audience: input.audience ?? null,
      contextNotes: input.contextNotes ?? null,
      locale: input.locale ?? 'ko',
      status: input.status,
      resultDraftText: input.resultDraftText ?? null,
      resultPartsJson: input.resultPartsJson ?? null,
      lineageJson: input.lineageJson ?? null,
    })
    .returning();
  if (!row) throw new Error('failed to insert thread_generation_jobs');
  return row;
}

export async function getSocialPostById(socialPostId: string) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.id, socialPostId))
    .limit(1);
  return row ?? null;
}

export async function getStructureEvidenceBySocialPostId(socialPostId: string) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(socialPostStructureEvidence)
    .where(eq(socialPostStructureEvidence.socialPostId, socialPostId))
    .limit(1);
  return row ?? null;
}

export async function upsertStructureEvidence(input: {
  socialPostId: string;
  userId: string;
  structureType: string;
  hookStyle?: string | null;
  structureSlotsJson: unknown;
  sequencePatternJson?: unknown | null;
  manualStructureNotesJson?: unknown | null;
  sourceMode: string;
  structureExtractor: string;
  lineageSnapshot?: unknown | null;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(socialPostStructureEvidence)
    .values({
      socialPostId: input.socialPostId,
      userId: input.userId,
      structureType: input.structureType,
      hookStyle: input.hookStyle ?? null,
      structureSlotsJson: input.structureSlotsJson,
      sequencePatternJson: input.sequencePatternJson ?? null,
      manualStructureNotesJson: input.manualStructureNotesJson ?? null,
      sourceMode: input.sourceMode,
      structureExtractor: input.structureExtractor,
      lineageSnapshot: input.lineageSnapshot ?? null,
    })
    .onConflictDoUpdate({
      target: socialPostStructureEvidence.socialPostId,
      set: {
        userId: input.userId,
        structureType: input.structureType,
        hookStyle: input.hookStyle ?? null,
        structureSlotsJson: input.structureSlotsJson,
        sequencePatternJson: input.sequencePatternJson ?? null,
        manualStructureNotesJson: input.manualStructureNotesJson ?? null,
        sourceMode: input.sourceMode,
        structureExtractor: input.structureExtractor,
        lineageSnapshot: input.lineageSnapshot ?? null,
      },
    })
    .returning();
  if (!row) throw new Error('failed to upsert social_post_structure_evidence');
  return row;
}

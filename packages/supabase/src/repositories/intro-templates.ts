import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import {
  creativeTemplateCategories,
  creativeTemplateCategoryLinks,
  creativeTemplateIntroEvidence,
  creativeTemplateIntroExamples,
  creativeTemplateTagLinks,
  creativeTemplateTags,
  creativeTemplates,
  introGenerationJobs,
  referenceFolderVideos,
  videoIntroSegments,
  videoTranscripts,
  youtubeChannels,
  youtubeVideos,
} from '@youpd/db/schema';
import { getDbClient } from '@youpd/db';

const PUBLISHED = 'published';
const INTRO_KIND = 'intro';

export async function listIntroTemplateCategories() {
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
        eq(creativeTemplates.kind, INTRO_KIND),
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

export async function listIntroTemplateTags() {
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
        eq(creativeTemplates.kind, INTRO_KIND),
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

export async function listPublishedIntroTemplates(input: {
  categoryCode?: string;
  tagCode?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}) {
  const db = getDbClient();
  const limit = input.limit ?? 24;

  const conditions = [
    eq(creativeTemplates.kind, INTRO_KIND),
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

export async function getPublishedIntroTemplateById(templateId: string) {
  const db = getDbClient();
  const [template] = await db
    .select()
    .from(creativeTemplates)
    .where(
      and(
        eq(creativeTemplates.id, templateId),
        eq(creativeTemplates.kind, INTRO_KIND),
        eq(creativeTemplates.status, PUBLISHED),
      ),
    )
    .limit(1);
  return template ?? null;
}

export async function getIntroTemplateCategoryLinks(templateIds: string[]) {
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

export async function getIntroTemplateTagLinks(templateIds: string[]) {
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

export async function countIntroTemplateEvidence(templateIds: string[]) {
  if (templateIds.length === 0) return new Map<string, number>();
  const db = getDbClient();
  const rows = await db
    .select({
      templateId: creativeTemplateIntroEvidence.templateId,
      referenceCount: count(),
    })
    .from(creativeTemplateIntroEvidence)
    .where(inArray(creativeTemplateIntroEvidence.templateId, templateIds))
    .groupBy(creativeTemplateIntroEvidence.templateId);

  return new Map(
    rows.map((row) => [row.templateId, Number(row.referenceCount)]),
  );
}

export async function getIntroTemplateEvidenceLineages(templateIds: string[]) {
  if (templateIds.length === 0) return [];
  const db = getDbClient();
  return db
    .select({
      templateId: creativeTemplateIntroEvidence.templateId,
      lineageSnapshot: videoIntroSegments.lineageSnapshot,
    })
    .from(creativeTemplateIntroEvidence)
    .innerJoin(
      videoIntroSegments,
      eq(videoIntroSegments.id, creativeTemplateIntroEvidence.introSegmentId),
    )
    .where(inArray(creativeTemplateIntroEvidence.templateId, templateIds));
}

export async function getIntroTemplateExamples(templateId: string) {
  const db = getDbClient();
  return db
    .select()
    .from(creativeTemplateIntroExamples)
    .where(eq(creativeTemplateIntroExamples.templateId, templateId))
    .orderBy(asc(creativeTemplateIntroExamples.sortOrder));
}

export async function getIntroTemplateEvidence(templateId: string) {
  const db = getDbClient();
  return db
    .select({
      link: creativeTemplateIntroEvidence,
      segment: videoIntroSegments,
      video: youtubeVideos,
      channelTitle: youtubeChannels.title,
    })
    .from(creativeTemplateIntroEvidence)
    .innerJoin(
      videoIntroSegments,
      eq(videoIntroSegments.id, creativeTemplateIntroEvidence.introSegmentId),
    )
    .innerJoin(youtubeVideos, eq(youtubeVideos.videoId, videoIntroSegments.videoId))
    .leftJoin(youtubeChannels, eq(youtubeChannels.channelId, youtubeVideos.channelId))
    .where(eq(creativeTemplateIntroEvidence.templateId, templateId))
    .orderBy(
      asc(creativeTemplateIntroEvidence.sortOrder),
      desc(videoIntroSegments.createdAt),
    );
}

export async function getVideoTranscriptByVideoId(videoId: string) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(videoTranscripts)
    .where(eq(videoTranscripts.videoId, videoId))
    .limit(1);
  return row ?? null;
}

export async function insertIntroSegment(input: {
  videoId: string;
  transcriptId?: string | null;
  sourceFolderVideoId?: string | null;
  windowStartMs: number;
  windowEndMs: number;
  excerptText: string;
  structureSlotsJson: unknown;
  manualStructureNotesJson?: unknown | null;
  sourceMode: string;
  structureExtractor: string;
  lineageSnapshot?: unknown | null;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(videoIntroSegments)
    .values({
      videoId: input.videoId,
      transcriptId: input.transcriptId ?? null,
      sourceFolderVideoId: input.sourceFolderVideoId ?? null,
      windowStartMs: input.windowStartMs,
      windowEndMs: input.windowEndMs,
      excerptText: input.excerptText,
      structureSlotsJson: input.structureSlotsJson,
      manualStructureNotesJson: input.manualStructureNotesJson ?? null,
      sourceMode: input.sourceMode,
      structureExtractor: input.structureExtractor,
      lineageSnapshot: input.lineageSnapshot ?? null,
    })
    .returning();
  if (!row) throw new Error('failed to insert video_intro_segments');
  return row;
}

export async function getReferenceFolderVideoForUser(input: {
  userId: string;
  folderId: string;
  itemId: string;
}) {
  const db = getDbClient();
  const [row] = await db
    .select({
      item: referenceFolderVideos,
      video: youtubeVideos,
    })
    .from(referenceFolderVideos)
    .innerJoin(youtubeVideos, eq(referenceFolderVideos.videoId, youtubeVideos.videoId))
    .where(
      and(
        eq(referenceFolderVideos.id, input.itemId),
        eq(referenceFolderVideos.folderId, input.folderId),
        eq(referenceFolderVideos.userId, input.userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertIntroGenerationJob(input: {
  id?: string;
  userId: string;
  introTemplateId: string;
  userBrief: string;
  status: string;
  resultDraftText?: string | null;
  lineageJson?: unknown | null;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(introGenerationJobs)
    .values({
      id: input.id,
      userId: input.userId,
      introTemplateId: input.introTemplateId,
      userBrief: input.userBrief,
      status: input.status,
      resultDraftText: input.resultDraftText ?? null,
      lineageJson: input.lineageJson ?? null,
    })
    .returning();
  if (!row) throw new Error('failed to insert intro_generation_jobs');
  return row;
}

export async function getIntroEvidenceForTemplate(templateId: string) {
  const db = getDbClient();
  return db
    .select({
      segmentId: videoIntroSegments.id,
      videoId: videoIntroSegments.videoId,
      sourceMode: videoIntroSegments.sourceMode,
      structureExtractor: videoIntroSegments.structureExtractor,
    })
    .from(creativeTemplateIntroEvidence)
    .innerJoin(
      videoIntroSegments,
      eq(videoIntroSegments.id, creativeTemplateIntroEvidence.introSegmentId),
    )
    .where(eq(creativeTemplateIntroEvidence.templateId, templateId));
}

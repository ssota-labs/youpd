import {
  countThreadTemplateEvidence,
  getPublishedThreadTemplateById,
  getThreadEvidenceForTemplate,
  getThreadTemplateCategoryLinks,
  getThreadTemplateEvidence,
  getThreadTemplateExamples,
  getThreadTemplateTagLinks,
  insertThreadGenerationJob,
  listPublishedThreadTemplates,
  listThreadTemplateCategories as listThreadTemplateCategoriesFromDb,
  listThreadTemplateTags as listThreadTemplateTagsFromDb,
} from '@youpd/supabase/repositories/thread-templates';
import {
  CreativeTemplateSlotSchemaJson,
  SocialPostLineageSchema,
  ThreadGenerateRequestSchema,
  ThreadGenerateResponseSchema,
  ThreadSkeletonSchema,
  ThreadStructureEvidenceSourceModeSchema,
  ThreadStructureSlotsSchema,
  ThreadStructureTypeSchema,
  ThreadTemplateCardSchema,
  ThreadTemplateCategorySchema,
  ThreadTemplateDefaultStyleSchema,
  ThreadTemplateDetailSchema,
  ThreadTemplateListQuerySchema,
  ThreadTemplateListResponseSchema,
  ThreadTemplateTagSchema,
  type ThreadTemplateCard,
  type ThreadTemplateDetail,
  type ThreadTemplateListQuery,
} from '@youpd/types';
import { generateThreadDraft, ThreadGenerateError } from './fill-thread-draft';

export class ThreadTemplatesError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'VALIDATION',
  ) {
    super(message);
    this.name = 'ThreadTemplatesError';
  }
}

function parseDefaultStyle(json: unknown) {
  const parsed = ThreadTemplateDefaultStyleSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function slotOrderPreviewFromSkeleton(skeletonJson: unknown): string[] {
  const parsed = ThreadSkeletonSchema.safeParse(skeletonJson);
  return parsed.success ? parsed.data.slotOrder : [];
}

function buildCard(
  template: Awaited<
    ReturnType<typeof listPublishedThreadTemplates>
  >['templates'][number],
  context: {
    categoriesByTemplate: Map<
      string,
      { code: string; name: string; sortOrder: number }[]
    >;
    tagsByTemplate: Map<string, { code: string; name: string }[]>;
    referenceCountByTemplate: Map<string, number>;
  },
): ThreadTemplateCard {
  const categories = context.categoriesByTemplate.get(template.id) ?? [];
  const primary = categories[0] ?? null;
  const style = parseDefaultStyle(template.defaultStyleJson);
  const structureTypeParsed = style?.structureType
    ? ThreadStructureTypeSchema.safeParse(style.structureType)
    : null;

  return ThreadTemplateCardSchema.parse({
    id: template.id,
    code: template.code,
    name: template.name,
    summary: template.summary,
    primaryCategory: primary
      ? { code: primary.code, name: primary.name }
      : null,
    tags: (context.tagsByTemplate.get(template.id) ?? []).map((tag) => ({
      code: tag.code,
      name: tag.name,
    })),
    referenceCount: context.referenceCountByTemplate.get(template.id) ?? 0,
    structureType: structureTypeParsed?.success
      ? structureTypeParsed.data
      : null,
    hookStyle: style?.hookStyle ?? null,
    slotOrderPreview: slotOrderPreviewFromSkeleton(template.skeletonJson),
  });
}

async function loadListContext(templateIds: string[]) {
  const [categoryLinks, tagLinks, referenceCounts] = await Promise.all([
    getThreadTemplateCategoryLinks(templateIds),
    getThreadTemplateTagLinks(templateIds),
    countThreadTemplateEvidence(templateIds),
  ]);

  const categoriesByTemplate = new Map<
    string,
    { code: string; name: string; sortOrder: number }[]
  >();
  for (const row of categoryLinks) {
    const list = categoriesByTemplate.get(row.templateId) ?? [];
    list.push({
      code: row.category.code,
      name: row.category.name,
      sortOrder: row.category.sortOrder,
    });
    categoriesByTemplate.set(row.templateId, list);
  }
  for (const [templateId, list] of categoriesByTemplate) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
    categoriesByTemplate.set(templateId, list);
  }

  const tagsByTemplate = new Map<string, { code: string; name: string }[]>();
  for (const row of tagLinks) {
    const list = tagsByTemplate.get(row.templateId) ?? [];
    list.push({ code: row.tag.code, name: row.tag.name });
    tagsByTemplate.set(row.templateId, list);
  }

  return {
    categoriesByTemplate,
    tagsByTemplate,
    referenceCountByTemplate: referenceCounts,
  };
}

export async function listThreadTemplateCategories() {
  const rows = await listThreadTemplateCategoriesFromDb();
  return rows.map((row) =>
    ThreadTemplateCategorySchema.parse({
      code: row.code,
      name: row.name,
      description: row.description,
      templateCount: row.templateCount,
    }),
  );
}

export async function listThreadTemplateTags() {
  const rows = await listThreadTemplateTagsFromDb();
  return rows.map((row) =>
    ThreadTemplateTagSchema.parse({
      code: row.code,
      name: row.name,
      kind: row.kind,
      templateCount: row.templateCount,
    }),
  );
}

export async function listThreadTemplates(query: ThreadTemplateListQuery) {
  const parsed = ThreadTemplateListQuerySchema.parse(query);
  const { templates, nextCursor } = await listPublishedThreadTemplates({
    categoryCode: parsed.category,
    tagCode: parsed.tag,
    q: parsed.q,
    cursor: parsed.cursor,
    limit: parsed.limit,
  });
  const templateIds = templates.map((t) => t.id);
  const context = await loadListContext(templateIds);
  const cards = templates.map((template) => buildCard(template, context));

  return ThreadTemplateListResponseSchema.parse({
    templates: cards,
    nextCursor,
  });
}

export async function getThreadTemplateDetail(
  templateId: string,
): Promise<ThreadTemplateDetail> {
  const template = await getPublishedThreadTemplateById(templateId);
  if (!template) {
    throw new ThreadTemplatesError('Template not found', 'NOT_FOUND');
  }

  const [context, examples, evidence] = await Promise.all([
    loadListContext([template.id]),
    getThreadTemplateExamples(template.id),
    getThreadTemplateEvidence(template.id),
  ]);

  const card = buildCard(template, context);

  return ThreadTemplateDetailSchema.parse({
    ...card,
    useWhen: template.useWhen,
    skeleton: ThreadSkeletonSchema.parse(template.skeletonJson),
    slotSchema: CreativeTemplateSlotSchemaJson.parse(template.slotSchemaJson),
    defaultStyle: parseDefaultStyle(template.defaultStyleJson),
    examples: examples.map((row) => ({
      label: row.label,
      filledThreadText: row.filledThreadText,
      slotValues: row.slotValuesJson as Record<string, string>,
      partCount: row.partCount,
    })),
    evidence: evidence.map((row) => ({
      evidenceId: row.structureEvidence.id,
      socialPostId: row.post.id,
      authorHandle: row.post.authorHandle,
      permalink: row.post.permalink,
      excerptText: row.post.textContent.slice(0, 280),
      structureType: ThreadStructureTypeSchema.parse(
        row.structureEvidence.structureType,
      ),
      hookStyle: row.structureEvidence.hookStyle,
      sourceMode: ThreadStructureEvidenceSourceModeSchema.parse(
        row.structureEvidence.sourceMode,
      ),
      structureSlots: ThreadStructureSlotsSchema.parse(
        row.structureEvidence.structureSlotsJson,
      ),
      lineage: row.structureEvidence.lineageSnapshot
        ? SocialPostLineageSchema.parse(row.structureEvidence.lineageSnapshot)
        : null,
      evidenceNote: row.link.evidenceNote,
    })),
  });
}

export async function generateThreadForTemplate(
  templateId: string,
  userId: string,
  body: unknown,
) {
  const template = await getPublishedThreadTemplateById(templateId);
  if (!template) {
    throw new ThreadTemplatesError('Template not found', 'NOT_FOUND');
  }

  const parsed = ThreadGenerateRequestSchema.parse(body);
  const evidence = await getThreadEvidenceForTemplate(templateId);
  const defaultStyle = parseDefaultStyle(template.defaultStyleJson);

  try {
    const draft = generateThreadDraft({
      templateId: template.id,
      skeletonJson: template.skeletonJson,
      topic: parsed.topic,
      audience: parsed.audience,
      contextNotes: parsed.contextNotes,
      locale: parsed.locale ?? defaultStyle?.locale ?? 'ko',
      sourceEvidenceIds: evidence.map((row) => row.structureEvidenceId),
      sourceSocialPostIds: [
        ...new Set(evidence.map((row) => row.socialPostId)),
      ],
      sourceMode: evidence[0]?.sourceMode ?? 'imported_seed',
      structureType: defaultStyle?.structureType ?? null,
    });

    const job = await insertThreadGenerationJob({
      id: draft.jobId,
      userId,
      threadTemplateId: template.id,
      topic: parsed.topic,
      audience: parsed.audience ?? null,
      contextNotes: parsed.contextNotes ?? null,
      locale: parsed.locale ?? defaultStyle?.locale ?? 'ko',
      status: draft.status,
      resultDraftText: draft.draftText,
      resultPartsJson: draft.parts,
      lineageJson: draft.lineage,
    });

    return ThreadGenerateResponseSchema.parse({
      jobId: job.id,
      status: job.status,
      draftText: job.resultDraftText,
      parts: draft.parts,
      lineage: draft.lineage,
    });
  } catch (error) {
    if (error instanceof ThreadGenerateError) {
      throw new ThreadTemplatesError(error.message, 'VALIDATION');
    }
    throw error;
  }
}

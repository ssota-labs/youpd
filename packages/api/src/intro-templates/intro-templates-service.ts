import {
  countIntroTemplateEvidence,
  getIntroTemplateCategoryLinks,
  getIntroTemplateEvidence,
  getIntroTemplateEvidenceLineages,
  getIntroTemplateExamples,
  getIntroTemplateTagLinks,
  getIntroEvidenceForTemplate,
  getPublishedIntroTemplateById,
  insertIntroGenerationJob,
  listIntroTemplateCategories as listIntroTemplateCategoriesFromDb,
  listIntroTemplateTags as listIntroTemplateTagsFromDb,
  listPublishedIntroTemplates,
} from '@youpd/supabase/repositories/intro-templates';
import {
  CreativeTemplateSlotSchemaJson,
  IntroGenerateRequestSchema,
  IntroGenerateResponseSchema,
  IntroSkeletonSchema,
  IntroTemplateCardSchema,
  IntroTemplateCategorySchema,
  IntroTemplateDefaultStyleSchema,
  IntroTemplateDetailSchema,
  IntroTemplateListQuerySchema,
  IntroTemplateListResponseSchema,
  IntroTemplateTagSchema,
  IntroStructureSlotsSchema,
  ReferenceVideoLineageSchema,
  type IntroTemplateCard,
  type IntroTemplateDetail,
  type IntroTemplateListQuery,
} from '@youpd/types';
import type { ScoreGrade } from '../query/scoring';
import { maxPerformanceGrade } from '../thumbnail-templates/grade-utils';
import { generateIntroDraft, IntroGenerateError } from './fill-intro-draft';

export class IntroTemplatesError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'VALIDATION',
  ) {
    super(message);
    this.name = 'IntroTemplatesError';
  }
}

function parseDefaultStyle(json: unknown) {
  const parsed = IntroTemplateDefaultStyleSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function topGradeForTemplate(
  lineages: Array<{ templateId: string; lineageSnapshot: unknown }>,
  templateId: string,
): ScoreGrade | null {
  const grades = lineages
    .filter((row) => row.templateId === templateId)
    .map((row) => {
      const parsed = ReferenceVideoLineageSchema.safeParse(row.lineageSnapshot);
      return parsed.success ? parsed.data.performanceGrade : null;
    });
  return maxPerformanceGrade(grades);
}

function slotOrderPreviewFromSkeleton(skeletonJson: unknown): string[] {
  const parsed = IntroSkeletonSchema.safeParse(skeletonJson);
  return parsed.success ? parsed.data.slotOrder : [];
}

function buildCard(
  template: Awaited<
    ReturnType<typeof listPublishedIntroTemplates>
  >['templates'][number],
  context: {
    categoriesByTemplate: Map<
      string,
      { code: string; name: string; sortOrder: number }[]
    >;
    tagsByTemplate: Map<string, { code: string; name: string }[]>;
    referenceCountByTemplate: Map<string, number>;
    lineages: Array<{ templateId: string; lineageSnapshot: unknown }>;
  },
): IntroTemplateCard {
  const categories = context.categoriesByTemplate.get(template.id) ?? [];
  const primary = categories[0] ?? null;

  return IntroTemplateCardSchema.parse({
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
    topPerformanceGrade: topGradeForTemplate(context.lineages, template.id),
    slotOrderPreview: slotOrderPreviewFromSkeleton(template.skeletonJson),
  });
}

async function loadListContext(templateIds: string[]) {
  const [categoryLinks, tagLinks, referenceCounts, lineages] = await Promise.all(
    [
      getIntroTemplateCategoryLinks(templateIds),
      getIntroTemplateTagLinks(templateIds),
      countIntroTemplateEvidence(templateIds),
      getIntroTemplateEvidenceLineages(templateIds),
    ],
  );

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
    lineages,
  };
}

export async function listIntroTemplateCategories() {
  const rows = await listIntroTemplateCategoriesFromDb();
  return rows.map((row) =>
    IntroTemplateCategorySchema.parse({
      code: row.code,
      name: row.name,
      description: row.description,
      templateCount: row.templateCount,
    }),
  );
}

export async function listIntroTemplateTags() {
  const rows = await listIntroTemplateTagsFromDb();
  return rows.map((row) =>
    IntroTemplateTagSchema.parse({
      code: row.code,
      name: row.name,
      kind: row.kind,
      templateCount: row.templateCount,
    }),
  );
}

export async function listIntroTemplates(query: IntroTemplateListQuery) {
  const parsed = IntroTemplateListQuerySchema.parse(query);
  const { templates, nextCursor } = await listPublishedIntroTemplates(parsed);
  const templateIds = templates.map((t) => t.id);
  const context = await loadListContext(templateIds);
  const cards = templates.map((template) => buildCard(template, context));

  return IntroTemplateListResponseSchema.parse({
    templates: cards,
    nextCursor,
  });
}

export async function getIntroTemplateDetail(
  templateId: string,
): Promise<IntroTemplateDetail> {
  const template = await getPublishedIntroTemplateById(templateId);
  if (!template) {
    throw new IntroTemplatesError('Template not found', 'NOT_FOUND');
  }

  const [context, examples, evidence] = await Promise.all([
    loadListContext([template.id]),
    getIntroTemplateExamples(template.id),
    getIntroTemplateEvidence(template.id),
  ]);

  const card = buildCard(template, context);

  return IntroTemplateDetailSchema.parse({
    ...card,
    useWhen: template.useWhen,
    skeleton: IntroSkeletonSchema.parse(template.skeletonJson),
    slotSchema: CreativeTemplateSlotSchemaJson.parse(template.slotSchemaJson),
    defaultStyle: parseDefaultStyle(template.defaultStyleJson),
    examples: examples.map((row) => ({
      label: row.label,
      filledIntro: row.filledIntro,
      slotValues: row.slotValuesJson as Record<string, string>,
    })),
    evidence: evidence.map((row) => ({
      segmentId: row.segment.id,
      videoId: row.video.videoId,
      title: row.video.title,
      channelTitle: row.channelTitle ?? null,
      excerptText: row.segment.excerptText,
      sourceMode: row.segment.sourceMode,
      structureSlots: IntroStructureSlotsSchema.parse(
        row.segment.structureSlotsJson,
      ),
      lineage: row.segment.lineageSnapshot
        ? ReferenceVideoLineageSchema.parse(row.segment.lineageSnapshot)
        : null,
      evidenceNote: row.link.evidenceNote,
    })),
  });
}

export async function generateIntroForTemplate(
  templateId: string,
  userId: string,
  body: unknown,
) {
  const template = await getPublishedIntroTemplateById(templateId);
  if (!template) {
    throw new IntroTemplatesError('Template not found', 'NOT_FOUND');
  }

  const { userBrief } = IntroGenerateRequestSchema.parse(body);
  const evidence = await getIntroEvidenceForTemplate(templateId);

  try {
    const draft = generateIntroDraft({
      templateId: template.id,
      skeletonJson: template.skeletonJson,
      userBrief,
      sourceSegmentIds: evidence.map((row) => row.segmentId),
      sourceVideoIds: [...new Set(evidence.map((row) => row.videoId))],
      sourceMode: evidence[0]?.sourceMode ?? 'imported_seed',
      structureExtractor: evidence[0]?.structureExtractor ?? 'deterministic_v1',
    });

    const job = await insertIntroGenerationJob({
      id: draft.jobId,
      userId,
      introTemplateId: template.id,
      userBrief,
      status: draft.status,
      resultDraftText: draft.draftText,
      lineageJson: draft.lineage,
    });

    return IntroGenerateResponseSchema.parse({
      jobId: job.id,
      status: job.status,
      draftText: job.resultDraftText,
      lineage: draft.lineage,
    });
  } catch (error) {
    if (error instanceof IntroGenerateError) {
      throw new IntroTemplatesError(error.message, 'VALIDATION');
    }
    throw error;
  }
}

import {
  countCopyTemplateTitleEvidence,
  countCopyThumbnailPairings,
  getCopyTemplateCategoryLinks,
  getCopyTemplateExamples,
  getCopyTemplateTagLinks,
  getCopyTemplateThumbnailPairings,
  getCopyTemplateTitleEvidence,
  getCopyTemplateTitleEvidenceLineages,
  getPublishedCopyTemplateById,
  listCopyTemplateCategories as listCopyTemplateCategoriesFromDb,
  listCopyTemplateTags as listCopyTemplateTagsFromDb,
  listPublishedCopyTemplates,
} from '@youpd/supabase/repositories/copy-templates';
import {
  CopySkeletonSchema,
  CopyTemplateCardSchema,
  CopyTemplateCategorySchema,
  CopyTemplateDefaultStyleSchema,
  CopyTemplateDetailSchema,
  CopyTemplateFillRequestSchema,
  CopyTemplateFillResponseSchema,
  CopyTemplateListQuerySchema,
  CopyTemplateListResponseSchema,
  CopyTemplateTagSchema,
  CreativeTemplateSlotSchemaJson,
  ReferenceVideoLineageSchema,
  TitleHookTypeSchema,
  TitleObservedAxesSchema,
  TitleShapeSchema,
  TitleToneSchema,
  type CopyTemplateCard,
  type CopyTemplateDetail,
  type CopyTemplateListQuery,
} from '@youpd/types';
import type { ScoreGrade } from '../query/scoring';
import { maxPerformanceGrade } from '../thumbnail-templates/grade-utils';
import {
  CopyTemplateFillError,
  fillCopyTemplateSlots,
} from './fill-copy-slots';

export class CopyTemplatesError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'VALIDATION',
  ) {
    super(message);
    this.name = 'CopyTemplatesError';
  }
}

function parseDefaultStyle(json: unknown) {
  const parsed = CopyTemplateDefaultStyleSchema.safeParse(json);
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

function buildCard(
  template: Awaited<ReturnType<typeof listPublishedCopyTemplates>>['templates'][number],
  context: {
    categoriesByTemplate: Map<
      string,
      { code: string; name: string; sortOrder: number }[]
    >;
    tagsByTemplate: Map<string, { code: string; name: string }[]>;
    referenceCountByTemplate: Map<string, number>;
    pairingCountByTemplate: Map<string, number>;
    lineages: Array<{ templateId: string; lineageSnapshot: unknown }>;
  },
): CopyTemplateCard {
  const categories = context.categoriesByTemplate.get(template.id) ?? [];
  const primary = categories[0] ?? null;
  const style = parseDefaultStyle(template.defaultStyleJson);
  const hookParsed = style?.hookType
    ? TitleHookTypeSchema.safeParse(style.hookType)
    : null;

  return CopyTemplateCardSchema.parse({
    id: template.id,
    code: template.code,
    name: template.name,
    summary: template.summary,
    primaryHookType: hookParsed?.success ? hookParsed.data : null,
    primaryCategory: primary
      ? { code: primary.code, name: primary.name }
      : null,
    tags: (context.tagsByTemplate.get(template.id) ?? []).map((tag) => ({
      code: tag.code,
      name: tag.name,
    })),
    referenceCount: context.referenceCountByTemplate.get(template.id) ?? 0,
    topPerformanceGrade: topGradeForTemplate(context.lineages, template.id),
    pairedThumbnailCount: context.pairingCountByTemplate.get(template.id) ?? 0,
  });
}

async function loadListContext(templateIds: string[]) {
  const [categoryLinks, tagLinks, referenceCounts, pairingCounts, lineages] =
    await Promise.all([
      getCopyTemplateCategoryLinks(templateIds),
      getCopyTemplateTagLinks(templateIds),
      countCopyTemplateTitleEvidence(templateIds),
      countCopyThumbnailPairings(templateIds),
      getCopyTemplateTitleEvidenceLineages(templateIds),
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
    pairingCountByTemplate: pairingCounts,
    lineages,
  };
}

export async function listCopyTemplateCategories() {
  const rows = await listCopyTemplateCategoriesFromDb();
  return rows.map((row) =>
    CopyTemplateCategorySchema.parse({
      code: row.code,
      name: row.name,
      description: row.description,
      templateCount: row.templateCount,
    }),
  );
}

export async function listCopyTemplateTags() {
  const rows = await listCopyTemplateTagsFromDb();
  return rows.map((row) =>
    CopyTemplateTagSchema.parse({
      code: row.code,
      name: row.name,
      kind: row.kind,
      templateCount: row.templateCount,
    }),
  );
}

export async function listCopyTemplates(query: CopyTemplateListQuery) {
  const parsed = CopyTemplateListQuerySchema.parse(query);
  const { templates, nextCursor } = await listPublishedCopyTemplates(parsed);
  const templateIds = templates.map((t) => t.id);
  const context = await loadListContext(templateIds);
  const cards = templates.map((template) => buildCard(template, context));

  return CopyTemplateListResponseSchema.parse({
    templates: cards,
    nextCursor,
  });
}

export async function getCopyTemplateDetail(
  templateId: string,
): Promise<CopyTemplateDetail> {
  const template = await getPublishedCopyTemplateById(templateId);
  if (!template) {
    throw new CopyTemplatesError('Template not found', 'NOT_FOUND');
  }

  const [context, examples, evidence, pairings] = await Promise.all([
    loadListContext([template.id]),
    getCopyTemplateExamples(template.id),
    getCopyTemplateTitleEvidence(template.id),
    getCopyTemplateThumbnailPairings(template.id),
  ]);

  const card = buildCard(template, context);
  const style = parseDefaultStyle(template.defaultStyleJson);

  return CopyTemplateDetailSchema.parse({
    ...card,
    useWhen: template.useWhen,
    skeleton: CopySkeletonSchema.parse(template.skeletonJson),
    slotSchema: CreativeTemplateSlotSchemaJson.parse(template.slotSchemaJson),
    hookType: style?.hookType
      ? TitleHookTypeSchema.parse(style.hookType)
      : null,
    titleShape: style?.titleShape
      ? TitleShapeSchema.parse(style.titleShape)
      : null,
    tones: (style?.tones ?? []).map((t) => TitleToneSchema.parse(t)),
    rationale: style?.rationale ?? null,
    examples: examples.map((row) => ({
      label: row.label,
      filledTitle: row.filledTitle,
      slotValues: row.slotValuesJson as Record<string, string>,
    })),
    titleEvidence: evidence.map((row) => ({
      analysisId: row.analysis.id,
      videoId: row.video.videoId,
      title: row.analysis.parsedTitle,
      channelTitle: row.channelTitle ?? 'Unknown channel',
      observedAxes: TitleObservedAxesSchema.parse(row.analysis.observedAxesJson),
      lineage: row.analysis.lineageSnapshot
        ? ReferenceVideoLineageSchema.parse(row.analysis.lineageSnapshot)
        : null,
    })),
    thumbnailPairings: pairings.map((row) => ({
      thumbnailTemplateId: row.thumbnail.id,
      code: row.thumbnail.code,
      name: row.thumbnail.name,
      previewImageUrl: row.thumbnail.previewImageUrl,
      pairingRationale: row.link.pairingRationale,
    })),
  });
}

export async function fillCopyTemplate(
  templateId: string,
  body: unknown,
) {
  const template = await getPublishedCopyTemplateById(templateId);
  if (!template) {
    throw new CopyTemplatesError('Template not found', 'NOT_FOUND');
  }

  const { slotValues } = CopyTemplateFillRequestSchema.parse(body);

  try {
    const result = fillCopyTemplateSlots({
      skeletonJson: template.skeletonJson,
      slotSchemaJson: template.slotSchemaJson,
      slotValues,
    });
    return CopyTemplateFillResponseSchema.parse(result);
  } catch (error) {
    if (error instanceof CopyTemplateFillError) {
      throw new CopyTemplatesError(error.message, 'VALIDATION');
    }
    throw error;
  }
}

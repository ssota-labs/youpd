import {
  countTemplateReferences,
  getPublishedThumbnailTemplateById,
  getTemplateCategoryLinks,
  getTemplateReferenceLineages,
  getTemplateReferenceVideos,
  getTemplateTagLinks,
  listCreativeTemplateCategories,
  listCreativeTemplateTags,
  listPublishedThumbnailTemplates,
} from '@youpd/supabase/repositories/creative-templates';
import {
  CreativeTemplateSlotSchemaJson,
  ReferenceVideoLineageSchema,
  ThumbnailObservedAxesSchema,
  ThumbnailSkeletonSchema,
  ThumbnailTemplateCardSchema,
  ThumbnailTemplateCategorySchema,
  ThumbnailTemplateDetailSchema,
  ThumbnailTemplateListQuerySchema,
  ThumbnailTemplateListResponseSchema,
  ThumbnailTemplateTagSchema,
  type ThumbnailTemplateCard,
  type ThumbnailTemplateDetail,
  type ThumbnailTemplateListQuery,
} from '@youpd/types';
import type { ScoreGrade } from '../query/scoring';
import { maxPerformanceGrade } from './grade-utils';

export class ThumbnailTemplatesError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'VALIDATION',
  ) {
    super(message);
    this.name = 'ThumbnailTemplatesError';
  }
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
  template: Awaited<
    ReturnType<typeof listPublishedThumbnailTemplates>
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
): ThumbnailTemplateCard {
  const categories = context.categoriesByTemplate.get(template.id) ?? [];
  const primary = categories[0] ?? null;
  return ThumbnailTemplateCardSchema.parse({
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
    previewImageUrl: template.previewImageUrl,
    referenceCount: context.referenceCountByTemplate.get(template.id) ?? 0,
    topPerformanceGrade: topGradeForTemplate(context.lineages, template.id),
  });
}

async function loadListContext(templateIds: string[]) {
  const [categoryLinks, tagLinks, referenceCounts, lineages] = await Promise.all([
    getTemplateCategoryLinks(templateIds),
    getTemplateTagLinks(templateIds),
    countTemplateReferences(templateIds),
    getTemplateReferenceLineages(templateIds),
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
    lineages,
  };
}

export async function listThumbnailTemplateCategories() {
  const rows = await listCreativeTemplateCategories();
  return rows.map((row) =>
    ThumbnailTemplateCategorySchema.parse({
      code: row.code,
      name: row.name,
      description: row.description,
      templateCount: row.templateCount,
    }),
  );
}

export async function listThumbnailTemplateTags() {
  const rows = await listCreativeTemplateTags();
  return rows.map((row) =>
    ThumbnailTemplateTagSchema.parse({
      code: row.code,
      name: row.name,
      kind: row.kind,
      templateCount: row.templateCount,
    }),
  );
}

export async function listThumbnailTemplates(query: ThumbnailTemplateListQuery) {
  const parsed = ThumbnailTemplateListQuerySchema.parse(query);
  const { templates, nextCursor } = await listPublishedThumbnailTemplates(parsed);
  const templateIds = templates.map((t) => t.id);
  const context = await loadListContext(templateIds);

  const cards = templates.map((template) => buildCard(template, context));

  return ThumbnailTemplateListResponseSchema.parse({
    templates: cards,
    nextCursor,
  });
}

export async function getThumbnailTemplateDetail(
  templateId: string,
): Promise<ThumbnailTemplateDetail> {
  const template = await getPublishedThumbnailTemplateById(templateId);
  if (!template) {
    throw new ThumbnailTemplatesError('Template not found', 'NOT_FOUND');
  }

  const [context, references] = await Promise.all([
    loadListContext([template.id]),
    getTemplateReferenceVideos(template.id),
  ]);

  const card = buildCard(template, context);

  return ThumbnailTemplateDetailSchema.parse({
    ...card,
    useWhen: template.useWhen,
    skeleton: ThumbnailSkeletonSchema.parse(template.skeletonJson),
    slotSchema: CreativeTemplateSlotSchemaJson.parse(template.slotSchemaJson),
    promptScaffold: template.promptScaffold,
    defaultStyle: template.defaultStyleJson as Record<string, unknown>,
    references: references.map((row) => ({
      videoId: row.video.videoId,
      title: row.video.title,
      channelTitle: row.channelTitle ?? 'Unknown channel',
      thumbnailUrl: row.video.thumbnailUrl,
      observedAxes: ThumbnailObservedAxesSchema.parse(row.link.observedAxesJson),
      lineage: row.link.lineageSnapshot
        ? ReferenceVideoLineageSchema.parse(row.link.lineageSnapshot)
        : null,
      sourceFolderVideoId: row.link.sourceFolderVideoId,
    })),
  });
}

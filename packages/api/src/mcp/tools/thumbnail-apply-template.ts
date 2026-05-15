import { z } from 'zod';
import {
  AspectSchema,
  FillersSchema,
  TemplateDocumentSchema,
  aspectToCanvas,
  canvasToAspect,
} from '@youpd/types';
import { applyTemplate } from '../../thumbnail/apply-template';
import { createThumbnail } from '@youpd/supabase/repositories/thumbnails';
import { getTemplateByCode } from '@youpd/supabase/repositories/templates';
import { buildEmbedUrl } from './thumbnail-embed';

export const ThumbnailApplyTemplateInputSchema = z
  .object({
    orgId: z.string().uuid(),
    notionCandidateUrl: z.string().url().optional(),
    templateCode: z.string().min(1).max(60),
    fillers: FillersSchema.default({}),
    name: z.string().max(200).optional(),
    aspect: AspectSchema.optional(),
    updatedBy: z.string().max(200).optional(),
  })
  .strict();
export type ThumbnailApplyTemplateInput = z.infer<
  typeof ThumbnailApplyTemplateInputSchema
>;

export type ThumbnailApplyTemplateOutput = {
  thumbnailId: string;
  embedUrl: string;
};

export async function thumbnailApplyTemplate(
  input: ThumbnailApplyTemplateInput,
): Promise<ThumbnailApplyTemplateOutput> {
  const tpl = await getTemplateByCode(input.templateCode);
  const parsed = TemplateDocumentSchema.parse(tpl.document);
  const document = applyTemplate(parsed, input.fillers);
  const canvas = input.aspect ? aspectToCanvas(input.aspect) : document.canvas;
  const aspect = canvasToAspect(canvas);
  const row = await createThumbnail({
    orgId: input.orgId,
    notionCandidateUrl: input.notionCandidateUrl ?? null,
    name: input.name ?? tpl.title,
    aspect,
    document: { ...document, canvas },
    updatedBy: input.updatedBy ?? null,
  });
  return {
    thumbnailId: row.id,
    embedUrl: buildEmbedUrl(row.id),
  };
}

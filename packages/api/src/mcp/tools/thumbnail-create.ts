import { z } from 'zod';
import {
  AspectSchema,
  FillersSchema,
  ThumbnailDocumentSchema,
  type ThumbnailDocument,
} from '@youpd/types';
import { applyTemplate } from '../../thumbnail/apply-template';
import { createThumbnail } from '@youpd/supabase/repositories/thumbnails';
import { getTemplateByCode } from '@youpd/supabase/repositories/templates';
import { TemplateDocumentSchema } from '@youpd/types';
import { buildEmbedUrl } from './thumbnail-embed';

export const ThumbnailCreateInputSchema = z
  .object({
    orgId: z.string().uuid(),
    notionCandidateUrl: z.string().url().optional(),
    channelId: z.string().optional(),
    name: z.string().max(200).optional(),
    aspect: AspectSchema.default('16:9'),
    templateCode: z.string().min(1).max(60).optional(),
    fillers: FillersSchema.default({}),
    document: ThumbnailDocumentSchema.optional(),
    updatedBy: z.string().max(200).optional(),
  })
  .strict()
  .refine((v) => v.templateCode || v.document, {
    message: 'templateCode or document is required',
  });
export type ThumbnailCreateInput = z.infer<typeof ThumbnailCreateInputSchema>;

export type ThumbnailCreateOutput = {
  thumbnailId: string;
  embedUrl: string;
  status: 'created';
};

export async function thumbnailCreate(
  input: ThumbnailCreateInput,
): Promise<ThumbnailCreateOutput> {
  let document: ThumbnailDocument;
  if (input.templateCode) {
    const tpl = await getTemplateByCode(input.templateCode);
    const parsed = TemplateDocumentSchema.parse(tpl.document);
    document = applyTemplate(parsed, input.fillers);
  } else {
    document = input.document!;
  }
  if (document.aspect !== input.aspect) {
    document = { ...document, aspect: input.aspect };
  }
  const row = await createThumbnail({
    orgId: input.orgId,
    notionCandidateUrl: input.notionCandidateUrl ?? null,
    channelId: input.channelId ?? null,
    name: input.name ?? null,
    aspect: input.aspect,
    document,
    updatedBy: input.updatedBy ?? null,
  });
  return {
    thumbnailId: row.id,
    embedUrl: buildEmbedUrl(row.id),
    status: 'created',
  };
}

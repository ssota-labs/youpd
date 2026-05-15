import { z } from 'zod';
import {
  AspectSchema,
  ThumbnailDocumentSchema,
  type ThumbnailDocument,
} from '@youpd/types';
import {
  getThumbnail,
  setThumbnailExportUrls,
} from '@youpd/supabase/repositories/thumbnails';
import { uploadThumbnailExport } from '@youpd/supabase/storage/thumbnail-exports';
import { renderThumbnailPng } from '../../thumbnail/render';

export const ThumbnailExportPngInputSchema = z
  .object({
    thumbnailId: z.string().uuid(),
    formats: z
      .array(AspectSchema)
      .min(1)
      .max(2)
      .default(['16:9']),
  })
  .strict();
export type ThumbnailExportPngInput = z.infer<typeof ThumbnailExportPngInputSchema>;

export type ThumbnailExportPngOutput = {
  thumbnailId: string;
  exportPngUrl: string | null;
  exportShortPngUrl: string | null;
  attachedToNotion: boolean;
};

export async function thumbnailExportPng(
  input: ThumbnailExportPngInput,
): Promise<ThumbnailExportPngOutput> {
  const row = await getThumbnail(input.thumbnailId);
  const baseDoc: ThumbnailDocument = ThumbnailDocumentSchema.parse({
    aspect: row.aspect,
    background: row.background ?? undefined,
    layers: row.layers,
  });

  let exportPngUrl: string | null = row.exportPngUrl;
  let exportShortPngUrl: string | null = row.exportShortPngUrl;

  for (const aspect of input.formats) {
    const doc: ThumbnailDocument =
      baseDoc.aspect === aspect ? baseDoc : { ...baseDoc, aspect };
    const bytes = await renderThumbnailPng(doc);
    const { publicUrl } = await uploadThumbnailExport({
      thumbnailId: row.id,
      aspect,
      bytes,
    });
    if (aspect === '16:9') exportPngUrl = publicUrl;
    else exportShortPngUrl = publicUrl;
  }

  await setThumbnailExportUrls({
    id: row.id,
    exportPngUrl,
    exportShortPngUrl,
  });

  return {
    thumbnailId: row.id,
    exportPngUrl,
    exportShortPngUrl,
    // Notion attachment is the caller's responsibility in v0.4 — the URL is
    // long-lived and ready to drop into a Notion `files` property.
    attachedToNotion: false,
  };
}

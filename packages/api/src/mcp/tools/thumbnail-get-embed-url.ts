import { z } from 'zod';
import { getThumbnail } from '@youpd/supabase/repositories/thumbnails';
import { buildEmbedUrl, buildPublicPreviewUrl } from './thumbnail-embed';

export const ThumbnailGetEmbedUrlInputSchema = z
  .object({ thumbnailId: z.string().uuid() })
  .strict();
export type ThumbnailGetEmbedUrlInput = z.infer<
  typeof ThumbnailGetEmbedUrlInputSchema
>;

export type ThumbnailGetEmbedUrlOutput = {
  embedUrl: string;
  publicPreviewUrl: string;
};

export async function thumbnailGetEmbedUrl(
  input: ThumbnailGetEmbedUrlInput,
): Promise<ThumbnailGetEmbedUrlOutput> {
  // existence check — throws ThumbnailNotFoundError if missing
  const row = await getThumbnail(input.thumbnailId);
  return {
    embedUrl: buildEmbedUrl(row.id),
    publicPreviewUrl: buildPublicPreviewUrl(row.id),
  };
}

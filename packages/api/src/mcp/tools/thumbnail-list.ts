import { z } from 'zod';
import { listThumbnailsByCandidate } from '@youpd/supabase/repositories/thumbnails';

export const ThumbnailListInputSchema = z
  .object({
    orgId: z.string().uuid(),
    notionCandidateUrl: z.string().url(),
  })
  .strict();
export type ThumbnailListInput = z.infer<typeof ThumbnailListInputSchema>;

export type ThumbnailListOutput = {
  items: Array<{
    thumbnailId: string;
    name: string | null;
    aspect: string;
    updatedAt: string;
    exportPngUrl: string | null;
  }>;
};

export async function thumbnailList(
  input: ThumbnailListInput,
): Promise<ThumbnailListOutput> {
  const rows = await listThumbnailsByCandidate(
    input.orgId,
    input.notionCandidateUrl,
  );
  return {
    items: rows.map((r) => ({
      thumbnailId: r.id,
      name: r.name,
      aspect: r.aspect,
      updatedAt: r.updatedAt.toISOString(),
      exportPngUrl: r.exportPngUrl,
    })),
  };
}

import { z } from 'zod';

export const ThumbnailSuggestTitlesInputSchema = z
  .object({
    notionCandidateUrl: z.string().url(),
    commentIds: z.array(z.string().min(1)).default([]),
    commentTexts: z.array(z.string().min(1)).default([]),
    count: z.number().int().min(1).max(10).default(5),
  })
  .strict();
export type ThumbnailSuggestTitlesInput = z.infer<
  typeof ThumbnailSuggestTitlesInputSchema
>;

export type ThumbnailSuggestTitlesOutput = {
  suggestions: Array<{
    headline: string;
    accent: string;
    reason: string;
  }>;
};

// LLM adapter is a port — v0.4 MVP returns a deterministic stub built from
// the supplied comment texts so the agent surface is wired end-to-end.
// `commentTexts` are optional; when empty the response falls back to a
// placeholder list and the agent should regenerate via Notion AI.
export async function thumbnailSuggestTitlesFromComments(
  input: ThumbnailSuggestTitlesInput,
): Promise<ThumbnailSuggestTitlesOutput> {
  const sources = input.commentTexts.length
    ? input.commentTexts.slice(0, input.count)
    : Array.from({ length: input.count }, (_, i) => `댓글 후보 ${i + 1}`);
  const suggestions = sources.map((text, idx) => {
    const trimmed = text.slice(0, 30).trim();
    return {
      headline: `${trimmed}, 정말 그래?`,
      accent: trimmed.split(' ')[0] ?? trimmed,
      reason:
        input.commentTexts.length > 0
          ? '댓글 본문에서 추출한 후킹 문구'
          : 'stub — LLM 어댑터 미구현',
      __sourceIndex: idx,
    };
  });
  return {
    suggestions: suggestions.map(({ headline, accent, reason }) => ({
      headline,
      accent,
      reason,
    })),
  };
}

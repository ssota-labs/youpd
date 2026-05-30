import { z } from 'zod';

/** Extended onboarding profile (S3 superset of S1 HomeOnboarding). */
export const HomeProfileInputSchema = z.object({
  interestTopics: z.string().min(1),
  channelDescription: z.string().min(1),
  ownChannelUrl: z.string().url().optional(),
  referenceChannelUrls: z.array(z.string().url()).max(5).default([]),
  excludedTopics: z.array(z.string().min(1)).max(20).default([]),
  preferredRegionCode: z.string().length(2).default('KR'),
  autoRunHarvest: z.boolean().default(false),
});

export type HomeProfileInput = z.infer<typeof HomeProfileInputSchema>;

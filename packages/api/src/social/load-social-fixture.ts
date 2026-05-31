import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { SocialPostMetricsSchema, SocialProviderSchema } from '@youpd/types';

const FixtureSchema = z.object({
  provider: SocialProviderSchema,
  externalId: z.string().optional(),
  permalink: z.string().url(),
  authorHandle: z.string(),
  authorDisplayName: z.string().optional(),
  textContent: z.string(),
  publishedAt: z.string().datetime().optional(),
  metrics: SocialPostMetricsSchema.optional(),
});

export type SocialFixturePayload = z.infer<typeof FixtureSchema>;

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/social');

export async function loadSocialFixture(
  provider: 'threads' | 'x_bookmarks',
): Promise<SocialFixturePayload> {
  const file =
    provider === 'threads'
      ? join(fixtureDir, 'threads-example.json')
      : join(fixtureDir, 'x-example.json');
  const raw = await readFile(file, 'utf8');
  return FixtureSchema.parse(JSON.parse(raw));
}

export function shouldUseSocialFixtures(): boolean {
  if (process.env.SOCIAL_USE_FIXTURES === 'true') return true;
  if (process.env.SOCIAL_USE_FIXTURES === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

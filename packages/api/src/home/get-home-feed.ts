import {
  HomeFeedResponseSchema,
  type HomeFeedResponse,
  type HomeOnboarding,
} from '@youpd/types';
import { buildFixtureHomeFeed } from './fixtures';
import { resolveHomeSystemStatus } from './system-status';

export type GetHomeFeedInput = {
  onboarding: HomeOnboarding | null;
  /** When true, always return fixture probes (also default when onboarding exists in S1). */
  useFixture?: boolean;
};

export async function getHomeFeed(
  input: GetHomeFeedInput,
): Promise<HomeFeedResponse> {
  const useFixture =
    input.useFixture ??
    (process.env.YOUPD_HOME_FEED_FIXTURE === '1' || Boolean(input.onboarding));

  const systemStatus = await resolveHomeSystemStatus();

  if (!input.onboarding) {
    return HomeFeedResponseSchema.parse({
      onboarding: null,
      probes: [],
      candidates: [],
      systemStatus,
      source: 'live',
    });
  }

  if (useFixture) {
    const fixture = buildFixtureHomeFeed(input.onboarding);
    return HomeFeedResponseSchema.parse({
      ...fixture,
      systemStatus,
    });
  }

  return HomeFeedResponseSchema.parse({
    onboarding: input.onboarding,
    probes: [],
    candidates: [],
    systemStatus,
    source: 'live',
  });
}

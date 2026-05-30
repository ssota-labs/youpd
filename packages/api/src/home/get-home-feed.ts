import {
  HomeFeedResponseSchema,
  HomeOnboardingSchema,
  type HomeFeedResponse,
  type HomeOnboarding,
} from '@youpd/types';
import { getHomeUserProfile, listActiveUserProbes } from '@youpd/supabase';
import { buildFixtureHomeFeed } from './fixtures';
import { resolveHomeSystemStatus } from './system-status';

export type GetHomeFeedInput = {
  onboarding: HomeOnboarding | null;
  userId?: string | null;
  /** When true, always return fixture probes. */
  useFixture?: boolean;
};

export async function getHomeFeed(
  input: GetHomeFeedInput,
): Promise<HomeFeedResponse> {
  const systemStatus = await resolveHomeSystemStatus();

  if (input.userId) {
    const profileRow = await getHomeUserProfile(input.userId);
    const probes = await listActiveUserProbes(input.userId);

    if (profileRow && probes.length > 0) {
      const onboarding = HomeOnboardingSchema.parse({
        interestTopics: profileRow.interestTopics,
        channelDescription: profileRow.channelDescription,
      });
      return HomeFeedResponseSchema.parse({
        onboarding,
        probes,
        candidates: [],
        systemStatus,
        source: 'live',
      });
    }

    if (profileRow) {
      const onboarding = HomeOnboardingSchema.parse({
        interestTopics: profileRow.interestTopics,
        channelDescription: profileRow.channelDescription,
      });
      if (input.useFixture || process.env.YOUPD_HOME_FEED_FIXTURE === '1') {
        const fixture = buildFixtureHomeFeed(onboarding);
        return HomeFeedResponseSchema.parse({
          ...fixture,
          systemStatus,
        });
      }
      return HomeFeedResponseSchema.parse({
        onboarding,
        probes: [],
        candidates: [],
        systemStatus,
        source: 'live',
      });
    }
  }

  const useFixture =
    input.useFixture ??
    (process.env.YOUPD_HOME_FEED_FIXTURE === '1' || Boolean(input.onboarding));

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

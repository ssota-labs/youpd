import {
  HomeProfileInputSchema,
  HomeOnboardingSchema,
  type HomeProfileInput,
} from '@youpd/types';
import { upsertHomeUserProfile } from '@youpd/supabase';

export function profileToOnboarding(profile: HomeProfileInput) {
  return HomeOnboardingSchema.parse({
    interestTopics: profile.interestTopics,
    channelDescription: profile.channelDescription,
  });
}

export async function saveHomeProfile(userId: string, body: unknown) {
  const profile = HomeProfileInputSchema.parse(body);
  await upsertHomeUserProfile(userId, profile);
  return { profile, onboarding: profileToOnboarding(profile) };
}

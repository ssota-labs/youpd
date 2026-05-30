import { getHomeFeed } from '@youpd/api/home';
import { readHomeOnboardingCookie } from '@/lib/home/onboarding-cookie';
import { HomeFeed } from '@/components/home/home-feed';

export default async function HomePage() {
  const onboarding = await readHomeOnboardingCookie();
  const feed = await getHomeFeed({ onboarding });

  return <HomeFeed initial={feed} />;
}

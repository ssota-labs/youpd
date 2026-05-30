import { NextResponse } from 'next/server';
import { HomeOnboardingSchema } from '@youpd/types';
import { getHomeFeed } from '@youpd/api/home';
import {
  readHomeOnboardingCookie,
  writeHomeOnboardingCookie,
} from '@/lib/home/onboarding-cookie';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = HomeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(', ') || 'Validation failed' },
      { status: 400 },
    );
  }

  await writeHomeOnboardingCookie(parsed.data);
  const feed = await getHomeFeed({ onboarding: parsed.data });
  return NextResponse.json(feed);
}

export async function GET() {
  const onboarding = await readHomeOnboardingCookie();
  return NextResponse.json({ onboarding });
}

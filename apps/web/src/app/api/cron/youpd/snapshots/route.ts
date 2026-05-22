import 'server-only';

import { NextResponse } from 'next/server';
import {
  CaptureDailySnapshotsInputSchema,
  captureDailySnapshots,
} from '@youpd/api/youtube';
import { wrapRestEnvelope } from '@youpd/api/rest';
import { requireCronSecret } from '@/server/cron-auth';
import { youpdRestError } from '@/server/youpd-rest';

export async function GET(request: Request): Promise<Response> {
  try {
    requireCronSecret(request);
    const result = await captureDailySnapshots(
      CaptureDailySnapshotsInputSchema.parse({}),
    );
    return NextResponse.json(wrapRestEnvelope(result));
  } catch (error) {
    return youpdRestError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    requireCronSecret(request);
    const body: unknown = await request.json();
    const result = await captureDailySnapshots(
      CaptureDailySnapshotsInputSchema.parse(body),
    );
    return NextResponse.json(wrapRestEnvelope(result));
  } catch (error) {
    return youpdRestError(error);
  }
}

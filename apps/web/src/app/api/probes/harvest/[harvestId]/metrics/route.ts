import { NextResponse } from 'next/server';
import { getProbeMetrics } from '@youpd/api/youtube';

type RouteContext = {
  params: Promise<{ harvestId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { harvestId } = await context.params;
  const result = await getProbeMetrics(harvestId);

  if (!result.data) {
    return NextResponse.json(
      { error: 'Probe not found', warnings: result.warnings },
      { status: 404 },
    );
  }

  return NextResponse.json({
    metrics: result.data,
    warnings: result.warnings,
  });
}

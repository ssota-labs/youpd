import 'server-only';
import { NextResponse } from 'next/server';
import {
  ThumbnailSetLayerInputSchema,
  thumbnailSetLayer,
} from '@youpd/api/mcp/tools';

export const dynamic = 'force-dynamic';

// Iframe-side proxy for the MCP tool. v0.4 MVP is unauthenticated for the
// designer — auth wraps in via Supabase Auth session check before exposing
// publicly, but the local Supabase service-role enforces RLS deny-all so
// callers can't bypass server-side ownership checks added later.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ThumbnailSetLayerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.message },
      { status: 400 },
    );
  }
  try {
    const out = await thumbnailSetLayer(parsed.data);
    return NextResponse.json(out);
  } catch (err) {
    return mapError(err);
  }
}

function mapError(err: unknown): Response {
  if (!(err instanceof Error)) {
    return NextResponse.json({ error: 'unknown' }, { status: 500 });
  }
  const status =
    err.name === 'ThumbnailVersionConflictError'
      ? 409
      : err.name === 'InvalidLayerPatchError' || err.name === 'LayerNotFoundError'
        ? 400
        : err.name === 'ThumbnailNotFoundError'
          ? 404
          : 500;
  return NextResponse.json({ error: err.name, message: err.message }, { status });
}

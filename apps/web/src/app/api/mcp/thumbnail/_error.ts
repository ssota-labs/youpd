import 'server-only';
import { NextResponse } from 'next/server';

// Shared error mapping for /api/mcp/thumbnail/* proxy routes.
export function mapThumbnailError(err: unknown): Response {
  if (!(err instanceof Error)) {
    return NextResponse.json({ error: 'unknown' }, { status: 500 });
  }
  const status =
    err.name === 'ThumbnailVersionConflictError'
      ? 409
      : err.name === 'InvalidLayerPatchError' ||
          err.name === 'InvalidLayerOrderError' ||
          err.name === 'LayerNotFoundError'
        ? 400
        : err.name === 'ThumbnailNotFoundError'
          ? 404
          : 500;
  return NextResponse.json(
    { error: err.name, message: err.message },
    { status },
  );
}

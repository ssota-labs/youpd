'use client';

import type { Layer, LayerPatch } from '@youpd/types';

// Centralized fetch helpers for /api/mcp/thumbnail/* proxy routes. All return
// either an OK payload, a {conflict: true} signal, or throw.
async function postJson<T>(path: string, body: unknown): Promise<T | { conflict: true }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 409) return { conflict: true };
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export type ServerResult<T> = T | { conflict: true };

export function setLayer(args: {
  thumbnailId: string;
  layerId: string;
  patch: LayerPatch;
  expectedVersion: number;
}): Promise<ServerResult<{ version: number }>> {
  return postJson('/api/mcp/thumbnail/set-layer', {
    ...args,
    source: 'iframe',
  });
}

export function addLayer(args: {
  thumbnailId: string;
  layer: Layer;
  expectedVersion: number;
}): Promise<ServerResult<{ version: number; layerId: string }>> {
  return postJson('/api/mcp/thumbnail/add-layer', {
    ...args,
    source: 'iframe',
  });
}

export function deleteLayer(args: {
  thumbnailId: string;
  layerId: string;
  expectedVersion: number;
}): Promise<ServerResult<{ version: number }>> {
  return postJson('/api/mcp/thumbnail/delete-layer', {
    ...args,
    source: 'iframe',
  });
}

export function reorderLayers(args: {
  thumbnailId: string;
  layerIds: string[];
  expectedVersion: number;
}): Promise<ServerResult<{ version: number; order: string[] }>> {
  return postJson('/api/mcp/thumbnail/reorder', {
    ...args,
    source: 'iframe',
  });
}

export async function refetchState(thumbnailId: string): Promise<{
  version: number;
  document: { aspect: '16:9' | '9:16'; layers: Layer[]; background?: unknown };
} | null> {
  const res = await fetch(`/api/mcp/thumbnail/state?thumbnailId=${thumbnailId}`);
  if (!res.ok) return null;
  return (await res.json()) as never;
}

'use client';

import type {
  Composition,
  Layer,
  LayerPatch,
  Template,
} from '@youpd/composer-core';
import type { ServerActions } from '@youpd/composer-react';

// YouPD's adapter mapping ServerActions to /api/mcp/thumbnail/* routes. Any
// other agent product can implement ServerActions against its own backend
// without changing composer-react.

async function postJson<T>(
  path: string,
  body: unknown,
): Promise<T | { conflict: true }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 409) return { conflict: true };
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const youpdThumbnailActions: ServerActions = {
  setLayer: ({ documentId, layerId, patch, expectedVersion }) =>
    postJson('/api/mcp/thumbnail/set-layer', {
      thumbnailId: documentId,
      layerId,
      patch,
      expectedVersion,
      source: 'iframe',
    }) as Promise<{ version: number } | { conflict: true }>,

  addLayer: ({ documentId, layer, expectedVersion }) =>
    postJson('/api/mcp/thumbnail/add-layer', {
      thumbnailId: documentId,
      layer,
      expectedVersion,
      source: 'iframe',
    }) as Promise<{ version: number; layerId: string } | { conflict: true }>,

  deleteLayer: ({ documentId, layerId, expectedVersion }) =>
    postJson('/api/mcp/thumbnail/delete-layer', {
      thumbnailId: documentId,
      layerId,
      expectedVersion,
      source: 'iframe',
    }) as Promise<{ version: number } | { conflict: true }>,

  reorderLayers: ({ documentId, layerIds, expectedVersion }) =>
    postJson('/api/mcp/thumbnail/reorder', {
      thumbnailId: documentId,
      layerIds,
      expectedVersion,
      source: 'iframe',
    }) as Promise<
      { version: number; order: string[] } | { conflict: true }
    >,

  async refetchState(documentId) {
    const res = await fetch(
      `/api/mcp/thumbnail/state?thumbnailId=${documentId}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      version: number;
      document: Composition;
    };
    return { version: data.version, document: data.document };
  },

  undo: (documentId) =>
    postJson('/api/mcp/thumbnail/undo', {
      thumbnailId: documentId,
      source: 'iframe',
    }) as Promise<
      | { version: number; canUndo: boolean; canRedo: boolean }
      | { conflict: true }
    >,

  redo: (documentId) =>
    postJson('/api/mcp/thumbnail/redo', {
      thumbnailId: documentId,
      source: 'iframe',
    }) as Promise<
      | { version: number; canUndo: boolean; canRedo: boolean }
      | { conflict: true }
    >,

  async fetchHistoryState(documentId) {
    const res = await fetch(
      `/api/mcp/thumbnail/history?thumbnailId=${documentId}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as { canUndo: boolean; canRedo: boolean };
  },

  async fetchTemplates() {
    const res = await fetch('/api/mcp/thumbnail/templates');
    if (!res.ok) return [];
    const data = (await res.json()) as { templates: Template[] };
    return data.templates;
  },

  async applyTemplate({ orgId, templateCode, notionCandidateUrl }) {
    const res = await fetch('/api/mcp/thumbnail/apply-template', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orgId,
        templateCode,
        notionCandidateUrl,
        fillers: {},
        source: 'iframe',
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      thumbnailId: string;
      embedUrl: string;
    };
    return { documentId: data.thumbnailId, embedUrl: data.embedUrl };
  },

  async uploadAsset({ orgId, file }) {
    const form = new FormData();
    form.append('orgId', orgId);
    form.append('file', file);
    const res = await fetch('/api/upload/thumbnail-asset', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) return null;
    return (await res.json()) as { publicUrl: string };
  },
};

// Suppress unused-import warnings for Layer / LayerPatch that may be re-used
// when other YouPD-specific glue lands later.
export type { Layer, LayerPatch };

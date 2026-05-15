'use client';

import type {
  Composition,
  Layer,
  LayerPatch,
  Template,
} from '@youpd/composer-core';

// ServerActions are the only "outside world" surface the editor depends on.
// Hosts implement these against their own MCP / HTTP / RPC layer; the
// component is agnostic to whether calls go through Next route handlers,
// Vercel functions, or an in-memory fixture.

export type ServerResult<T> = T | { conflict: true };

export interface ServerActions {
  setLayer(args: {
    documentId: string;
    layerId: string;
    patch: LayerPatch;
    expectedVersion: number;
  }): Promise<ServerResult<{ version: number }>>;

  addLayer(args: {
    documentId: string;
    layer: Layer;
    expectedVersion: number;
  }): Promise<ServerResult<{ version: number; layerId: string }>>;

  deleteLayer(args: {
    documentId: string;
    layerId: string;
    expectedVersion: number;
  }): Promise<ServerResult<{ version: number }>>;

  reorderLayers(args: {
    documentId: string;
    layerIds: string[];
    expectedVersion: number;
  }): Promise<ServerResult<{ version: number; order: string[] }>>;

  refetchState(documentId: string): Promise<{
    version: number;
    document: Composition;
  } | null>;

  undo(documentId: string): Promise<
    ServerResult<{ version: number; canUndo: boolean; canRedo: boolean }>
  >;

  redo(documentId: string): Promise<
    ServerResult<{ version: number; canUndo: boolean; canRedo: boolean }>
  >;

  fetchHistoryState(
    documentId: string,
  ): Promise<{ canUndo: boolean; canRedo: boolean } | null>;

  // Profile-aware template catalog. Hosts can pre-filter by profile id to
  // avoid surfacing thumbnail templates inside a detail-page composer.
  fetchTemplates(): Promise<Template[]>;

  applyTemplate(args: {
    orgId: string;
    templateCode: string;
    notionCandidateUrl?: string;
  }): Promise<{ documentId: string; embedUrl: string } | null>;

  uploadAsset(args: {
    orgId: string;
    file: File;
  }): Promise<{ publicUrl: string } | null>;
}

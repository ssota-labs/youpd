'use client';

import { create } from 'zustand';
import type { Layer, LayerPatch, ThumbnailDocument } from '@youpd/types';

type ServerSyncStatus = 'idle' | 'pending' | 'conflict' | 'error';

type State = {
  thumbnailId: string;
  doc: ThumbnailDocument;
  version: number;
  selectedId: string | null;
  hoveredId: string | null;
  isDragging: boolean;
  status: ServerSyncStatus;
  canUndo: boolean;
  canRedo: boolean;
};

type Actions = {
  init: (input: {
    thumbnailId: string;
    doc: ThumbnailDocument;
    version: number;
  }) => void;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setIsDragging: (v: boolean) => void;
  // Apply a patch locally and replace the matching layer; called both for
  // optimistic edits and for Realtime reconciliation.
  applyLocalPatch: (layerId: string, patch: LayerPatch) => void;
  // Replace the entire doc + version (used for Realtime full re-sync and undo).
  replaceDoc: (doc: ThumbnailDocument, version: number) => void;
  setStatus: (status: ServerSyncStatus) => void;
  setHistoryState: (state: { canUndo: boolean; canRedo: boolean }) => void;
};

export const useDesignerStore = create<State & Actions>((set) => ({
  thumbnailId: '',
  doc: { aspect: '16:9', layers: [] },
  version: 0,
  selectedId: null,
  hoveredId: null,
  isDragging: false,
  status: 'idle',
  canUndo: false,
  canRedo: false,
  init: ({ thumbnailId, doc, version }) =>
    set({
      thumbnailId,
      doc,
      version,
      selectedId: null,
      hoveredId: null,
      canUndo: false,
      canRedo: false,
    }),
  setSelected: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  setIsDragging: (v) => set({ isDragging: v }),
  applyLocalPatch: (layerId, patch) =>
    set((s) => ({
      doc: {
        ...s.doc,
        layers: s.doc.layers.map((l) =>
          l.id === layerId ? ({ ...l, ...patch } as Layer) : l,
        ),
      },
    })),
  replaceDoc: (doc, version) => set({ doc, version }),
  setStatus: (status) => set({ status }),
  setHistoryState: ({ canUndo, canRedo }) => set({ canUndo, canRedo }),
}));

// Helper that wraps a server-side set_layer call with optimistic update +
// rollback on failure. Throttles by relying on caller to batch (e.g. drag end).
export async function patchLayerOnServer(args: {
  thumbnailId: string;
  layerId: string;
  patch: LayerPatch;
  expectedVersion: number;
  source?: 'iframe' | 'agent';
}): Promise<{ version: number } | { conflict: true }> {
  const res = await fetch('/api/mcp/thumbnail/set-layer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      thumbnailId: args.thumbnailId,
      layerId: args.layerId,
      patch: args.patch,
      expectedVersion: args.expectedVersion,
      source: args.source ?? 'iframe',
    }),
  });
  if (res.status === 409) return { conflict: true };
  if (!res.ok) throw new Error(`set_layer failed: ${res.status}`);
  return (await res.json()) as { version: number };
}

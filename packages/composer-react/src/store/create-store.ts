'use client';

import { createStore as createZustandStore } from 'zustand';
import type { Composition, Layer, LayerPatch } from '@youpd/composer-core';

export type ServerSyncStatus = 'idle' | 'pending' | 'conflict' | 'error';

export type ComposerStoreState = {
  documentId: string;
  doc: Composition;
  version: number;
  selectedId: string | null;
  hoveredId: string | null;
  isDragging: boolean;
  status: ServerSyncStatus;
  canUndo: boolean;
  canRedo: boolean;
};

export type ComposerStoreActions = {
  init: (input: {
    documentId: string;
    doc: Composition;
    version: number;
  }) => void;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setIsDragging: (v: boolean) => void;
  applyLocalPatch: (layerId: string, patch: LayerPatch) => void;
  replaceDoc: (doc: Composition, version: number) => void;
  setStatus: (status: ServerSyncStatus) => void;
  setHistoryState: (state: { canUndo: boolean; canRedo: boolean }) => void;
};

export type ComposerStore = ComposerStoreState & ComposerStoreActions;

// Factory so each <Composer /> instance gets its own isolated store; lets a
// host mount two composers (e.g. side-by-side compare view) without state
// bleed.
export function createComposerStore() {
  return createZustandStore<ComposerStore>((set) => ({
    documentId: '',
    doc: { canvas: { width: 1280, height: 720 }, layers: [] },
    version: 0,
    selectedId: null,
    hoveredId: null,
    isDragging: false,
    status: 'idle',
    canUndo: false,
    canRedo: false,
    init: ({ documentId, doc, version }) =>
      set({
        documentId,
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
}

export type ComposerStoreApi = ReturnType<typeof createComposerStore>;

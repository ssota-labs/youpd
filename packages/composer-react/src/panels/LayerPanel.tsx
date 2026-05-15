'use client';

import { useState } from 'react';
import type { Layer } from '@youpd/composer-core';
import { useComposerActions, useComposerStore } from '../store';

export function LayerPanel() {
  const actions = useComposerActions();
  const documentId = useComposerStore((s) => s.documentId);
  const version = useComposerStore((s) => s.version);
  const doc = useComposerStore((s) => s.doc);
  const selectedId = useComposerStore((s) => s.selectedId);
  const setSelected = useComposerStore((s) => s.setSelected);
  const replaceDoc = useComposerStore((s) => s.replaceDoc);
  const [dragId, setDragId] = useState<string | null>(null);

  // Render newest-on-top: index 0 is back, last is front. UI shows front first.
  const ordered = [...doc.layers].reverse();

  const reorderRemote = async (next: string[]) => {
    await actions.reorderLayers({
      documentId,
      layerIds: next,
      expectedVersion: version,
    });
    const state = await actions.refetchState(documentId);
    if (state) replaceDoc(state.document, state.version);
  };

  const moveTo = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ids = doc.layers.map((l) => l.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    void reorderRemote(next);
  };

  const toggleVisible = (layer: Layer) => {
    void actions.setLayer({
      documentId,
      layerId: layer.id,
      patch: { visible: !(layer.visible !== false) },
      expectedVersion: version,
    });
  };

  const remove = async (layer: Layer) => {
    await actions.deleteLayer({
      documentId,
      layerId: layer.id,
      expectedVersion: version,
    });
    const state = await actions.refetchState(documentId);
    if (state) replaceDoc(state.document, state.version);
    if (selectedId === layer.id) setSelected(null);
  };

  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
      <header className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
        레이어
      </header>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1">
        {ordered.map((layer) => {
          const isSelected = selectedId === layer.id;
          const isDragOver = dragId && dragId !== layer.id;
          return (
            <li
              key={layer.id}
              draggable
              onDragStart={() => setDragId(layer.id)}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) moveTo(dragId, layer.id);
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              onClick={() => setSelected(layer.id)}
              className={[
                'group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer select-none',
                isSelected
                  ? 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-500'
                  : 'hover:bg-zinc-800 text-zinc-200',
                isDragOver ? 'outline outline-1 outline-blue-400' : '',
              ].join(' ')}
            >
              <span className="text-zinc-500 text-xs w-10 shrink-0">
                {layer.type}
              </span>
              <span className="truncate flex-1">
                {layer.type === 'text' ? layer.text : layer.id}
              </span>
              <button
                type="button"
                aria-label="visibility"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisible(layer);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-200"
              >
                {layer.visible === false ? '🚫' : '👁'}
              </button>
              <button
                type="button"
                aria-label="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  void remove(layer);
                }}
                className="text-xs text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          );
        })}
        {doc.layers.length === 0 ? (
          <li className="text-xs text-zinc-500 px-2 py-2">레이어 없음</li>
        ) : null}
      </ul>
    </aside>
  );
}

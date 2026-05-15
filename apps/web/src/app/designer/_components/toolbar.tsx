'use client';

import { useState } from 'react';
import type { Layer } from '@youpd/types';
import { useDesignerStore } from './designer-store';
import { addLayer, refetchState } from './designer-actions';

export function Toolbar() {
  const thumbnailId = useDesignerStore((s) => s.thumbnailId);
  const version = useDesignerStore((s) => s.version);
  const replaceDoc = useDesignerStore((s) => s.replaceDoc);
  const status = useDesignerStore((s) => s.status);
  const [busy, setBusy] = useState(false);

  const addNew = async (layer: Layer) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await addLayer({ thumbnailId, layer, expectedVersion: version });
      if ('conflict' in res) {
        const state = await refetchState(thumbnailId);
        if (state) replaceDoc(state.document as never, state.version);
      } else {
        const state = await refetchState(thumbnailId);
        if (state) replaceDoc(state.document as never, state.version);
      }
    } finally {
      setBusy(false);
    }
  };

  const addText = () =>
    void addNew({
      type: 'text',
      id: `text-${Date.now().toString(36)}`,
      text: '텍스트',
      x: 120,
      y: 120,
      width: 600,
      fontSize: 64,
      fontWeight: 700,
      fill: '#ffffff',
    });

  const addRect = () =>
    void addNew({
      type: 'shape',
      shape: 'rect',
      id: `rect-${Date.now().toString(36)}`,
      x: 120,
      y: 120,
      width: 200,
      height: 120,
      fill: '#facc15',
    });

  const addCircle = () =>
    void addNew({
      type: 'shape',
      shape: 'circle',
      id: `circle-${Date.now().toString(36)}`,
      x: 120,
      y: 120,
      width: 160,
      height: 160,
      fill: '#ef4444',
    });

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-900 border-b border-zinc-800">
      <ToolbarButton onClick={addText} disabled={busy}>＋ 텍스트</ToolbarButton>
      <ToolbarButton onClick={addRect} disabled={busy}>＋ 사각형</ToolbarButton>
      <ToolbarButton onClick={addCircle} disabled={busy}>＋ 원</ToolbarButton>
      <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
        <span>v{version}</span>
        <span
          className={
            status === 'pending'
              ? 'text-amber-400'
              : status === 'conflict'
                ? 'text-orange-400'
                : status === 'error'
                  ? 'text-red-400'
                  : 'text-zinc-500'
          }
        >
          {status === 'pending'
            ? '저장 중'
            : status === 'conflict'
              ? '동기화됨'
              : status === 'error'
                ? '저장 실패'
                : '저장됨'}
        </span>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 text-zinc-100"
    >
      {children}
    </button>
  );
}

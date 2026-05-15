'use client';

import { useEffect, useRef, useState } from 'react';
import type { Layer } from '@youpd/types';
import { useDesignerStore } from './designer-store';
import {
  addLayer,
  fetchHistoryState,
  redo,
  refetchState,
  undo,
  uploadAsset,
} from './designer-actions';
import { TemplateGallery } from './template-gallery';

const ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ||
  '00000000-0000-0000-0000-000000000001';

export function Toolbar() {
  const thumbnailId = useDesignerStore((s) => s.thumbnailId);
  const version = useDesignerStore((s) => s.version);
  const canUndo = useDesignerStore((s) => s.canUndo);
  const canRedo = useDesignerStore((s) => s.canRedo);
  const replaceDoc = useDesignerStore((s) => s.replaceDoc);
  const setHistoryState = useDesignerStore((s) => s.setHistoryState);
  const status = useDesignerStore((s) => s.status);
  const [busy, setBusy] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Initial + polling history-state fetch keeps the buttons honest after
  // out-of-band edits (AI agent, other tabs). Once Realtime fires we
  // re-pull, and we also pull on a 5s interval as a safety net.
  useEffect(() => {
    if (!thumbnailId) return;
    let cancelled = false;
    const pull = async () => {
      const s = await fetchHistoryState(thumbnailId);
      if (!cancelled && s) setHistoryState(s);
    };
    void pull();
    const t = window.setInterval(pull, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [thumbnailId, version, setHistoryState]);

  const refresh = async () => {
    const state = await refetchState(thumbnailId);
    if (state) replaceDoc(state.document as never, state.version);
    const hist = await fetchHistoryState(thumbnailId);
    if (hist) setHistoryState(hist);
  };

  const addNew = async (layer: Layer) => {
    if (busy) return;
    setBusy(true);
    try {
      await addLayer({ thumbnailId, layer, expectedVersion: version });
      await refresh();
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

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setBusy(true);
    try {
      const uploaded = await uploadAsset({ orgId: ORG_ID, file });
      if (!uploaded) return;
      await addNew({
        type: 'image',
        id: `image-${Date.now().toString(36)}`,
        src: uploaded.publicUrl,
        x: 120,
        y: 120,
        width: 400,
        height: 300,
      });
    } finally {
      setBusy(false);
    }
  };

  const onUndo = async () => {
    if (!canUndo || busy) return;
    setBusy(true);
    try {
      await undo(thumbnailId);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onRedo = async () => {
    if (!canRedo || busy) return;
    setBusy(true);
    try {
      await redo(thumbnailId);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  // Keyboard shortcuts: ⌘Z / ⌘⇧Z (mac) and Ctrl+Z / Ctrl+Y (others).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        void onRedo();
      } else if (e.key === 'z') {
        e.preventDefault();
        void onUndo();
      } else if (e.key === 'y') {
        e.preventDefault();
        void onRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, canRedo, busy, thumbnailId]);

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-900 border-b border-zinc-800">
      <ToolbarButton onClick={onUndo} disabled={!canUndo || busy} title="실행 취소 (⌘Z)">↶</ToolbarButton>
      <ToolbarButton onClick={onRedo} disabled={!canRedo || busy} title="다시 실행 (⌘⇧Z)">↷</ToolbarButton>
      <Divider />
      <ToolbarButton onClick={addText} disabled={busy}>＋ 텍스트</ToolbarButton>
      <ToolbarButton onClick={addRect} disabled={busy}>＋ 사각형</ToolbarButton>
      <ToolbarButton onClick={addCircle} disabled={busy}>＋ 원</ToolbarButton>
      <ToolbarButton onClick={onPickFile} disabled={busy}>＋ 이미지</ToolbarButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={onFileChange}
      />
      <Divider />
      <ToolbarButton onClick={() => setGalleryOpen(true)} disabled={busy}>
        📐 템플릿
      </ToolbarButton>
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
      <TemplateGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onPick={(t) => {
          setGalleryOpen(false);
          // Note: current thumbnail keeps its identity; we only swap layers.
          // For MVP we redirect to a new thumbnail since apply_template creates
          // a new row. v0.5 will add "overwrite current" semantics.
          void (async () => {
            const res = await fetch('/api/mcp/thumbnail/apply-template', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                orgId: ORG_ID,
                templateCode: t.code,
                fillers: {},
                source: 'iframe',
              }),
            });
            if (res.ok) {
              const data = (await res.json()) as {
                thumbnailId: string;
                embedUrl: string;
              };
              window.location.href = data.embedUrl;
            }
          })();
        }}
      />
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-zinc-700" />;
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-100"
    >
      {children}
    </button>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Template } from '@youpd/composer-core';
import { useComposerActions } from '../store';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (template: Template) => void;
};

// Generic gallery: pulls Template[] from the host's serverActions and groups
// by aspect ratio (landscape / portrait / square) derived from canvas dims.
// Doesn't assume YouPD's 16:9/9:16 vocabulary.
export function TemplateGallery({ open, onClose, onPick }: Props) {
  const actions = useComposerActions();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState<'all' | 'landscape' | 'portrait' | 'square'>(
    'all',
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void actions.fetchTemplates().then((rows) => {
      if (!cancelled) setTemplates(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [open, actions]);

  const filtered = useMemo(() => {
    if (filter === 'all') return templates;
    return templates.filter((t) => orient(t) === filter);
  }, [templates, filter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div
        className="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-800 flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold">템플릿 갤러리</h2>
          <div className="flex gap-1">
            {(['all', 'landscape', 'portrait', 'square'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  'px-2 py-1 text-xs rounded',
                  filter === f
                    ? 'bg-blue-500/30 text-blue-100 ring-1 ring-blue-500'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
                ].join(' ')}
              >
                {f}
              </button>
            ))}
            <button
              type="button"
              onClick={onClose}
              className="ml-2 px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              닫기
            </button>
          </div>
        </header>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 overflow-y-auto">
          {filtered.map((t) => (
            <li key={t.code}>
              <button
                type="button"
                onClick={() => onPick(t)}
                className="w-full text-left rounded-lg ring-1 ring-zinc-800 overflow-hidden bg-zinc-900 hover:ring-blue-500 transition"
              >
                <div className="aspect-video bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                  {t.previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={t.previewUrl}
                      alt={t.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{t.code}</span>
                  )}
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-xs truncate">{t.title}</span>
                  <span className="text-[10px] text-zinc-500">
                    {t.canvas.width}×{t.canvas.height}
                  </span>
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="col-span-full text-center text-zinc-500 text-sm py-12">
              템플릿이 없습니다.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function orient(t: Template): 'landscape' | 'portrait' | 'square' {
  const { width, height } = t.canvas;
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

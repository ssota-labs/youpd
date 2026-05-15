'use client';

import { useEffect, useState } from 'react';
import { fetchTemplates } from './designer-actions';

type Template = {
  code: string;
  title: string;
  aspect: '16:9' | '9:16';
  previewUrl: string | null;
  tags: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (template: Template) => void;
};

// Modal showing the 16-row template catalog. Cards render the seeded preview
// URL when present; otherwise show a code label + aspect tag placeholder so
// the gallery is still usable before the preview-seed job has run.
export function TemplateGallery({ open, onClose, onPick }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState<'all' | '16:9' | '9:16'>('all');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchTemplates().then((rows) => {
      if (!cancelled) setTemplates(rows as Template[]);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;
  const filtered =
    filter === 'all' ? templates : templates.filter((t) => t.aspect === filter);

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
            {(['all', '16:9', '9:16'] as const).map((f) => (
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
                  <span className="text-[10px] text-zinc-500">{t.aspect}</span>
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

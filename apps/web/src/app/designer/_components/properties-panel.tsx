'use client';

import { useEffect, useRef, useState } from 'react';
import type { Layer, LayerPatch } from '@youpd/types';
import { useDesignerStore } from './designer-store';
import { setLayer, refetchState } from './designer-actions';

export function PropertiesPanel() {
  const thumbnailId = useDesignerStore((s) => s.thumbnailId);
  const version = useDesignerStore((s) => s.version);
  const doc = useDesignerStore((s) => s.doc);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const applyLocalPatch = useDesignerStore((s) => s.applyLocalPatch);
  const replaceDoc = useDesignerStore((s) => s.replaceDoc);

  const layer = doc.layers.find((l) => l.id === selectedId) ?? null;

  if (!layer) {
    return (
      <aside className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-500">
        레이어를 선택하면 속성이 표시됩니다.
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto">
      <header className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
        속성 · {layer.type}
      </header>
      <div className="p-3 space-y-4">
        {layer.type === 'text' ? (
          <TextSection
            key={layer.id + '-text'}
            layer={layer}
            commit={(patch) => commit(patch)}
          />
        ) : null}
        <StyleSection
          key={layer.id + '-style'}
          layer={layer}
          commit={(patch) => commit(patch)}
        />
        <PositionSection
          key={layer.id + '-pos'}
          layer={layer}
          commit={(patch) => commit(patch)}
        />
      </div>
    </aside>
  );

  async function commit(patch: LayerPatch) {
    if (!layer) return;
    applyLocalPatch(layer.id, patch);
    const res = await setLayer({
      thumbnailId,
      layerId: layer.id,
      patch,
      expectedVersion: version,
    });
    if ('conflict' in res) {
      const state = await refetchState(thumbnailId);
      if (state) replaceDoc(state.document as never, state.version);
      return;
    }
    useDesignerStore.setState({ version: res.version });
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500';

function useDebouncedCommit<T extends LayerPatch>(commit: (p: T) => void) {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (ref.current) clearTimeout(ref.current); }, []);
  return (patch: T) => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => commit(patch), 200);
  };
}

function TextSection({
  layer,
  commit,
}: {
  layer: Extract<Layer, { type: 'text' }>;
  commit: (p: LayerPatch) => void;
}) {
  const [text, setText] = useState(layer.text);
  const debouncedCommit = useDebouncedCommit(commit);
  return (
    <section className="space-y-2">
      <Field label="텍스트">
        <textarea
          className={inputCls + ' resize-y min-h-[64px]'}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            debouncedCommit({ text: e.target.value });
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="폰트 크기">
          <input
            type="number"
            className={inputCls}
            defaultValue={layer.fontSize ?? 64}
            onChange={(e) =>
              debouncedCommit({ fontSize: Number(e.target.value) || undefined })
            }
          />
        </Field>
        <Field label="가중치">
          <select
            className={inputCls}
            defaultValue={String(layer.fontWeight ?? 700)}
            onChange={(e) =>
              commit({ fontWeight: Number(e.target.value) || undefined })
            }
          >
            {[300, 400, 500, 600, 700, 800, 900].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="정렬">
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => commit({ align: a })}
              className={[
                'flex-1 py-1 text-xs rounded',
                (layer.align ?? 'left') === a
                  ? 'bg-blue-500/30 text-blue-100 ring-1 ring-blue-500'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
              ].join(' ')}
            >
              {a}
            </button>
          ))}
        </div>
      </Field>
    </section>
  );
}

function StyleSection({
  layer,
  commit,
}: {
  layer: Layer;
  commit: (p: LayerPatch) => void;
}) {
  const fill = 'fill' in layer ? (layer.fill ?? '#ffffff') : undefined;
  const stroke = 'stroke' in layer ? (layer.stroke ?? '#000000') : undefined;
  return (
    <section className="space-y-2 pt-3 border-t border-zinc-800">
      <div className="grid grid-cols-2 gap-2">
        {fill !== undefined ? (
          <Field label="채움">
            <input
              type="color"
              className="h-8 w-full bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
              defaultValue={normalizeHex(fill)}
              onChange={(e) => commit({ fill: e.target.value })}
            />
          </Field>
        ) : null}
        {stroke !== undefined ? (
          <Field label="외곽선">
            <input
              type="color"
              className="h-8 w-full bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
              defaultValue={normalizeHex(stroke)}
              onChange={(e) => commit({ stroke: e.target.value })}
            />
          </Field>
        ) : null}
      </div>
      <Field label="불투명도">
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={(layer.opacity ?? 1) * 100}
          onChange={(e) => commit({ opacity: Number(e.target.value) / 100 })}
          className="w-full"
        />
      </Field>
    </section>
  );
}

function PositionSection({
  layer,
  commit,
}: {
  layer: Layer;
  commit: (p: LayerPatch) => void;
}) {
  return (
    <section className="space-y-2 pt-3 border-t border-zinc-800">
      <div className="grid grid-cols-2 gap-2">
        <Field label="X">
          <input
            type="number"
            className={inputCls}
            defaultValue={Math.round(layer.x)}
            onChange={(e) => commit({ x: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Y">
          <input
            type="number"
            className={inputCls}
            defaultValue={Math.round(layer.y)}
            onChange={(e) => commit({ y: Number(e.target.value) || 0 })}
          />
        </Field>
        {'width' in layer && typeof layer.width === 'number' ? (
          <Field label="너비">
            <input
              type="number"
              className={inputCls}
              defaultValue={Math.round(layer.width)}
              onChange={(e) => commit({ width: Number(e.target.value) || 1 })}
            />
          </Field>
        ) : null}
        {'height' in layer && typeof layer.height === 'number' ? (
          <Field label="높이">
            <input
              type="number"
              className={inputCls}
              defaultValue={Math.round(layer.height)}
              onChange={(e) => commit({ height: Number(e.target.value) || 1 })}
            />
          </Field>
        ) : null}
        <Field label="회전(°)">
          <input
            type="number"
            className={inputCls}
            defaultValue={Math.round(layer.rotation ?? 0)}
            onChange={(e) => commit({ rotation: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>
    </section>
  );
}

function normalizeHex(c: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return (
      '#' +
      c
        .slice(1)
        .split('')
        .map((d) => d + d)
        .join('')
    );
  }
  // Fallback for named colors / rgba — color input requires #rrggbb.
  return '#ffffff';
}

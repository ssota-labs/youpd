'use client';

import dynamic from 'next/dynamic';
import type { ThumbnailDocument } from '@youpd/types';
import { Toolbar } from './toolbar';
import { LayerPanel } from './layer-panel';
import { PropertiesPanel } from './properties-panel';

type Props = {
  thumbnailId: string;
  initialVersion: number;
  initialDocument: ThumbnailDocument;
  supabaseUrl: string;
  supabaseAnonKey: string;
  name: string | null;
};

// react-konva imports DOM-only modules at parse time, so the canvas itself
// is dynamically loaded with ssr disabled.
const Canvas = dynamic(
  () => import('./designer-canvas-konva').then((m) => m.DesignerCanvas),
  { ssr: false, loading: () => <CanvasFallback /> },
);

export function DesignerShell(props: Props) {
  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <h1 className="text-sm font-semibold truncate">
          {props.name ?? '시안'}{' '}
          <span className="text-zinc-500 text-xs">
            · {props.initialDocument.aspect}
          </span>
        </h1>
      </header>
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LayerPanel />
        <main className="flex-1 overflow-auto flex items-center justify-center p-4">
          <Canvas
            thumbnailId={props.thumbnailId}
            initialVersion={props.initialVersion}
            initialDocument={props.initialDocument}
            supabaseUrl={props.supabaseUrl}
            supabaseAnonKey={props.supabaseAnonKey}
          />
        </main>
        <PropertiesPanel />
      </div>
    </div>
  );
}

function CanvasFallback() {
  return (
    <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 w-[1100px] max-w-full aspect-video flex items-center justify-center text-zinc-500 text-sm">
      캔버스 로딩 중…
    </div>
  );
}

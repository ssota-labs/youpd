'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ThumbnailDocument } from '@youpd/types';
import { Toolbar } from './toolbar';
import { LayerPanel } from './layer-panel';
import { PropertiesPanel } from './properties-panel';
import { useFontManifest } from './font-loader';

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
  // Load font manifest so @font-face is injected before any layer renders.
  useFontManifest();
  const isCoarsePointer = useIsCoarsePointer();

  if (isCoarsePointer) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 text-center">
        <h1 className="text-base font-semibold mb-2">
          데스크탑에서 편집해주세요
        </h1>
        <p className="text-xs text-zinc-400 max-w-xs">
          모바일 노션 iframe은 read-only 미리보기만 지원합니다. 데스크탑 브라우저에서
          이 페이지를 열면 레이어 편집·템플릿 선택·PNG export가 가능합니다.
        </p>
        <div className="mt-6 w-full max-w-md aspect-video rounded-lg ring-1 ring-zinc-800 bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <h1 className="text-sm font-semibold truncate">
          {props.name ?? '시안'}{' '}
          <span className="text-zinc-500 text-xs">
            · {props.initialDocument.canvas.width}×{props.initialDocument.canvas.height}
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

function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setCoarse(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return coarse;
}

function CanvasFallback() {
  return (
    <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 w-[1100px] max-w-full aspect-video flex items-center justify-center text-zinc-500 text-sm">
      캔버스 로딩 중…
    </div>
  );
}

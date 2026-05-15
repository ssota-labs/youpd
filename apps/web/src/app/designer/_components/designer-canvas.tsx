'use client';

import dynamic from 'next/dynamic';
import type { ThumbnailDocument } from '@youpd/types';

type Props = {
  thumbnailId: string;
  initialVersion: number;
  initialDocument: ThumbnailDocument;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

// react-konva imports DOM-only modules at parse time, so the entire canvas
// component is dynamically loaded with ssr disabled.
const Inner = dynamic(
  () => import('./designer-canvas-konva').then((m) => m.DesignerCanvas),
  { ssr: false, loading: () => <CanvasFallback /> },
);

export function DesignerCanvas(props: Props) {
  return <Inner {...props} />;
}

function CanvasFallback() {
  return (
    <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 w-[1100px] max-w-full aspect-video flex items-center justify-center text-zinc-500 text-sm">
      캔버스 로딩 중…
    </div>
  );
}

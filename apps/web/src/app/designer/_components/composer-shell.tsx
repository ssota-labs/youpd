'use client';

import dynamic from 'next/dynamic';
import type { Composition } from '@youpd/composer-core';
import { youpdThumbnailActions } from './thumbnail-adapter';

type Props = {
  documentId: string;
  version: number;
  document: Composition;
  name: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

// react-konva imports DOM-only modules at parse time, so the entire Composer
// is dynamically loaded with ssr disabled.
const Composer = dynamic(
  () => import('@youpd/composer-react').then((m) => m.Composer),
  { ssr: false, loading: () => <Fallback /> },
);

const thumbnailProfile = {
  id: 'thumbnail',
  canvasPresets: [
    { name: '16:9', canvas: { width: 1280, height: 720 } },
    { name: '9:16', canvas: { width: 720, height: 1280 } },
  ],
  allowedLayerTypes: ['text', 'image', 'shape'] as ('text' | 'image' | 'shape')[],
};

const ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ??
  '00000000-0000-0000-0000-000000000001';

export function ComposerShell(props: Props) {
  return (
    <Composer
      documentId={props.documentId}
      version={props.version}
      document={props.document}
      profile={thumbnailProfile}
      actions={youpdThumbnailActions}
      fontManifestUrl="/api/fonts"
      orgId={ORG_ID}
      header={
        <h1 className="text-sm font-semibold truncate">
          {props.name ?? '시안'}{' '}
          <span className="text-zinc-500 text-xs">
            · {props.document.canvas.width}×{props.document.canvas.height}
          </span>
        </h1>
      }
      realtime={{
        url: props.supabaseUrl,
        anonKey: props.supabaseAnonKey,
        channelPrefix: 'thumbnail',
      }}
    />
  );
}

function Fallback() {
  return (
    <div className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900 w-[1100px] max-w-full aspect-video flex items-center justify-center text-zinc-500 text-sm">
      캔버스 로딩 중…
    </div>
  );
}

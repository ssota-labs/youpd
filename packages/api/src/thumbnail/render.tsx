import 'server-only';
import type { Layer, ThumbnailDocument } from '@youpd/types';
import { ASPECT_DIMENSIONS } from '@youpd/types';

// Render a thumbnail document to PNG bytes using satori + resvg. Imports are
// dynamic so the package can be consumed by tests / type-only contexts
// without pulling the heavy WASM payloads into every entrypoint.
export type RenderOptions = {
  fonts?: Array<{
    name: string;
    data: ArrayBuffer | Buffer;
    weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    style?: 'normal' | 'italic';
  }>;
};

export async function renderThumbnailPng(
  doc: ThumbnailDocument,
  opts: RenderOptions = {},
): Promise<Uint8Array> {
  const { width, height } = ASPECT_DIMENSIONS[doc.aspect];

  const [{ default: satori }, { Resvg }] = await Promise.all([
    import('satori'),
    import('@resvg/resvg-js'),
  ]);

  const fonts = opts.fonts ?? (await loadDefaultFonts()) ?? [];

  const tree = renderTree(doc, width, height) as Parameters<typeof satori>[0];
  const svg = await satori(tree, { width, height, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
}

function renderTree(doc: ThumbnailDocument, width: number, height: number): unknown {
  const bg = doc.background?.color ?? '#111';
  const bgImage = doc.background?.imageUrl;
  return {
    type: 'div',
    props: {
      style: {
        position: 'relative',
        width,
        height,
        display: 'flex',
        background: bgImage
          ? `url(${bgImage}) center / cover no-repeat, ${bg}`
          : bg,
      },
      children: doc.layers.filter((l) => l.visible !== false).map(layerNode),
    },
  };
}

function dropUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function layerNode(layer: Layer): unknown {
  const base: Record<string, unknown> = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    opacity: layer.opacity ?? 1,
    display: 'flex',
  };
  if (layer.rotation) base.transform = `rotate(${layer.rotation}deg)`;
  if (layer.type === 'text') {
    return {
      type: 'div',
      key: layer.id,
      props: {
        style: dropUndefined({
          ...base,
          color: layer.fill ?? '#fff',
          fontSize: layer.fontSize ?? 64,
          fontFamily: layer.fontFamily ?? 'Pretendard',
          fontWeight: layer.fontWeight ?? 700,
          textAlign: layer.align ?? 'left',
          width: layer.width,
          lineHeight: layer.lineHeight ?? 1.1,
          letterSpacing: layer.letterSpacing,
          WebkitTextStroke: layer.stroke
            ? `${layer.strokeWidth ?? 2}px ${layer.stroke}`
            : undefined,
          whiteSpace: 'pre-wrap',
        }),
        children: layer.text,
      },
    };
  }
  if (layer.type === 'image') {
    return {
      type: 'img',
      key: layer.id,
      props: {
        src: layer.src,
        width: layer.width,
        height: layer.height,
        style: dropUndefined({
          ...base,
          objectFit: layer.fit ?? 'cover',
        }),
      },
    };
  }
  // shape
  return {
    type: 'div',
    key: layer.id,
    props: {
      style: dropUndefined({
        ...base,
        width: layer.width,
        height: layer.height,
        background: layer.fill ?? 'transparent',
        borderRadius:
          layer.shape === 'circle'
            ? Math.max(layer.width, layer.height)
            : layer.cornerRadius ?? 0,
        border: layer.stroke
          ? `${layer.strokeWidth ?? 2}px solid ${layer.stroke}`
          : undefined,
      }),
    },
  };
}

// Default font loader fetches a regular + bold weight from FONT_CDN_BASE_URL.
// Production deploys are expected to host Pretendard or Noto Sans KR on the
// configured CDN; falls back to system fonts if env is unset (text may not
// render correctly without a Korean font face).
async function loadDefaultFonts(): Promise<RenderOptions['fonts']> {
  const base = process.env.FONT_CDN_BASE_URL;
  if (!base) return [];
  const fetchFont = async (file: string): Promise<ArrayBuffer> => {
    const res = await fetch(`${base.replace(/\/$/, '')}/${file}`);
    if (!res.ok) throw new Error(`font fetch failed: ${file} ${res.status}`);
    return res.arrayBuffer();
  };
  const [regular, bold] = await Promise.all([
    fetchFont('Pretendard-Regular.otf'),
    fetchFont('Pretendard-Bold.otf'),
  ]);
  return [
    { name: 'Pretendard', data: regular, weight: 400, style: 'normal' },
    { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
  ];
}

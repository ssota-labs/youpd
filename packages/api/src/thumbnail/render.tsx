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

  const fonts = opts.fonts ?? (await loadDefaultFonts(doc)) ?? [];

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

// Font CDN convention: every family expected to be served at
//   ${FONT_CDN_BASE_URL}/${file}
// with a hard-coded manifest mirroring apps/web/src/app/api/fonts/route.ts.
// This is the server-side counterpart of that manifest; both sides must
// stay in sync (M4 plans a shared package, but for the MVP we duplicate
// the metadata to keep packages/api framework-agnostic).
type ServerFontVariant = {
  weight: 400 | 500 | 700 | 800 | 900;
  file: string;
};
type ServerFontFamily = {
  family: string;
  variants: ServerFontVariant[];
};
const FONT_MANIFEST: ServerFontFamily[] = [
  {
    family: 'Pretendard',
    variants: [
      { weight: 400, file: 'Pretendard-Regular.otf' },
      { weight: 700, file: 'Pretendard-Bold.otf' },
    ],
  },
  {
    family: 'Noto Sans KR',
    variants: [
      { weight: 400, file: 'NotoSansKR-Regular.otf' },
      { weight: 700, file: 'NotoSansKR-Bold.otf' },
    ],
  },
  {
    family: 'Black Han Sans',
    variants: [{ weight: 900, file: 'BlackHanSans-Regular.ttf' }],
  },
  {
    family: 'Jua',
    variants: [{ weight: 400, file: 'Jua-Regular.ttf' }],
  },
  {
    family: 'Do Hyeon',
    variants: [{ weight: 400, file: 'DoHyeon-Regular.ttf' }],
  },
];

// Load font binaries for every family that appears in the document, plus
// Pretendard as the default fallback. Misses (missing file, bad CDN) are
// logged but don't block render — satori will fall back to whichever font
// did load.
async function loadDefaultFonts(
  doc?: ThumbnailDocument,
): Promise<RenderOptions['fonts']> {
  const base = process.env.FONT_CDN_BASE_URL;
  if (!base) return [];

  const wanted = new Set<string>(['Pretendard']);
  if (doc) {
    for (const l of doc.layers) {
      if (l.type === 'text' && l.fontFamily) {
        wanted.add(l.fontFamily.split(',')[0]!.trim());
      }
    }
  }

  const families = FONT_MANIFEST.filter((f) => wanted.has(f.family));
  const fetchFont = async (file: string): Promise<ArrayBuffer | null> => {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/${file}`);
      if (!res.ok) return null;
      return res.arrayBuffer();
    } catch {
      return null;
    }
  };
  const results: NonNullable<RenderOptions['fonts']> = [];
  await Promise.all(
    families.flatMap((fam) =>
      fam.variants.map(async (v) => {
        const data = await fetchFont(v.file);
        if (!data) return;
        results.push({
          name: fam.family,
          data,
          weight: v.weight,
          style: 'normal',
        });
      }),
    ),
  );
  return results;
}

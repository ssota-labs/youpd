import 'server-only';
import type { Composition, Layer } from '@youpd/composer-core';

// Generic Composition → PNG renderer driven by satori (HTML/CSS-in-JS → SVG)
// and resvg (SVG → PNG). The font binaries are passed in by the host so this
// package stays free of CDN / env-variable assumptions.
export type SatoriFont = {
  name: string;
  data: ArrayBuffer | Buffer;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: 'normal' | 'italic';
};

export type RenderOptions = {
  fonts?: SatoriFont[];
};

export async function renderComposition(
  doc: Composition,
  opts: RenderOptions = {},
): Promise<Uint8Array> {
  const { width, height } = doc.canvas;

  const [{ default: satori }, { Resvg }] = await Promise.all([
    import('satori'),
    import('@resvg/resvg-js'),
  ]);

  const fonts = opts.fonts ?? [];

  const tree = renderTree(doc, width, height) as Parameters<typeof satori>[0];
  const svg = await satori(tree, { width, height, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
}

function renderTree(doc: Composition, width: number, height: number): unknown {
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

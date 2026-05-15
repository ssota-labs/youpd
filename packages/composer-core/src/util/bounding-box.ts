import type { Layer } from '../schema/layer';

export type Box = { x: number; y: number; width: number; height: number };

// A coarse box derived purely from the layer's declared fields — used as a
// fallback when the renderer hasn't measured the actual node yet. For text,
// this assumes one line at fontSize * lineHeight; the real Konva node gives
// a tighter rect via `measureTextLayer`.
export function boundingBox(layer: Layer): Box {
  if (layer.type === 'text') {
    return {
      x: layer.x,
      y: layer.y,
      width: layer.width ?? 400,
      height: (layer.fontSize ?? 64) * (layer.lineHeight ?? 1.1),
    };
  }
  return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
}

// Compute a "tight" hover box for text layers given the actual rendered
// glyph width plus the wrap width (the layer's declared `width` attribute)
// and alignment. Non-text layers return their declared rect directly.
export function tightHoverBox(args: {
  layer: Layer;
  // Renderer-supplied actual values for text. Pass null/undefined to fall
  // back to declared values.
  textWidth?: number;
  measuredHeight?: number;
  wrapWidth?: number;
}): Box {
  const { layer, textWidth, measuredHeight, wrapWidth } = args;
  if (layer.type === 'text') {
    const wrap = wrapWidth ?? layer.width ?? 0;
    const measured = textWidth ?? wrap;
    const tightWidth = Math.min(wrap, measured);
    const align = layer.align ?? 'left';
    let x = layer.x;
    if (align === 'center') x += (wrap - tightWidth) / 2;
    else if (align === 'right') x += wrap - tightWidth;
    return {
      x,
      y: layer.y,
      width: tightWidth,
      height: measuredHeight ?? (layer.fontSize ?? 64) * (layer.lineHeight ?? 1.1),
    };
  }
  return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
}

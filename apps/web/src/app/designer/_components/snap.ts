'use client';

import type { Layer } from '@youpd/types';

export type GuideLine =
  | { axis: 'v'; x: number }
  | { axis: 'h'; y: number };

export type SnapResult = {
  x: number;
  y: number;
  guides: GuideLine[];
};

const SNAP_THRESHOLD = 4;

type Anchors = {
  v: number[]; // candidate vertical lines (x coords)
  h: number[]; // candidate horizontal lines (y coords)
};

function layerWidth(layer: Layer): number {
  if (layer.type === 'text') return layer.width ?? 0;
  return layer.width;
}
function layerHeight(layer: Layer): number {
  if (layer.type === 'text') return (layer.fontSize ?? 64) * 1.2;
  return layer.height;
}

// Compute snap candidates from all layers OTHER than the one being dragged,
// plus the canvas frame. Bounds use top-left + size (rotation ignored — snap
// is meant for the common case of axis-aligned alignment).
function collectAnchors(
  layers: Layer[],
  exceptId: string,
  canvasW: number,
  canvasH: number,
): Anchors {
  const v: number[] = [0, canvasW / 2, canvasW];
  const h: number[] = [0, canvasH / 2, canvasH];
  for (const l of layers) {
    if (l.id === exceptId) continue;
    if (l.visible === false) continue;
    const w = layerWidth(l);
    const ht = layerHeight(l);
    v.push(l.x, l.x + w / 2, l.x + w);
    h.push(l.y, l.y + ht / 2, l.y + ht);
  }
  return { v, h };
}

// Given the dragged layer's prospective position (top-left x, y), find the
// nearest snap target within threshold for both axes and return the adjusted
// position + which guide lines to draw.
export function snapDrag(args: {
  layers: Layer[];
  draggedId: string;
  x: number;
  y: number;
  canvasW: number;
  canvasH: number;
  shape: { width: number; height: number };
}): SnapResult {
  const { layers, draggedId, x, y, canvasW, canvasH, shape } = args;
  const anchors = collectAnchors(layers, draggedId, canvasW, canvasH);

  // For each candidate edge of the dragged box (left/centerX/right) try to
  // snap to any anchor v line.
  const probesX = [x, x + shape.width / 2, x + shape.width];
  let bestDx = SNAP_THRESHOLD + 1;
  let snappedX = x;
  let guideX: number | null = null;
  for (let i = 0; i < probesX.length; i++) {
    for (const a of anchors.v) {
      const d = Math.abs(probesX[i]! - a);
      if (d < bestDx) {
        bestDx = d;
        snappedX = x + (a - probesX[i]!);
        guideX = a;
      }
    }
  }

  const probesY = [y, y + shape.height / 2, y + shape.height];
  let bestDy = SNAP_THRESHOLD + 1;
  let snappedY = y;
  let guideY: number | null = null;
  for (let i = 0; i < probesY.length; i++) {
    for (const a of anchors.h) {
      const d = Math.abs(probesY[i]! - a);
      if (d < bestDy) {
        bestDy = d;
        snappedY = y + (a - probesY[i]!);
        guideY = a;
      }
    }
  }

  const guides: GuideLine[] = [];
  if (bestDx <= SNAP_THRESHOLD && guideX !== null) guides.push({ axis: 'v', x: guideX });
  if (bestDy <= SNAP_THRESHOLD && guideY !== null) guides.push({ axis: 'h', y: guideY });
  return {
    x: bestDx <= SNAP_THRESHOLD ? snappedX : x,
    y: bestDy <= SNAP_THRESHOLD ? snappedY : y,
    guides,
  };
}

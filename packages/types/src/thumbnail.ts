// @youpd/types is now a thin compatibility/glue layer over @youpd/composer-core
// for YouPD's thumbnail profile. The core schema (Layer/Composition/Canvas)
// lives in composer-core so any future agent product (detail-page, etc.) can
// reuse it.
//
// The YouPD-specific aspect-enum vocabulary stays here for prompt familiarity
// (Notion AI says "16:9 / 9:16") and DB back-compat during the rename round.
import { z } from 'zod';
import {
  type Canvas,
  type Composition,
  type Layer,
  type LayerPatch,
  type Background,
} from '@youpd/composer-core';

export {
  CanvasSchema,
  CompositionSchema,
  // Back-compat alias: existing code imports ThumbnailDocumentSchema; new
  // code should reach for CompositionSchema. Removed next round.
  CompositionSchema as ThumbnailDocumentSchema,
  LayerSchema,
  TextLayerSchema,
  ImageLayerSchema,
  ShapeLayerSchema,
  LayerPatchSchema,
  BackgroundSchema,
} from '@youpd/composer-core';
export type {
  Canvas,
  Composition,
  Layer,
  LayerPatch,
  Background,
  TextLayer,
  ImageLayer,
  ShapeLayer,
} from '@youpd/composer-core';

// YouPD-specific: the two canvas presets the thumbnail profile supports.
export const AspectSchema = z.enum(['16:9', '9:16']);
export type Aspect = z.infer<typeof AspectSchema>;

export const ASPECT_DIMENSIONS: Record<Aspect, Canvas> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
};

export function aspectToCanvas(aspect: Aspect): Canvas {
  return ASPECT_DIMENSIONS[aspect];
}

export function canvasToAspect(canvas: Canvas): Aspect {
  return canvas.height > canvas.width ? '9:16' : '16:9';
}

// Transitional alias: code that still says ThumbnailDocument keeps working.
// New code should use `Composition`.
export type ThumbnailDocument = Composition;

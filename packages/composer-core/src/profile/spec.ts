import type { Canvas } from '../schema/canvas';
import type { LayerType } from '../schema/layer';

// A ProfileSpec narrows what a host product wants from the generic composer.
// A YouPD ThumbnailProfile picks 16:9 / 9:16 canvas presets and the
// thumbnail template catalog; a future detail-page profile could pick longer
// canvases and a different template set. The composer-react editor reads
// this to gate UI (allowed layer adds, canvas-size toggle, template gallery
// filter) without baking thumbnail assumptions into the package.
export interface CanvasPreset {
  name: string;
  canvas: Canvas;
}

export interface ProfileSpec {
  id: string;
  canvasPresets: CanvasPreset[];
  allowedLayerTypes: LayerType[];
  // When undefined, the profile takes any template; when set, the editor's
  // template gallery filters by this code prefix or list.
  templateCodes?: readonly string[];
}

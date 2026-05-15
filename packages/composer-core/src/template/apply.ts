import type { Composition } from '../schema/composition';
import type { Layer } from '../schema/layer';
import type { Fillers, TemplateDocument } from '../schema/template';

const PLACEHOLDER_RE = /\{(\w+)\}/g;

function substituteString(value: string, fillers: Fillers): string {
  return value.replace(PLACEHOLDER_RE, (_match, key) => {
    const replacement = fillers[key];
    return replacement === undefined ? '' : replacement;
  });
}

function substituteLayer(layer: Layer, fillers: Fillers): Layer {
  if (layer.type === 'text') {
    return { ...layer, text: substituteString(layer.text, fillers) };
  }
  if (layer.type === 'image') {
    const nextSrc = substituteString(layer.src, fillers);
    return nextSrc === layer.src ? layer : { ...layer, src: nextSrc };
  }
  return layer;
}

// Resolve template placeholders ({headline}, {accent}, {face_image}, …) against
// caller fillers. Missing keys collapse to empty strings.
export function applyTemplate(
  template: TemplateDocument,
  fillers: Fillers,
): Composition {
  return {
    canvas: template.canvas,
    background: template.background,
    layers: template.layers.map((layer) => substituteLayer(layer, fillers)),
  };
}

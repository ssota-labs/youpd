import type { Fillers, Layer, TemplateDocument, ThumbnailDocument } from '@youpd/types';

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
// caller fillers. Missing keys collapse to empty strings (per spec §4-1).
export function applyTemplate(
  template: TemplateDocument,
  fillers: Fillers,
): ThumbnailDocument {
  return {
    aspect: template.aspect,
    background: template.background,
    layers: template.layers.map((layer) => substituteLayer(layer, fillers)),
  };
}

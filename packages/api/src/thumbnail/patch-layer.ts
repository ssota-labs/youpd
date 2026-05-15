import { LayerPatchSchema, LayerSchema, type Layer, type LayerPatch } from '@youpd/types';

export class InvalidLayerPatchError extends Error {
  override readonly name = 'InvalidLayerPatchError';
  constructor(message: string) {
    super(message);
  }
}

export class LayerNotFoundError extends Error {
  override readonly name = 'LayerNotFoundError';
  constructor(public readonly layerId: string) {
    super(`layer ${layerId} not found`);
  }
}

// Apply a partial patch to one layer, validating the merged result against
// the discriminated Layer schema. Throws InvalidLayerPatchError when the
// patch makes the layer invalid (e.g. bad enum value, wrong type field).
export function applyLayerPatch(layers: Layer[], layerId: string, patch: LayerPatch): Layer[] {
  const parsed = LayerPatchSchema.safeParse(patch);
  if (!parsed.success) {
    throw new InvalidLayerPatchError(parsed.error.message);
  }
  const idx = layers.findIndex((l) => l.id === layerId);
  if (idx < 0) throw new LayerNotFoundError(layerId);
  const merged = { ...layers[idx], ...parsed.data } as unknown;
  const validated = LayerSchema.safeParse(merged);
  if (!validated.success) {
    throw new InvalidLayerPatchError(validated.error.message);
  }
  const next = layers.slice();
  next[idx] = validated.data;
  return next;
}

export function addLayer(layers: Layer[], layer: Layer): Layer[] {
  const parsed = LayerSchema.safeParse(layer);
  if (!parsed.success) {
    throw new InvalidLayerPatchError(parsed.error.message);
  }
  if (layers.some((l) => l.id === parsed.data.id)) {
    throw new InvalidLayerPatchError(`layer id ${parsed.data.id} already exists`);
  }
  return [...layers, parsed.data];
}

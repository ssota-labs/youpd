import { describe, expect, it } from 'vitest';
import { addLayer, applyLayerPatch, InvalidLayerPatchError, LayerNotFoundError } from './patch-layer';
import type { Layer } from '@youpd/types';

const layers: Layer[] = [
  {
    type: 'text',
    id: 'headline',
    text: 'hello',
    x: 0,
    y: 0,
    fontSize: 72,
    fill: '#fff',
  },
];

describe('applyLayerPatch', () => {
  it('merges valid patch', () => {
    const out = applyLayerPatch(layers, 'headline', { text: 'world', x: 50 });
    expect(out[0]).toMatchObject({ text: 'world', x: 50 });
  });

  it('throws LayerNotFoundError for unknown id', () => {
    expect(() => applyLayerPatch(layers, 'nope', { text: 'x' })).toThrow(
      LayerNotFoundError,
    );
  });

  it('rejects invalid patch values', () => {
    expect(() =>
      applyLayerPatch(layers, 'headline', { fontSize: -10 }),
    ).toThrow(InvalidLayerPatchError);
  });
});

describe('addLayer', () => {
  it('appends a valid layer', () => {
    const out = addLayer(layers, {
      type: 'text',
      id: 'subcopy',
      text: 'sub',
      x: 0,
      y: 100,
    });
    expect(out).toHaveLength(2);
  });

  it('rejects duplicate id', () => {
    expect(() =>
      addLayer(layers, {
        type: 'text',
        id: 'headline',
        text: 'dup',
        x: 0,
        y: 0,
      }),
    ).toThrow(InvalidLayerPatchError);
  });
});

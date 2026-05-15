import { describe, expect, it } from 'vitest';
import {
  addLayer,
  applyLayerPatch,
  deleteLayer,
  reorderLayers,
  InvalidLayerOrderError,
  InvalidLayerPatchError,
  LayerNotFoundError,
} from './patch';
import type { Layer } from '../schema/layer';

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

describe('deleteLayer', () => {
  it('removes the matched layer', () => {
    const out = deleteLayer(layers, 'headline');
    expect(out).toHaveLength(0);
  });
  it('throws LayerNotFoundError on missing id', () => {
    expect(() => deleteLayer(layers, 'nope')).toThrow(LayerNotFoundError);
  });
});

describe('reorderLayers', () => {
  const multi: Layer[] = [
    { type: 'text', id: 'a', text: 'a', x: 0, y: 0 },
    { type: 'text', id: 'b', text: 'b', x: 0, y: 0 },
    { type: 'text', id: 'c', text: 'c', x: 0, y: 0 },
  ];
  it('reorders by id sequence', () => {
    const out = reorderLayers(multi, ['c', 'a', 'b']);
    expect(out.map((l) => l.id)).toEqual(['c', 'a', 'b']);
  });
  it('rejects partial permutations', () => {
    expect(() => reorderLayers(multi, ['a', 'b'])).toThrow(InvalidLayerOrderError);
  });
  it('rejects unknown ids', () => {
    expect(() => reorderLayers(multi, ['a', 'b', 'z'])).toThrow(
      InvalidLayerOrderError,
    );
  });
});

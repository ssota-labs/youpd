import { describe, expect, it } from 'vitest';
import { applyTemplate } from './apply';
import type { TemplateDocument } from '../schema/template';

const sample: TemplateDocument = {
  canvas: { width: 1280, height: 720 },
  background: { color: '#000' },
  layers: [
    {
      type: 'text',
      id: 'headline',
      text: '{headline}',
      x: 0,
      y: 0,
      fontSize: 72,
    },
    {
      type: 'text',
      id: 'accent',
      text: 'accent: {accent}, missing: {nope}',
      x: 0,
      y: 100,
    },
  ],
};

describe('applyTemplate', () => {
  it('substitutes placeholders', () => {
    const out = applyTemplate(sample, {
      headline: '무릎통증 90%',
      accent: '90%',
    });
    expect(out.layers[0]).toMatchObject({
      type: 'text',
      text: '무릎통증 90%',
    });
    expect(out.layers[1]).toMatchObject({
      type: 'text',
      text: 'accent: 90%, missing: ',
    });
  });

  it('preserves non-text layers', () => {
    const doc: TemplateDocument = {
      canvas: { width: 1280, height: 720 },
      layers: [
        {
          type: 'shape',
          id: 'box',
          shape: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fill: '#fff',
        },
      ],
    };
    const out = applyTemplate(doc, {});
    expect(out.layers[0]).toMatchObject({ type: 'shape', shape: 'rect' });
  });
});

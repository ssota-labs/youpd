import { describe, expect, it } from 'vitest';

import type { TableKey } from './schema.js';
import {
  CANONICAL,
  expectationsForTable,
  validateCanonicalSchema,
  type DataSourceSchema,
} from './schema.js';

/** Synthetic map matching Notion retrieve shape (uuid keys irrelevant). */
function minimalValidSchema(table: TableKey): DataSourceSchema {
  const exps = expectationsForTable(table);
  const out: DataSourceSchema = {};
  let i = 0;
  for (const exp of exps) {
    const primary = exp.types[0];
    if (!primary) throw new Error(`${table}: expectation has empty types`);
    out[`_${i}`] = { id: `prop_${i}`, name: exp.name, type: primary };
    i += 1;
  }
  return out;
}

const TABLES: TableKey[] = [
  'videos',
  'channels',
  'videoSnapshots',
  'channelSnapshots',
  'comments',
  'keywords',
  'hotVideoDaily',
  'keywordIdeas',
];

describe('validateCanonicalSchema', () => {
  it('accepts a minimal schema for every canonical table', () => {
    for (const table of TABLES) {
      const r = validateCanonicalSchema(table, minimalValidSchema(table));
      expect(r, table).toEqual({ ok: true });
    }
  });

  it('reports a missing Videos property', () => {
    const s = minimalValidSchema('videos');
    const titleKey = Object.keys(s).find(
      (k) => s[k]!.name === CANONICAL.videos.title,
    );
    expect(titleKey).toBeDefined();
    delete s[titleKey!];
    const r = validateCanonicalSchema('videos', s);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain(CANONICAL.videos.title);
      expect(r.message).toContain('missing');
    }
  });

  it('reports a wrong-type Videos property', () => {
    const s = minimalValidSchema('videos');
    const titleKey = Object.keys(s).find(
      (k) => s[k]!.name === CANONICAL.videos.title,
    );
    expect(titleKey).toBeDefined();
    s[titleKey!] = {
      ...s[titleKey!]!,
      type: 'rich_text',
    };
    const r = validateCanonicalSchema('videos', s);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain(CANONICAL.videos.title);
      expect(r.message).toContain('expected');
    }
  });

  it('flags missing Keyword relation columns', () => {
    const s = minimalValidSchema('keywords');
    const vk = Object.keys(s).find(
      (k) => s[k]!.name === CANONICAL.keywords.videosRelation,
    );
    expect(vk).toBeDefined();
    delete s[vk!];
    const r = validateCanonicalSchema('keywords', s);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain(CANONICAL.keywords.videosRelation);
    }
  });

  it('flags missing 트래킹 슬롯 on Keyword Ideas', () => {
    const s = minimalValidSchema('keywordIdeas');
    const slotKey = Object.keys(s).find(
      (k) => s[k]!.name === CANONICAL.keywordIdeas.trackingSlot,
    );
    expect(slotKey).toBeDefined();
    delete s[slotKey!];
    const r = validateCanonicalSchema('keywordIdeas', s);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain(CANONICAL.keywordIdeas.trackingSlot);
    }
  });

  it('accepts 다음 검색 예정일 as either formula or date', () => {
    const s = minimalValidSchema('keywordIdeas');
    const key = Object.keys(s).find(
      (k) => s[k]!.name === CANONICAL.keywordIdeas.nextSearchAt,
    );
    expect(key).toBeDefined();
    s[key!] = { ...s[key!]!, type: 'date' };
    const asDate = validateCanonicalSchema('keywordIdeas', s);
    expect(asDate).toEqual({ ok: true });
    s[key!] = { ...s[key!]!, type: 'formula' };
    const asFormula = validateCanonicalSchema('keywordIdeas', s);
    expect(asFormula).toEqual({ ok: true });
  });
});

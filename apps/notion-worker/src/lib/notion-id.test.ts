import { describe, expect, it } from 'vitest';
import { normalizeNotionPageId } from './notion-id.js';

const DASHED = 'c0fb4d20-cefb-4318-90b7-a73896bc0c78';
const HEX = 'c0fb4d20cefb431890b7a73896bc0c78';

describe('normalizeNotionPageId', () => {
  it('passes through canonical dashed UUID', () => {
    expect(normalizeNotionPageId(DASHED)).toBe(DASHED);
  });

  it('expands a 32-char hex id to dashed UUID', () => {
    expect(normalizeNotionPageId(HEX)).toBe(DASHED);
  });

  it('extracts from a compact Notion URL', () => {
    expect(
      normalizeNotionPageId(`https://www.notion.so/${HEX}`),
    ).toBe(DASHED);
  });

  it('extracts from a workspace-prefixed slug URL', () => {
    expect(
      normalizeNotionPageId(
        `https://www.notion.so/Workspace/Some-Title-${HEX}`,
      ),
    ).toBe(DASHED);
  });

  it('extracts from a slug URL with already-dashed UUID + query', () => {
    expect(
      normalizeNotionPageId(
        `https://www.notion.so/Title-${DASHED}?pvs=21`,
      ),
    ).toBe(DASHED);
  });

  it('extracts from `paxhumana` style workspace URL', () => {
    expect(
      normalizeNotionPageId(
        'https://www.notion.so/paxhumana/c0fb4d20cefb431890b7a73896bc0c78',
      ),
    ).toBe(DASHED);
  });

  it('lowercases mixed-case ids', () => {
    expect(normalizeNotionPageId(DASHED.toUpperCase())).toBe(DASHED);
    expect(normalizeNotionPageId(HEX.toUpperCase())).toBe(DASHED);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeNotionPageId(`   ${HEX}   `)).toBe(DASHED);
  });

  it('throws on empty input', () => {
    expect(() => normalizeNotionPageId('')).toThrow(/empty/);
    expect(() => normalizeNotionPageId('   ')).toThrow(/empty/);
  });

  it('throws when no hex run is present', () => {
    expect(() => normalizeNotionPageId('not-an-id')).toThrow(
      /Cannot extract Notion page id/,
    );
    expect(() => normalizeNotionPageId('https://example.com/foo')).toThrow(
      /Cannot extract Notion page id/,
    );
  });

  it('prefers an embedded dashed UUID over a stray hex run', () => {
    // Pathological case: a slug contains an unrelated 32-hex string, but
    // the real page id is the dashed form later in the URL.
    const slug = 'a'.repeat(32);
    const url = `https://www.notion.so/${slug}-${DASHED}`;
    expect(normalizeNotionPageId(url)).toBe(DASHED);
  });
});

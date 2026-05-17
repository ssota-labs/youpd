import { afterEach, describe, expect, it } from 'vitest';
import {
  ALL_SCHEMAS,
  BUNDLE_VERSION,
  CHANGELOG,
  getBundleManifest,
  getLatestVersion,
  getLatestVersionSchema,
  SCHEMA_VERSION,
} from './index';

describe('version manifest', () => {
  it('exposes BUNDLE_VERSION 1.4.0 with SCHEMA_VERSION 1.0.0', () => {
    expect(BUNDLE_VERSION).toBe('1.4.0');
    expect(SCHEMA_VERSION).toBe('1.0.0');
  });

  it('getLatestVersion returns the same triplet every call', () => {
    expect(getLatestVersion()).toEqual(getLatestVersion());
    expect(getLatestVersion()).toMatchObject({
      version: '1.4.0',
      schema_version: '1.0.0',
    });
  });

  it('CHANGELOG includes 1.4.0 (newest), 1.3.0, 1.2.0, 1.1.0 and 1.0.0 entries in order', () => {
    expect(CHANGELOG.length).toBeGreaterThanOrEqual(5);
    expect(CHANGELOG[0]!.version).toBe('1.4.0');
    expect(CHANGELOG[1]!.version).toBe('1.3.0');
    expect(CHANGELOG[2]!.version).toBe('1.2.0');
    expect(CHANGELOG[3]!.version).toBe('1.1.0');
    expect(CHANGELOG.at(-1)!.version).toBe('1.0.0');
  });

  it('CHANGELOG 1.4.0 entry documents REST route removal and Worker rename', () => {
    const notes = CHANGELOG[0]!.notes.join('\n');
    expect(notes).toContain('schema/latest');
    expect(notes).toContain('snapshotVideos');
  });

  it('CHANGELOG 1.3.0 entry documents MCP simplification', () => {
    const entry = CHANGELOG.find((c) => c.version === '1.3.0');
    expect(entry).toBeDefined();
    const notes = entry!.notes.join('\n');
    expect(notes).toContain('get_skill_group');
    expect(notes).toContain('MCP');
  });

  it('CHANGELOG 1.2.0 entry mentions Progressive MCP (historical)', () => {
    const entry = CHANGELOG.find((c) => c.version === '1.2.0');
    expect(entry).toBeDefined();
    const notes = entry!.notes.join('\n');
    expect(notes).toContain('get_skill_group');
    expect(notes).toContain('Progressive MCP');
  });

  it('CHANGELOG 1.1.0 entry enumerates the 15 expected MCP tools', () => {
    const entry = CHANGELOG.find((c) => c.version === '1.1.0');
    expect(entry).toBeDefined();
    const notes = entry!.notes.join('\n');
    for (const tool of [
      'search_keyword',
      'get_video_detail',
      'get_channel_overview',
      'get_channel_all_videos',
      'get_video_comments',
      'fetch_hot_chart',
      'fetch_trending_by_keyword',
      'snapshot_now',
      'compute_metrics',
      'notion_create_key_candidate',
      'notion_create_pull_candidate',
      'search_sessions_summary',
      'get_latest_version',
      'get_latest_version_schema',
      'get_bundle_manifest',
    ]) {
      expect(notes).toContain(tool);
    }
  });

  it('CHANGELOG 1.0.0 entry enumerates the original 14 MCP tools', () => {
    const entry = CHANGELOG.find((c) => c.version === '1.0.0');
    expect(entry).toBeDefined();
    const notes = entry!.notes.join('\n');
    for (const tool of [
      'search_keyword',
      'get_video_detail',
      'get_channel_overview',
      'get_channel_all_videos',
      'get_video_comments',
      'fetch_hot_chart',
      'fetch_trending_by_keyword',
      'snapshot_now',
      'compute_metrics',
      'notion_create_key_candidate',
      'notion_create_pull_candidate',
      'get_latest_version',
      'get_latest_version_schema',
      'get_bundle_manifest',
    ]) {
      expect(notes).toContain(tool);
    }
  });

  it('ships 11 Notion DB schemas with unique keys', () => {
    expect(ALL_SCHEMAS).toHaveLength(11);
    const keys = ALL_SCHEMAS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every schema has a title property exactly once', () => {
    for (const schema of ALL_SCHEMAS) {
      const titles = schema.properties.filter((p) => p.schema.type === 'title');
      expect(titles, `schema ${schema.key} must have one title`).toHaveLength(1);
    }
  });

  it('getLatestVersionSchema() returns all 11 databases', () => {
    const res = getLatestVersionSchema();
    expect('databases' in res).toBe(true);
    if ('databases' in res) {
      expect(res.databases).toHaveLength(11);
    }
  });

  it('getLatestVersionSchema("videos") returns single db', () => {
    const res = getLatestVersionSchema('videos');
    expect('database' in res).toBe(true);
    if ('database' in res) {
      expect(res.database.key).toBe('videos');
    }
  });

  it('getLatestVersionSchema rejects unknown db_name', () => {
    expect(() => getLatestVersionSchema('nope')).toThrow(/unknown db_name/i);
  });

  describe('relation database_refs all point at known schemas', () => {
    const known = new Set(ALL_SCHEMAS.map((s) => s.key));
    for (const schema of ALL_SCHEMAS) {
      for (const prop of schema.properties) {
        if (prop.schema.type !== 'relation') continue;
        const target = prop.schema.relation.database_ref;
        it(`${schema.key}.${prop.name} → ${target}`, () => {
          expect(known.has(target)).toBe(true);
        });
      }
    }
  });

  describe('getBundleManifest', () => {
    const previousTemplate = process.env.BUNDLE_TEMPLATE_URL;
    const previousResource = process.env.MCP_OAUTH_RESOURCE;
    afterEach(() => {
      if (previousTemplate !== undefined) {
        process.env.BUNDLE_TEMPLATE_URL = previousTemplate;
      } else {
        delete process.env.BUNDLE_TEMPLATE_URL;
      }
      if (previousResource !== undefined) {
        process.env.MCP_OAUTH_RESOURCE = previousResource;
      } else {
        delete process.env.MCP_OAUTH_RESOURCE;
      }
    });

    it('returns template_url null when env var is unset', () => {
      delete process.env.BUNDLE_TEMPLATE_URL;
      delete process.env.MCP_OAUTH_RESOURCE;
      const manifest = getBundleManifest();
      expect(manifest.template_url).toBeNull();
      expect(manifest.healthcheck_url).toBeNull();
      expect(manifest.bundle_version).toBe('1.4.0');
    });

    it('derives healthcheck_url from MCP_OAUTH_RESOURCE', () => {
      process.env.BUNDLE_TEMPLATE_URL = 'https://notion.so/template';
      process.env.MCP_OAUTH_RESOURCE = 'https://mcp.youpd.app/api/mcp';
      const manifest = getBundleManifest();
      expect(manifest.template_url).toBe('https://notion.so/template');
      expect(manifest.healthcheck_url).toBe('https://mcp.youpd.app/api/health');
    });
  });
});

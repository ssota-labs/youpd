import { describe, expect, it } from 'vitest';
import {
  ALL_GROUP_CODES,
  GROUP_DOCS,
  TOOL_DOCS,
  TOOL_DOCS_BY_NAME,
  buildSkillGroupResponse,
  buildSkillGroupRoutingDescription,
  getToolsForGroup,
} from './index';
import { SkillGroupCodeSchema } from './types';

describe('progressive skill groups', () => {
  it('defines 7 groups exactly', () => {
    expect(ALL_GROUP_CODES).toHaveLength(7);
    expect(new Set(ALL_GROUP_CODES).size).toBe(7);
    for (const code of ALL_GROUP_CODES) {
      expect(SkillGroupCodeSchema.options).toContain(code);
    }
  });

  it('every group has non-empty when_to_use, description and example_intents', () => {
    for (const code of ALL_GROUP_CODES) {
      const g = GROUP_DOCS[code];
      expect(g.code).toBe(code);
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
      expect(g.when_to_use.length).toBeGreaterThan(0);
      expect(g.example_intents.length).toBeGreaterThan(0);
    }
  });

  it('REPORT is trigger_only and THUMB is reserved', () => {
    expect(GROUP_DOCS.REPORT.status).toBe('trigger_only');
    expect(GROUP_DOCS.THUMB.status).toBe('reserved');
  });
});

describe('progressive tool registry', () => {
  it('every tool doc has a defined group_code in ALL_GROUP_CODES', () => {
    for (const doc of TOOL_DOCS) {
      expect(ALL_GROUP_CODES).toContain(doc.group_code);
    }
  });

  it('every tool name is unique', () => {
    const names = TOOL_DOCS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('TOOL_DOCS_BY_NAME map round-trips every tool', () => {
    for (const doc of TOOL_DOCS) {
      expect(TOOL_DOCS_BY_NAME.get(doc.name)).toBe(doc);
    }
  });

  it('every tool has both a short and long description', () => {
    for (const doc of TOOL_DOCS) {
      expect(doc.short_description.length).toBeGreaterThan(0);
      expect(doc.long_description.length).toBeGreaterThan(0);
    }
  });

  it('short_descriptions stay under 200 chars to keep tools/list compact', () => {
    for (const doc of TOOL_DOCS) {
      expect(
        doc.short_description.length,
        `${doc.name} short_description should be <= 200 chars`,
      ).toBeLessThanOrEqual(200);
    }
  });

  it('SYS group includes the version + manifest + audit tools', () => {
    const names = getToolsForGroup('SYS').map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'get_bundle_manifest',
        'get_latest_version',
        'get_latest_version_schema',
        'search_sessions_summary',
      ].sort(),
    );
  });

  it('COLLECT group includes the 3 collection tools', () => {
    const names = getToolsForGroup('COLLECT').map((t) => t.name).sort();
    expect(names).toEqual(
      ['fetch_hot_chart', 'fetch_trending_by_keyword', 'search_keyword'].sort(),
    );
  });

  it('METRIC group includes the 5 metric tools', () => {
    const names = getToolsForGroup('METRIC').map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'compute_metrics',
        'get_channel_all_videos',
        'get_channel_overview',
        'get_video_detail',
        'snapshot_now',
      ].sort(),
    );
  });

  it('COMMENT group includes get_video_comments', () => {
    expect(getToolsForGroup('COMMENT').map((t) => t.name)).toEqual([
      'get_video_comments',
    ]);
  });

  it('PLAN group includes both candidate builders', () => {
    const names = getToolsForGroup('PLAN').map((t) => t.name).sort();
    expect(names).toEqual(
      ['notion_create_key_candidate', 'notion_create_pull_candidate'].sort(),
    );
  });

  it('REPORT and THUMB groups have no tools in v0.3', () => {
    expect(getToolsForGroup('REPORT')).toEqual([]);
    expect(getToolsForGroup('THUMB')).toEqual([]);
  });
});

describe('buildSkillGroupRoutingDescription', () => {
  it('mentions every group code', () => {
    const desc = buildSkillGroupRoutingDescription();
    for (const code of ALL_GROUP_CODES) {
      expect(desc).toContain(code);
    }
  });

  it('marks REPORT as trigger-only and THUMB as v0.4 reserved', () => {
    const desc = buildSkillGroupRoutingDescription();
    expect(desc).toMatch(/REPORT[\s\S]*트리거 전용/);
    expect(desc).toMatch(/THUMB[\s\S]*v0\.4/);
  });
});

describe('buildSkillGroupResponse', () => {
  it('returns tools for COMMENT group', () => {
    const out = buildSkillGroupResponse('COMMENT');
    expect(out.code).toBe('COMMENT');
    expect(out.status).toBe('available');
    expect(out.tools.map((t) => t.name)).toEqual(['get_video_comments']);
    expect(out.tools[0]!.when_to_use.length).toBeGreaterThan(0);
  });

  it('returns reserved status with empty tools for THUMB', () => {
    const out = buildSkillGroupResponse('THUMB');
    expect(out.status).toBe('reserved');
    expect(out.tools).toEqual([]);
    expect(out.notes).toMatch(/v0\.4/);
  });

  it('returns trigger_only status with empty tools for REPORT', () => {
    const out = buildSkillGroupResponse('REPORT');
    expect(out.status).toBe('trigger_only');
    expect(out.tools).toEqual([]);
    expect(out.notes).toMatch(/트리거|호출 금지/);
  });

  it('every tool name returned by buildSkillGroupResponse exists in TOOL_DOCS_BY_NAME', () => {
    for (const code of ALL_GROUP_CODES) {
      const out = buildSkillGroupResponse(code);
      for (const tool of out.tools) {
        expect(TOOL_DOCS_BY_NAME.has(tool.name)).toBe(true);
      }
    }
  });
});

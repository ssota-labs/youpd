import { ALL_SCHEMAS, SCHEMA_BY_KEY } from './schemas/index';
import type { ChangelogEntry, NotionDatabaseSchema } from './types';

// Single source of truth for schema + bundle version. The bundle version
// covers the agent template + MCP tool set; the schema version covers the
// Notion DB structures. They are bumped in lockstep for v1.x.
export const SCHEMA_VERSION = '1.0.0';
export const BUNDLE_VERSION = '1.4.0';
export const BUNDLE_RELEASED_AT = '2026-05-16T00:00:00Z';

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.4.0',
    released_at: BUNDLE_RELEASED_AT,
    notes: [
      'Removed REST meta routes: GET /api/youpd/rest/schema/latest and GET /api/youpd/rest/bundle/manifest (schema/bundle helpers remain in @youpd/api for tests/internal callers)',
      'Notion Worker: renamed worker tool snapshotTrackedVideos → snapshotVideos',
    ],
  },
  {
    version: '1.3.0',
    released_at: '2026-05-15T00:00:00Z',
    notes: [
      'v0.6+ MCP surface simplification: removed ping, get_skill_group, get_latest_version, get_latest_version_schema, get_bundle_manifest, notion_create_key_candidate, notion_create_pull_candidate from MCP tools/list',
      'Schema + bundle manifest remain on REST: GET /api/youpd/rest/schema/latest and GET /api/youpd/rest/bundle/manifest',
      'Removed Progressive MCP module from the API package; MCP server uses inline short descriptions per tool',
      'No Notion DB schema version bump',
    ],
  },
  {
    version: '1.2.0',
    released_at: '2026-06-15T00:00:00Z',
    notes: [
      'Product release v0.3 — Progressive MCP module',
      'New core tool: get_skill_group (skill-group routing entry point)',
      '7 skill groups defined: SYS, COLLECT, METRIC, COMMENT, PLAN, REPORT, THUMB (reserved for v0.4)',
      'Existing 15 tool descriptions trimmed to one-liners; rich docs delivered via get_skill_group response',
      'Stateless design — no session storage or dynamic tools/list filtering',
      'No Notion DB schema changes',
    ],
  },
  {
    version: '1.1.0',
    released_at: '2026-06-01T00:00:00Z',
    notes: [
      'v0.2 — OAuth AS migrated to Supabase OAuth Server; verify-token now validates JWT via JWKS (issuer + audience RFC 8707 + mcp scope).',
      'New MCP tool: search_sessions_summary (server-wide audit aggregation, 0 YouTube units).',
      '15 MCP tools: search_keyword, get_video_detail, get_channel_overview, get_channel_all_videos, get_video_comments, fetch_hot_chart, fetch_trending_by_keyword, snapshot_now, compute_metrics, notion_create_key_candidate, notion_create_pull_candidate, search_sessions_summary, get_latest_version, get_latest_version_schema, get_bundle_manifest',
    ],
  },
  {
    version: '1.0.0',
    released_at: '2026-05-26T00:00:00Z',
    notes: [
      'Initial public release of YouPD MCP server',
      '14 MCP tools: search_keyword, get_video_detail, get_channel_overview, get_channel_all_videos, get_video_comments, fetch_hot_chart, fetch_trending_by_keyword, snapshot_now, compute_metrics, notion_create_key_candidate, notion_create_pull_candidate, get_latest_version, get_latest_version_schema, get_bundle_manifest',
      '11 Notion DB schemas (Keywords, Channels, Videos, Video Snapshots, Channel Snapshots, Comments, Key/Pull Content Candidates, Search Sessions, Hot Video Daily, Agent Meta)',
    ],
  },
];

export function getLatestVersion(): {
  version: string;
  schema_version: string;
  released_at: string;
} {
  return {
    version: BUNDLE_VERSION,
    schema_version: SCHEMA_VERSION,
    released_at: BUNDLE_RELEASED_AT,
  };
}

export function getLatestVersionSchema(dbName?: string):
  | { databases: NotionDatabaseSchema[] }
  | { database: NotionDatabaseSchema } {
  if (!dbName) return { databases: ALL_SCHEMAS };
  const found = SCHEMA_BY_KEY.get(dbName);
  if (!found) {
    throw new Error(
      `Unknown db_name "${dbName}". Available: ${Array.from(SCHEMA_BY_KEY.keys()).join(', ')}`,
    );
  }
  return { database: found };
}

export function getBundleManifest(): {
  bundle_version: string;
  schema_version: string;
  released_at: string;
  template_url: string | null;
  healthcheck_url: string | null;
  changelog: ChangelogEntry[];
} {
  return {
    bundle_version: BUNDLE_VERSION,
    schema_version: SCHEMA_VERSION,
    released_at: BUNDLE_RELEASED_AT,
    template_url: process.env.BUNDLE_TEMPLATE_URL || null,
    healthcheck_url: process.env.MCP_OAUTH_RESOURCE
      ? `${process.env.MCP_OAUTH_RESOURCE.replace(/\/api\/mcp$/, '')}/api/health`
      : null,
    changelog: CHANGELOG,
  };
}

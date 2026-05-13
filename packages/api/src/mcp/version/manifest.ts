import { ALL_SCHEMAS, SCHEMA_BY_KEY } from './schemas/index';
import type { ChangelogEntry, NotionDatabaseSchema } from './types';

// Single source of truth for schema + bundle version. The bundle version
// covers the agent template + MCP tool set; the schema version covers the
// Notion DB structures. They are bumped in lockstep for v1.x.
export const SCHEMA_VERSION = '1.0.0';
export const BUNDLE_VERSION = '1.0.0';
export const BUNDLE_RELEASED_AT = '2026-05-26T00:00:00Z';

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    released_at: BUNDLE_RELEASED_AT,
    notes: [
      'Initial public release of YouPD MCP server',
      '5 MCP tools: search_keyword, get_video_detail, get_latest_version, get_latest_version_schema, get_bundle_manifest',
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

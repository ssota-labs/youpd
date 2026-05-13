import type { NotionDatabaseSchema } from '../types';
import { agentMetaSchema } from './agentMeta';
import { channelSnapshotsSchema } from './channelSnapshots';
import { channelsSchema } from './channels';
import { commentsSchema } from './comments';
import { hotVideoDailySchema } from './hotVideoDaily';
import { keyContentCandidatesSchema } from './keyContentCandidates';
import { keywordsSchema } from './keywords';
import { pullContentCandidatesSchema } from './pullContentCandidates';
import { searchSessionsSchema } from './searchSessions';
import { videoSnapshotsSchema } from './videoSnapshots';
import { videosSchema } from './videos';

// Ordered list — agents iterate this when bootstrapping so that relation
// targets exist before relations referencing them are created.
export const ALL_SCHEMAS: NotionDatabaseSchema[] = [
  keywordsSchema,
  channelsSchema,
  videosSchema,
  videoSnapshotsSchema,
  channelSnapshotsSchema,
  commentsSchema,
  keyContentCandidatesSchema,
  pullContentCandidatesSchema,
  searchSessionsSchema,
  hotVideoDailySchema,
  agentMetaSchema,
];

export const SCHEMA_BY_KEY: ReadonlyMap<string, NotionDatabaseSchema> = new Map(
  ALL_SCHEMAS.map((s) => [s.key, s]),
);

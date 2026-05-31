import {
  getLatestScoreForPost,
  getSocialPostById,
  getSocialPostByPermalinkHash,
  getSocialSource,
  insertReferenceFolderSocialPost,
  insertSocialMetricSnapshot,
  insertSocialPost,
  insertSocialPostScore,
  listMetricSnapshotsForPost,
  listReferenceFolderSocialPosts,
  listSocialPosts,
  listSocialSources,
  deleteReferenceFolderSocialPost,
} from '@youpd/supabase/repositories/social';
import { getReferenceFolder, touchReferenceGroupUpdatedAt } from '@youpd/supabase/repositories/reference-folders';
import {
  AddReferenceSocialPostInputSchema,
  ConsumerStageSchema,
  IngestSocialManualInputSchema,
  IngestSocialUrlInputSchema,
  ReferenceFolderSocialPostItemSchema,
  SocialPostDetailSchema,
  SocialPostMetricsSchema,
  SocialPostSummarySchema,
  SocialSourceSummarySchema,
  type ConsumerStage,
  type IngestSocialManualInput,
  type IngestSocialUrlInput,
  type ScoreGrade,
  type SocialPostDetail,
  type SocialPostMetrics,
  type SocialPostSummary,
  type SocialProvider,
} from '@youpd/types';
import { loadSocialFixture, shouldUseSocialFixtures } from './load-social-fixture';
import { normaliseSocialPermalink, SocialUrlError } from './normalise-social-permalink';
import { computeSocialScoreV1, SOCIAL_SCORE_POLICY_VERSION } from './social-score-v1';
import { socialLineageFromScoredPost } from './social-lineage';

export class SocialPostsError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'VALIDATION'
      | 'DUPLICATE'
      | 'UNSUPPORTED_URL'
      | 'NOT_CONFIGURED'
      | 'FETCH_FAILED',
  ) {
    super(message);
    this.name = 'SocialPostsError';
  }
}

function textPreview(text: string, max = 120) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function parseMetrics(raw: unknown): SocialPostMetrics {
  if (!raw || typeof raw !== 'object') return {};
  return SocialPostMetricsSchema.parse(raw);
}

function toSummary(
  post: Awaited<ReturnType<typeof listSocialPosts>>[number],
  grades: {
    performance: ScoreGrade;
    engagement: ScoreGrade;
    recency: ScoreGrade;
  },
): SocialPostSummary {
  return SocialPostSummarySchema.parse({
    id: post.id,
    provider: post.provider,
    permalink: post.permalink,
    authorHandle: post.authorHandle,
    textPreview: textPreview(post.textContent),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    ingestMode: post.ingestMode,
    fetchStatus: post.fetchStatus,
    latestGrades: {
      performance: grades.performance,
      engagement: grades.engagement,
      recency: grades.recency,
    },
    updatedAt: post.updatedAt.toISOString(),
  });
}

async function scoreAndSnapshotPost(input: {
  postId: string;
  metrics: SocialPostMetrics;
  provider: string;
  publishedAt: Date | null;
  source: string;
}) {
  const snapshot = await insertSocialMetricSnapshot({
    postId: input.postId,
    metrics: input.metrics,
    source: input.source,
  });
  const scored = computeSocialScoreV1({
    metrics: input.metrics,
    provider: input.provider,
    publishedAt: input.publishedAt,
  });
  const scoreRow = await insertSocialPostScore({
    postId: input.postId,
    snapshotId: snapshot.id,
    policyVersion: scored.policyVersion,
    performanceGrade: scored.performanceGrade,
    engagementGrade: scored.engagementGrade,
    recencyGrade: scored.recencyGrade,
    rankScore: scored.rankScore,
    scoreBreakdownJson: scored.scoreBreakdown,
  });
  return { snapshot, scoreRow, scored };
}

async function resolveFixtureForUrl(provider: SocialProvider, permalink: string) {
  if (provider === 'manual' || !shouldUseSocialFixtures()) {
    return null;
  }
  const fixture = await loadSocialFixture(
    provider === 'threads' ? 'threads' : 'x_bookmarks',
  );
  return {
    ...fixture,
    permalink,
  };
}

async function persistIngestedPost(
  userId: string,
  input: {
    provider: SocialProvider;
    permalink: string;
    permalinkHash: string;
    externalId?: string | null;
    authorHandle: string;
    authorDisplayName?: string | null;
    textContent: string;
    publishedAt?: Date | null;
    ingestMode: 'url_fetch' | 'provider_sync' | 'manual';
    fetchStatus: 'ok' | 'partial' | 'failed' | 'user_provided';
    metrics: SocialPostMetrics;
    rawPayloadJson?: unknown;
  },
) {
  const existing = await getSocialPostByPermalinkHash(userId, input.permalinkHash);
  if (existing) {
    const latestScore = await getLatestScoreForPost(existing.id);
    return { post: existing, scoreRow: latestScore };
  }

  const post = await insertSocialPost({
      userId,
      provider: input.provider,
      externalId: input.externalId,
      permalink: input.permalink,
      permalinkHash: input.permalinkHash,
      authorHandle: input.authorHandle,
      authorDisplayName: input.authorDisplayName,
      textContent: input.textContent,
      publishedAt: input.publishedAt,
      ingestMode: input.ingestMode,
      fetchStatus: input.fetchStatus,
      rawPayloadJson: input.rawPayloadJson,
    });

  const { scoreRow } = await scoreAndSnapshotPost({
    postId: post.id,
    metrics: input.metrics,
    provider: input.provider,
    publishedAt: input.publishedAt ?? null,
    source: input.ingestMode === 'manual' ? 'manual_input' : 'url_fetch',
  });

  return { post, scoreRow };
}

export async function listSocialSourcesForUser(userId: string) {
  const rows = await listSocialSources(userId);
  return rows.map((row) =>
    SocialSourceSummarySchema.parse({
      provider: row.provider,
      connectionStatus: row.connectionStatus,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      lastError: row.lastError,
    }),
  );
}

export async function ingestSocialUrl(
  userId: string,
  body: IngestSocialUrlInput,
): Promise<SocialPostDetail> {
  const parsed = IngestSocialUrlInputSchema.parse(body);
  let normalised;
  try {
    normalised = normaliseSocialPermalink(parsed.url);
  } catch (error) {
    if (error instanceof SocialUrlError) {
      throw new SocialPostsError(
        error.message,
        error.code === 'INVALID_URL' ? 'VALIDATION' : error.code,
      );
    }
    throw error;
  }

  const fixture = await resolveFixtureForUrl(normalised.provider, normalised.permalink);
  if (!fixture) {
    throw new SocialPostsError(
      'URL fetch is unavailable without fixtures; use manual ingest',
      'FETCH_FAILED',
    );
  }

  const { post } = await persistIngestedPost(userId, {
    provider: normalised.provider,
    permalink: normalised.permalink,
    permalinkHash: normalised.permalinkHash,
    externalId: fixture.externalId ?? null,
    authorHandle: fixture.authorHandle,
    authorDisplayName: fixture.authorDisplayName ?? null,
    textContent: fixture.textContent,
    publishedAt: fixture.publishedAt ? new Date(fixture.publishedAt) : null,
    ingestMode: 'url_fetch',
    fetchStatus: 'ok',
    metrics: fixture.metrics ?? {},
    rawPayloadJson: fixture,
  });

  const detail = await getSocialPost(userId, post.id);
  if (!detail) throw new SocialPostsError('Post not found', 'NOT_FOUND');
  return detail;
}

export async function ingestSocialManual(
  userId: string,
  body: IngestSocialManualInput,
): Promise<SocialPostDetail> {
  const parsed = IngestSocialManualInputSchema.parse(body);
  const normalised = normaliseSocialPermalink(parsed.permalink);

  const { post } = await persistIngestedPost(userId, {
    provider: normalised.provider,
    permalink: normalised.permalink,
    permalinkHash: normalised.permalinkHash,
    externalId: null,
    authorHandle: parsed.authorHandle.replace(/^@/, ''),
    authorDisplayName: parsed.authorDisplayName ?? null,
    textContent: parsed.textContent,
    publishedAt: parsed.publishedAt ? new Date(parsed.publishedAt) : null,
    ingestMode: 'manual',
    fetchStatus: 'user_provided',
    metrics: parsed.metrics ?? {},
  });

  const detail = await getSocialPost(userId, post.id);
  if (!detail) throw new SocialPostsError('Post not found', 'NOT_FOUND');
  return detail;
}

export async function syncSocialProvider(userId: string, provider: SocialProvider) {
  if (provider === 'manual') {
    throw new SocialPostsError('Manual provider does not support sync', 'VALIDATION');
  }
  const source = await getSocialSource(userId, provider);
  if (!source || source.connectionStatus !== 'configured') {
    throw new SocialPostsError('Provider is not configured', 'NOT_CONFIGURED');
  }
  throw new SocialPostsError('Provider sync is not implemented in S9', 'NOT_CONFIGURED');
}

export async function listSocialPostSummaries(
  userId: string,
): Promise<SocialPostSummary[]> {
  const posts = await listSocialPosts(userId);
  const summaries: SocialPostSummary[] = [];
  for (const post of posts) {
    const score = await getLatestScoreForPost(post.id);
    summaries.push(
      toSummary(post, {
        performance: (score?.performanceGrade as ScoreGrade) ?? 'Unknown',
        engagement: (score?.engagementGrade as ScoreGrade) ?? 'Unknown',
        recency: (score?.recencyGrade as ScoreGrade) ?? 'Unknown',
      }),
    );
  }
  return summaries;
}

export async function getSocialPost(
  userId: string,
  postId: string,
): Promise<SocialPostDetail | null> {
  const post = await getSocialPostById(userId, postId);
  if (!post) return null;

  const snapshots = await listMetricSnapshotsForPost(postId);
  const latestScore = await getLatestScoreForPost(postId);

  return SocialPostDetailSchema.parse({
    id: post.id,
    provider: post.provider,
    permalink: post.permalink,
    authorHandle: post.authorHandle,
    authorDisplayName: post.authorDisplayName,
    textPreview: textPreview(post.textContent),
    textContent: post.textContent,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    ingestMode: post.ingestMode,
    fetchStatus: post.fetchStatus,
    latestGrades: {
      performance: (latestScore?.performanceGrade as ScoreGrade) ?? 'Unknown',
      engagement: (latestScore?.engagementGrade as ScoreGrade) ?? 'Unknown',
      recency: (latestScore?.recencyGrade as ScoreGrade) ?? 'Unknown',
    },
    updatedAt: post.updatedAt.toISOString(),
    metricSnapshots: snapshots.map((row) => ({
      id: row.id,
      capturedAt: row.capturedAt.toISOString(),
      metrics: parseMetrics(row.metricsJson),
      source: row.source,
    })),
    latestScore: latestScore
      ? {
          id: latestScore.id,
          policyVersion: SOCIAL_SCORE_POLICY_VERSION,
          performanceGrade: latestScore.performanceGrade,
          engagementGrade: latestScore.engagementGrade,
          recencyGrade: latestScore.recencyGrade,
          rankScore:
            latestScore.rankScore !== null && latestScore.rankScore !== undefined
              ? Number(latestScore.rankScore)
              : null,
          scoreBreakdown: (latestScore.scoreBreakdownJson ?? {}) as Record<
            string,
            unknown
          >,
          computedAt: latestScore.computedAt.toISOString(),
        }
      : null,
  });
}

export async function addSocialPostToFolder(
  userId: string,
  folderId: string,
  body: unknown,
) {
  const parsed = AddReferenceSocialPostInputSchema.parse(body);
  const folder = await getReferenceFolder(userId, folderId);
  if (!folder) throw new SocialPostsError('Folder not found', 'NOT_FOUND');

  const post = await getSocialPostById(userId, parsed.socialPostId);
  if (!post) throw new SocialPostsError('Post not found', 'NOT_FOUND');

  const latestScore = await getLatestScoreForPost(post.id);
  const snapshots = await listMetricSnapshotsForPost(post.id);
  const snapshot = snapshots[0];
  if (!snapshot || !latestScore) {
    throw new SocialPostsError('Post has no score snapshot', 'VALIDATION');
  }

  const lineage = socialLineageFromScoredPost({
    postId: post.id,
    provider: post.provider as SocialProvider,
    permalink: post.permalink,
    metricSnapshotId: snapshot.id,
    performanceGrade: latestScore.performanceGrade as ScoreGrade,
    engagementGrade: latestScore.engagementGrade as ScoreGrade,
    recencyGrade: latestScore.recencyGrade as ScoreGrade,
    rankScore:
      latestScore.rankScore !== null && latestScore.rankScore !== undefined
        ? Number(latestScore.rankScore)
        : null,
    recommendationReason: 'Saved from social ingest hub',
    consumerStageAtSave: folder.consumerStage
      ? ConsumerStageSchema.parse(folder.consumerStage)
      : undefined,
  });

  try {
    const row = await insertReferenceFolderSocialPost({
      folderId,
      userId,
      socialPostId: post.id,
      lineage,
      saveReason: parsed.saveReason ?? null,
    });
    await touchReferenceGroupUpdatedAt(folder.groupId);
    return row;
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      throw new SocialPostsError('Post already saved in this folder', 'DUPLICATE');
    }
    throw error;
  }
}

export async function getFolderWithSocialPosts(userId: string, folderId: string) {
  const folder = await getReferenceFolder(userId, folderId);
  if (!folder) throw new SocialPostsError('Folder not found', 'NOT_FOUND');

  const rows = await listReferenceFolderSocialPosts(userId, folderId);
  const socialPostsList = rows.map((row) =>
    ReferenceFolderSocialPostItemSchema.parse({
      id: row.item.id,
      socialPostId: row.post.id,
      permalink: row.post.permalink,
      authorHandle: row.post.authorHandle,
      textPreview: textPreview(row.post.textContent),
      lineage: row.item.lineage,
      saveReason: row.item.saveReason,
      createdAt: row.item.createdAt.toISOString(),
    }),
  );

  return {
    folderId: folder.id,
    groupId: folder.groupId,
    name: folder.name,
    consumerStage: folder.consumerStage,
    socialPosts: socialPostsList,
  };
}

export async function removeSocialPostFromFolder(
  userId: string,
  folderId: string,
  itemId: string,
) {
  const folder = await getReferenceFolder(userId, folderId);
  if (!folder) throw new SocialPostsError('Folder not found', 'NOT_FOUND');

  const deleted = await deleteReferenceFolderSocialPost(userId, folderId, itemId);
  if (!deleted) throw new SocialPostsError('Social post item not found', 'NOT_FOUND');
  await touchReferenceGroupUpdatedAt(folder.groupId);
  return deleted;
}

import { and, desc, eq, ne } from 'drizzle-orm';
import {
  homeUserProfiles,
  keywordIdeaRuns,
  userKeywordProbes,
} from '@youpd/db/schema';
import type { HomeProfileInput, KeywordProbe, ProbeStatus } from '@youpd/types';
import { getDbClient } from '@youpd/db';

export type HomeUserProfileRow = typeof homeUserProfiles.$inferSelect;
export type UserKeywordProbeRow = typeof userKeywordProbes.$inferSelect;

function rowToProbe(row: UserKeywordProbeRow): KeywordProbe {
  const searchStatus =
    row.status === 'running'
      ? 'running'
      : row.linkedHarvestId
        ? 'ready'
        : row.status === 'completed'
          ? 'ready'
          : 'not_run';

  return {
    id: row.id,
    probeLabel: row.probeLabel,
    audience: row.audience,
    seedTheme: row.seedTheme,
    problemOrSituation: row.problemOrSituation,
    goal: row.goal,
    consumerStage: row.consumerStage as KeywordProbe['consumerStage'],
    rationale: row.rationale,
    searchStatus,
    suggestedKeywords: row.suggestedKeywords ?? [],
    status: row.status as ProbeStatus,
    confidence:
      row.confidence === 'high' || row.confidence === 'medium' || row.confidence === 'low'
        ? row.confidence
        : undefined,
    generationRunId: row.generationRunId ?? undefined,
    linkedHarvestId: row.linkedHarvestId ?? undefined,
  };
}

export async function upsertHomeUserProfile(
  userId: string,
  profile: HomeProfileInput,
): Promise<HomeUserProfileRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(homeUserProfiles)
    .values({
      userId,
      interestTopics: profile.interestTopics,
      channelDescription: profile.channelDescription,
      ownChannelUrl: profile.ownChannelUrl ?? null,
      referenceChannelUrls: profile.referenceChannelUrls,
      excludedTopics: profile.excludedTopics,
      preferredRegionCode: profile.preferredRegionCode,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: homeUserProfiles.userId,
      set: {
        interestTopics: profile.interestTopics,
        channelDescription: profile.channelDescription,
        ownChannelUrl: profile.ownChannelUrl ?? null,
        referenceChannelUrls: profile.referenceChannelUrls,
        excludedTopics: profile.excludedTopics,
        preferredRegionCode: profile.preferredRegionCode,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new Error('failed to upsert home_user_profiles');
  return row;
}

export async function getHomeUserProfile(
  userId: string,
): Promise<HomeUserProfileRow | null> {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(homeUserProfiles)
    .where(eq(homeUserProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function listActiveUserProbes(userId: string): Promise<KeywordProbe[]> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(userKeywordProbes)
    .where(
      and(
        eq(userKeywordProbes.userId, userId),
        ne(userKeywordProbes.status, 'dismissed'),
      ),
    )
    .orderBy(desc(userKeywordProbes.createdAt));
  return rows.map(rowToProbe);
}

export async function createKeywordIdeaRun(input: {
  userId: string;
  profileSnapshot: HomeProfileInput;
  provider: string;
  status?: string;
  errorCode?: string | null;
}): Promise<{ id: string }> {
  const db = getDbClient();
  const [row] = await db
    .insert(keywordIdeaRuns)
    .values({
      userId: input.userId,
      profileSnapshot: input.profileSnapshot,
      provider: input.provider,
      status: input.status ?? 'completed',
      errorCode: input.errorCode ?? null,
    })
    .returning({ id: keywordIdeaRuns.id });
  if (!row) throw new Error('failed to create keyword_idea_runs');
  return row;
}

export async function insertUserKeywordProbes(
  userId: string,
  generationRunId: string,
  probes: Omit<KeywordProbe, 'id' | 'generationRunId' | 'linkedHarvestId'>[],
): Promise<KeywordProbe[]> {
  if (probes.length === 0) return [];
  const db = getDbClient();
  const rows = await db
    .insert(userKeywordProbes)
    .values(
      probes.map((probe) => ({
        userId,
        generationRunId,
        probeLabel: probe.probeLabel,
        audience: probe.audience,
        seedTheme: probe.seedTheme,
        problemOrSituation: probe.problemOrSituation,
        goal: probe.goal,
        consumerStage: probe.consumerStage,
        rationale: probe.rationale,
        suggestedKeywords: probe.suggestedKeywords,
        status: probe.status ?? 'draft',
        confidence: probe.confidence ?? null,
      })),
    )
    .returning();
  return rows.map(rowToProbe);
}

export async function getUserKeywordProbe(
  userId: string,
  probeId: string,
): Promise<KeywordProbe | null> {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(userKeywordProbes)
    .where(
      and(eq(userKeywordProbes.id, probeId), eq(userKeywordProbes.userId, userId)),
    )
    .limit(1);
  return row ? rowToProbe(row) : null;
}

export async function updateUserKeywordProbe(
  userId: string,
  probeId: string,
  patch: Partial<{
    probeLabel: string;
    audience: string;
    seedTheme: string;
    problemOrSituation: string;
    goal: string;
    consumerStage: string;
    rationale: string;
    suggestedKeywords: string[];
    status: ProbeStatus;
    linkedHarvestId: string | null;
  }>,
): Promise<KeywordProbe | null> {
  const db = getDbClient();
  const [row] = await db
    .update(userKeywordProbes)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(eq(userKeywordProbes.id, probeId), eq(userKeywordProbes.userId, userId)),
    )
    .returning();
  return row ? rowToProbe(row) : null;
}

import {
  getDbClient,
  searchSessions,
  type SearchSessionRow,
} from '@youpd/db';

export type SessionStatus = 'success' | 'error' | 'quota_exceeded';

export type RecordSessionInput = {
  operation: string;
  keyword?: string | null;
  videoIds?: string[] | null;
  channelId?: string | null;
  resultCount: number;
  unitsConsumed: number;
  status: SessionStatus;
  errorReason?: string | null;
};

export async function recordSession(
  input: RecordSessionInput,
): Promise<SearchSessionRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(searchSessions)
    .values({
      operation: input.operation,
      keyword: input.keyword ?? null,
      videoIds: input.videoIds ?? null,
      channelId: input.channelId ?? null,
      resultCount: input.resultCount,
      unitsConsumed: input.unitsConsumed,
      status: input.status,
      errorReason: input.errorReason ?? null,
    })
    .returning();
  if (!row) throw new Error('failed to insert search_sessions row');
  return row;
}

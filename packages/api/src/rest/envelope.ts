/** Standard REST envelope aligned with internal v0.5 spec `{ data, meta }`. */

export type YoupdRestMeta = {
  fetchedAt: string;
  source: 'youpd-rest';
  /** Correlates with `search_sessions.id` (quota / audit row). */
  jobId?: string | null;
  /** YouTube commentThreads or playlist continuation token when applicable. */
  nextPageToken?: string | null;
  /** Uploads playlist pagination for channel video sync. */
  nextPlaylistPageToken?: string | null;
  unitsConsumed?: number;
};

export function wrapRestEnvelope<T>(
  data: T,
  partial: Partial<YoupdRestMeta> = {},
): { data: T; meta: YoupdRestMeta } {
  return {
    data,
    meta: {
      fetchedAt: new Date().toISOString(),
      source: 'youpd-rest',
      ...partial,
    },
  };
}

export function splitQuotaSession<T extends { quota_session_id?: string }>(
  result: T,
): {
  body: Omit<T, 'quota_session_id'>;
  quotaSessionId: string | undefined;
} {
  const { quota_session_id: quotaSessionId, ...body } = result;
  return { body, quotaSessionId };
}

export function metaFromResult(
  result: { quota_session_id?: string; units_consumed?: number },
  extra: Partial<YoupdRestMeta> = {},
): Partial<YoupdRestMeta> {
  return {
    jobId: result.quota_session_id ?? undefined,
    unitsConsumed:
      typeof result.units_consumed === 'number'
        ? result.units_consumed
        : undefined,
    ...extra,
  };
}

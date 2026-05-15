/** Typed client for YouPD REST (`/api/youpd/rest/*`). */

export type YoupdEnvelope<T> = {
  data: T;
  meta: {
    fetchedAt: string;
    source: 'youpd-rest';
    jobId?: string | null;
    nextPageToken?: string | null;
    nextPlaylistPageToken?: string | null;
    unitsConsumed?: number;
  };
};

function baseUrl(): string {
  const b = process.env.YOUPD_API_BASE_URL?.replace(/\/+$/, '');
  if (!b) throw new Error('YOUPD_API_BASE_URL is not set');
  return b;
}

function bearer(): string {
  const t = process.env.YOUPD_API_TOKEN;
  if (!t) throw new Error('YOUPD_API_TOKEN is not set');
  return t;
}

export async function youpdRestJson<T>(
  pathWithLeadingSlash: string,
  init: RequestInit = {},
): Promise<YoupdEnvelope<T>> {
  const url = `${baseUrl()}${pathWithLeadingSlash}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${bearer()}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`YouPD REST ${res.status} ${pathWithLeadingSlash}: ${text}`);
  }
  return JSON.parse(text) as YoupdEnvelope<T>;
}

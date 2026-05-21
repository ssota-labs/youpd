import 'server-only';

export type YoupdRestEnvelope<T> = {
  data: T;
  meta: {
    fetchedAt: string;
    source: 'youpd-rest';
    jobId?: string | null;
    unitsConsumed?: number;
  };
};

function baseUrl(): string {
  const value = process.env.YOUPD_API_BASE_URL?.replace(/\/+$/, '');
  if (!value) throw new Error('YOUPD_API_BASE_URL is not set');
  return value;
}

function token(): string {
  const value = process.env.YOUPD_API_TOKEN;
  if (!value) throw new Error('YOUPD_API_TOKEN is not set');
  return value;
}

export async function youpdRest<T>(
  pathWithLeadingSlash: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${baseUrl()}${pathWithLeadingSlash}`, {
    ...init,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token()}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`YouPD REST ${response.status}: ${text}`);
  }
  const envelope = JSON.parse(text) as YoupdRestEnvelope<T>;
  return envelope.data;
}

export function restPost<T>(path: string, body: unknown): Promise<T> {
  return youpdRest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function restGet<T>(
  path: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
): Promise<T> {
  const url = new URL(`http://internal${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  return youpdRest<T>(`${url.pathname}${url.search}`);
}

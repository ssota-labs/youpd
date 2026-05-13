import type { z } from 'zod';
import type { YouTubeClient } from '@youpd/youtube';

// Minimal fake YouTubeClient for tool tests. Each registered handler maps a
// path to a body factory; calls count toward the recorded log so tests can
// assert ordering and dedup.
export type Handler = (
  params: Record<string, string | number | undefined>,
) => unknown;

export type FakeClientCall = {
  path: string;
  params: Record<string, string | number | undefined>;
};

export type FakeClient = YouTubeClient & { readonly calls: FakeClientCall[] };

export function makeClient(handlers: Record<string, Handler>): FakeClient {
  const calls: FakeClientCall[] = [];
  const client: FakeClient = {
    calls,
    request: async <T>(opts: {
      path: string;
      params: Record<string, string | number | undefined>;
      schema: z.ZodType<T>;
    }): Promise<T> => {
      const h = handlers[opts.path];
      if (!h) throw new Error(`unexpected path ${opts.path}`);
      calls.push({ path: opts.path, params: opts.params });
      return opts.schema.parse(h(opts.params));
    },
  };
  return client;
}

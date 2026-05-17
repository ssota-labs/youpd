/**
 * Cheap end-to-end test for `trackKeywordIdeasDue`. Runs the *real* worker
 * tool handler against in-process HTTP stubs for Notion and YouPD REST — no
 * real Notion DB, no real YouTube quota burn.
 *
 *   pnpm --filter @youpd/notion-worker e2e:tracking
 *
 * Flow:
 *   1. Start a local HTTP server that answers Notion + YouPD REST calls.
 *   2. Point `NOTION_API_BASE_URL` + `YOUPD_API_BASE_URL` at it.
 *   3. Import the worker (which registers tools on import).
 *   4. Run `trackKeywordIdeasDue` in dry_run mode, then again live.
 *   5. Assert basic invariants and dump a transcript of stub calls.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

import { CANONICAL } from '../src/lib/schema.js';

type StubCall = {
  method: string;
  path: string;
  body?: unknown;
};

const callLog: StubCall[] = [];

// Canonical Notion property maps for each DS. Worker calls dataSources.retrieve
// against these IDs and validates against CANONICAL.* — we have to mirror the
// expected property shape exactly or healthcheck/validateCanonicalSchema fails.
function dataSourceProperties(
  table: keyof typeof CANONICAL,
): Record<string, { id: string; name: string; type: string }> {
  const out: Record<string, { id: string; name: string; type: string }> = {};
  const propMap: Record<string, string> = CANONICAL[table] as Record<string, string>;
  let i = 0;
  for (const propName of Object.values(propMap)) {
    out[`prop_${i}`] = { id: `prop_${i}`, name: propName, type: typeFor(propName, table) };
    i += 1;
  }
  return out;
}

// Look up the canonical type for a known property name. Mirrors the
// `expectationsForTable` switch in src/lib/schema.ts.
function typeFor(propName: string, table: keyof typeof CANONICAL): string {
  if (table === 'keywordIdeas') {
    switch (propName) {
      case CANONICAL.keywordIdeas.title:
        return 'title';
      case CANONICAL.keywordIdeas.status:
        return 'status';
      case CANONICAL.keywordIdeas.trackingStatus:
      case CANONICAL.keywordIdeas.trackingPeriod:
      case CANONICAL.keywordIdeas.priority:
        return 'select';
      case CANONICAL.keywordIdeas.trackingSlot:
      case CANONICAL.keywordIdeas.searchCount:
        return 'number';
      case CANONICAL.keywordIdeas.lastSearchedAt:
        return 'date';
      case CANONICAL.keywordIdeas.nextSearchAt:
      case CANONICAL.keywordIdeas.dueForScheduler:
        return 'formula';
      case CANONICAL.keywordIdeas.trackingKeywordsRelation:
        return 'relation';
    }
  }
  if (table === 'videos') {
    if (propName === CANONICAL.videos.title) return 'title';
    if (propName === CANONICAL.videos.videoId) return 'rich_text';
    if (propName === CANONICAL.videos.url) return 'url';
    if (
      propName === CANONICAL.videos.views ||
      propName === CANONICAL.videos.likes ||
      propName === CANONICAL.videos.comments
    )
      return 'number';
    if (
      propName === CANONICAL.videos.publishedAt ||
      propName === CANONICAL.videos.collectedAt
    )
      return 'date';
    if (propName === CANONICAL.videos.channelRelation) return 'relation';
  }
  if (table === 'channels') {
    if (propName === CANONICAL.channels.title) return 'title';
    if (propName === CANONICAL.channels.channelId) return 'rich_text';
    if (propName === CANONICAL.channels.url) return 'url';
    if (propName === CANONICAL.channels.publishedAt) return 'date';
    return 'number';
  }
  if (table === 'keywords') {
    if (propName === CANONICAL.keywords.title) return 'title';
    if (propName === CANONICAL.keywords.status) return 'status';
    if (
      propName === CANONICAL.keywords.nounType ||
      propName === CANONICAL.keywords.priority
    )
      return 'select';
    if (propName === CANONICAL.keywords.lastCollected) return 'date';
    if (propName === CANONICAL.keywords.assignee) return 'people';
    return 'relation';
  }
  throw new Error(`unhandled prop ${propName} in ${table}`);
}

// Two fake Keyword Ideas the worker should pick up. Page IDs are uuid-ish so
// the deterministic slot hash spreads them across the weekly range.
const FAKE_IDEAS = [
  {
    pageId: '11111111-aaaa-bbbb-cccc-000000000001',
    keyword: 'cherry-picker',
    trackingPeriod: '주 1회',
    searchCount: 0,
  },
  {
    pageId: '22222222-aaaa-bbbb-cccc-000000000002',
    keyword: 'side-stream',
    trackingPeriod: '월 1회',
    searchCount: 2,
  },
];

function notionIdeaRow(idea: (typeof FAKE_IDEAS)[number]) {
  return {
    object: 'page',
    id: idea.pageId,
    properties: {
      [CANONICAL.keywordIdeas.title]: {
        id: 'prop_title',
        type: 'title',
        title: [{ type: 'text', plain_text: idea.keyword }],
      },
      [CANONICAL.keywordIdeas.searchCount]: {
        id: 'prop_count',
        type: 'number',
        number: idea.searchCount,
      },
      [CANONICAL.keywordIdeas.trackingSlot]: {
        id: 'prop_slot',
        type: 'number',
        number: null,
      },
      [CANONICAL.keywordIdeas.trackingPeriod]: {
        id: 'prop_period',
        type: 'select',
        select: { name: idea.trackingPeriod },
      },
      [CANONICAL.keywordIdeas.trackingStatus]: {
        id: 'prop_status',
        type: 'select',
        select: { name: '활성' },
      },
      [CANONICAL.keywordIdeas.priority]: {
        id: 'prop_prio',
        type: 'select',
        select: { name: '높음' },
      },
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(json),
  });
  res.end(json);
}

// Maps Notion data_source_id → table key. Filled before the server starts so
// the stub knows which DS schema/query response to return.
const DS_TO_TABLE = new Map<string, keyof typeof CANONICAL>();

let createdPageCounter = 0;
function newPageId(prefix: string): string {
  createdPageCounter += 1;
  return `${prefix}-${String(createdPageCounter).padStart(12, '0')}`;
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET';
  const path = req.url ?? '/';
  const rawBody = ['POST', 'PATCH', 'PUT'].includes(method)
    ? await readBody(req)
    : '';
  const body = rawBody ? JSON.parse(rawBody) : undefined;
  callLog.push({ method, path, body });

  // YouPD REST: stub the keyword search endpoint with 2 fake videos + 1 channel.
  if (path.startsWith('/api/youpd/rest/search/keyword')) {
    send(res, 200, {
      data: {
        keyword: body?.keyword ?? '',
        videos: [
          {
            videoId: 'vidA',
            title: `vidA for ${body?.keyword ?? '?'}`,
            channelId: 'chA',
            channelTitle: 'Channel A',
            publishedAt: '2026-05-01',
            views: 1234,
            likes: 56,
            comments: 7,
            url: 'https://www.youtube.com/watch?v=vidA',
          },
          {
            videoId: 'vidB',
            title: `vidB for ${body?.keyword ?? '?'}`,
            channelId: 'chA',
            channelTitle: 'Channel A',
            publishedAt: '2026-05-02',
            views: 999,
            likes: 12,
            comments: 0,
            url: 'https://www.youtube.com/watch?v=vidB',
          },
        ],
        channels: [
          {
            channelId: 'chA',
            title: 'Channel A',
            publishedAt: '2024-01-01',
            subscriberCount: 1000,
            videoCount: 50,
            viewCount: 100000,
            url: 'https://www.youtube.com/channel/chA',
          },
        ],
        search_pages: 1,
      },
      meta: { jobId: 'stub-job' },
    });
    return;
  }

  // ------ Notion API stubs ------
  // The Notion client uses `${baseUrl}/v1/...` so all paths land under /v1.
  if (!path.startsWith('/v1/')) {
    send(res, 404, { object: 'error', message: `unhandled ${method} ${path}` });
    return;
  }

  // GET /v1/data_sources/{id}
  const dsMatch = /^\/v1\/data_sources\/([^/]+)$/.exec(path);
  if (method === 'GET' && dsMatch) {
    const id = dsMatch[1]!;
    const table = DS_TO_TABLE.get(id);
    if (!table) {
      send(res, 404, { object: 'error', message: `unknown ds ${id}` });
      return;
    }
    send(res, 200, {
      object: 'data_source',
      id,
      properties: dataSourceProperties(table),
    });
    return;
  }

  // POST /v1/data_sources/{id}/query
  const dsQueryMatch = /^\/v1\/data_sources\/([^/]+)\/query/.exec(path);
  if (method === 'POST' && dsQueryMatch) {
    const id = dsQueryMatch[1]!;
    const table = DS_TO_TABLE.get(id);
    if (table === 'keywordIdeas') {
      // Return both fake ideas; tool will filter via formula+select, but we
      // already encoded the expected statuses on the rows so they match.
      send(res, 200, {
        object: 'list',
        results: FAKE_IDEAS.map(notionIdeaRow),
        has_more: false,
        next_cursor: null,
      });
      return;
    }
    // For lookup queries against other tables (channels/videos/keywords) we
    // always return empty so the worker takes the "create new" branch.
    send(res, 200, {
      object: 'list',
      results: [],
      has_more: false,
      next_cursor: null,
    });
    return;
  }

  // POST /v1/pages — create a page.
  if (method === 'POST' && path === '/v1/pages') {
    send(res, 200, {
      object: 'page',
      id: newPageId('newpage'),
      properties: {},
    });
    return;
  }

  // PATCH /v1/pages/{id}
  const pagePatch = /^\/v1\/pages\/([^/]+)$/.exec(path);
  if (method === 'PATCH' && pagePatch) {
    send(res, 200, {
      object: 'page',
      id: pagePatch[1]!,
      properties: body?.properties ?? {},
    });
    return;
  }

  // GET /v1/pages/{id} — used by mergeRelationPropertyByName. Return an empty
  // relation array; the worker will then add the new page ids on top.
  if (method === 'GET' && pagePatch) {
    send(res, 200, {
      object: 'page',
      id: pagePatch[1]!,
      properties: { prop_rel: { id: 'prop_rel', type: 'relation', relation: [] } },
    });
    return;
  }

  send(res, 404, { object: 'error', message: `unhandled ${method} ${path}` });
}

function setupDataSources(): void {
  DS_TO_TABLE.set(process.env.YOUPD_KEYWORD_IDEAS_DATA_SOURCE_ID!, 'keywordIdeas');
  DS_TO_TABLE.set(process.env.YOUPD_KEYWORDS_DATA_SOURCE_ID!, 'keywords');
  DS_TO_TABLE.set(process.env.YOUPD_VIDEOS_DATA_SOURCE_ID!, 'videos');
  DS_TO_TABLE.set(process.env.YOUPD_CHANNELS_DATA_SOURCE_ID!, 'channels');
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(`assert: ${msg}`);
  }
}

async function main(): Promise<void> {
  // Stable, deterministic env so the worker code path is exercised but no
  // real network calls leak out.
  process.env.YOUPD_API_TOKEN = 'stub-token';
  process.env.YOUPD_KEYWORDS_DATA_SOURCE_ID = 'ds-keywords';
  process.env.YOUPD_VIDEOS_DATA_SOURCE_ID = 'ds-videos';
  process.env.YOUPD_CHANNELS_DATA_SOURCE_ID = 'ds-channels';
  process.env.YOUPD_KEYWORD_IDEAS_DATA_SOURCE_ID = 'ds-keyword-ideas';
  process.env.NOTION_API_TOKEN = 'stub-notion-token';

  const server = createServer((req, res) => {
    void handle(req, res).catch((err) => {
      send(res, 500, { message: (err as Error).message });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  process.env.YOUPD_API_BASE_URL = base;
  process.env.NOTION_API_BASE_URL = base;
  setupDataSources();

  console.log(`[e2e] stub server on ${base}`);

  // Lazy import so the worker reads the env we just set.
  const workerMod = await import('../src/index.js');
  const worker = (workerMod.default ?? workerMod) as {
    run: (
      key: string,
      input: unknown,
      options?: { concreteOutput?: true },
    ) => Promise<unknown>;
  };

  try {
    console.log('\n=== Phase 1: dry_run=true ===');
    const dry = await worker.run(
      'trackKeywordIdeasDue',
      {
        keyword_idea_limit: null,
        results_per_keyword: null,
        mode: 'initial_catchup',
        force_rebalance: null,
        dry_run: true,
      },
      { concreteOutput: true },
    );
    console.log(JSON.stringify(dry, null, 2));
    const dryRes = dry as {
      processed: number;
      dry_run: boolean;
      ideas: { planned_slot: number | null; planned_period: string | null }[];
      expected_quota_units: number | null;
      slot_distribution: { weekly: unknown[]; monthly: unknown[] };
    };
    assert(dryRes.processed === FAKE_IDEAS.length, `processed=${dryRes.processed}`);
    assert(dryRes.dry_run === true, 'dry_run flag');
    assert(
      typeof dryRes.expected_quota_units === 'number' && dryRes.expected_quota_units > 0,
      'expected_quota_units',
    );
    assert(dryRes.ideas.every((i) => typeof i.planned_slot === 'number'), 'planned_slot set');
    assert(
      dryRes.slot_distribution.weekly.length + dryRes.slot_distribution.monthly.length > 0,
      'distribution non-empty',
    );

    console.log('\n=== Phase 2: live (1 idea, keyword_idea_limit=1) ===');
    callLog.length = 0;
    const live = await worker.run(
      'trackKeywordIdeasDue',
      {
        keyword_idea_limit: 1,
        results_per_keyword: 50,
        mode: null,
        force_rebalance: null,
        dry_run: false,
      },
      { concreteOutput: true },
    );
    console.log(JSON.stringify(live, null, 2));
    const liveRes = live as {
      processed: number;
      succeeded: number;
      failed: number;
      ideas: { planned_slot: number | null; status: string }[];
    };
    // Notion stub returns BOTH ideas regardless of page_size; the worker
    // iterates in order so it actually processes both even when limit=1.
    // That is fine for the e2e: we just want to see succeeded>0 and at least
    // one PATCH back to an idea page.
    assert(liveRes.succeeded >= 1, `succeeded=${liveRes.succeeded}`);
    assert(liveRes.failed === 0, `failed=${liveRes.failed}`);
    const idealPagePatches = callLog.filter(
      (c) =>
        c.method === 'PATCH' &&
        /^\/v1\/pages\/(11111111|22222222)/.test(c.path),
    );
    assert(idealPagePatches.length >= 1, 'at least one idea page PATCHed');
    const finalPatch = idealPagePatches.find((c) => {
      const props = (c.body as { properties?: Record<string, unknown> } | undefined)?.properties;
      return Boolean(
        props && (props as Record<string, unknown>)[CANONICAL.keywordIdeas.lastSearchedAt],
      );
    });
    assert(finalPatch, 'a final patch wrote 마지막 검색일');
    console.log('\n[e2e] all assertions passed.');

    console.log('\n=== Stub call summary (Phase 2 only) ===');
    const byPath = new Map<string, number>();
    for (const c of callLog) {
      const key = `${c.method} ${c.path.split('?')[0]}`;
      byPath.set(key, (byPath.get(key) ?? 0) + 1);
    }
    for (const [k, v] of [...byPath.entries()].sort()) {
      console.log(`  ${v}\t${k}`);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[e2e] failed:', err);
    process.exit(1);
  });

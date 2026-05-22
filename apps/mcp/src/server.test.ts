import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { registerTools } from './server';

const {
  enqueueYoupdJobMock,
  getYoupdJobStatusMock,
  getStoredTrendingVideosMock,
} = vi.hoisted(() => ({
  enqueueYoupdJobMock: vi.fn(),
  getYoupdJobStatusMock: vi.fn(),
  getStoredTrendingVideosMock: vi.fn(),
}));

vi.mock('./workflows/jobs', () => ({
  enqueueYoupdJob: (...args: unknown[]) => enqueueYoupdJobMock(...args),
  getYoupdJobStatus: (...args: unknown[]) => getYoupdJobStatusMock(...args),
  JobNotFoundError: class JobNotFoundError extends Error {
    constructor(public readonly jobId: string) {
      super(`Workflow run not found: ${jobId}`);
      this.name = 'JobNotFoundError';
    }
  },
}));

vi.mock('@youpd/api/mcp/quota', () => ({
  QuotaExceededAtBudgetError: class QuotaExceededAtBudgetError extends Error {
    override readonly name = 'QuotaExceededAtBudgetError';
  },
}));

vi.mock('@youpd/youtube', () => ({
  YouTubeApiError: class YouTubeApiError extends Error {
    override readonly name = 'YouTubeApiError';
  },
}));

vi.mock('@youpd/api/youtube', () => ({
  AnalyzeVideoInputSchema: z
    .object({
      videoId: z.string().min(1),
      includeComments: z.boolean().default(true),
      commentsTopN: z.number().int().default(50),
    })
    .strict(),
  AnalyzeChannelInputSchema: z
    .object({
      channelId: z.string().min(1),
      maxVideos: z.number().int().default(500),
      topPerformingLimit: z.number().int().default(10),
      includeComments: z.boolean().default(false),
    })
    .strict(),
  SearchKeywordWorkflowInputSchema: z
    .object({
      keyword: z.string().min(1),
      regionCode: z.string().length(2).default('KR'),
      limit: z.number().int().default(50),
      order: z
        .enum(['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'])
        .default('relevance'),
    })
    .strict(),
  GetTrendingVideosInputSchema: z
    .object({
      date: z.string(),
      regionCode: z.string().length(2).default('KR'),
      categoryId: z.string().nullable().optional(),
      limit: z.number().int().default(50),
    })
    .strict(),
  getStoredTrendingVideos: (...args: unknown[]) =>
    getStoredTrendingVideosMock(...args),
}));

type ToolConfig = {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

type RegisteredTool = {
  name: string;
  config: ToolConfig;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
};

const EXPECTED_TOOL_NAMES = [
  'youpd_analyze_video',
  'youpd_analyze_channel',
  'youpd_search_keyword',
  'youpd_get_trending_videos',
  'youpd_get_job_status',
];

function captureRegisteredTools(): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    registerTool(name: string, config: ToolConfig, handler: unknown): void {
      tools.set(name, {
        name,
        config,
        handler: handler as RegisteredTool['handler'],
      });
    },
  } as unknown as Parameters<typeof registerTools>[0];

  registerTools(server);
  return tools;
}

function descriptionFor(
  tools: Map<string, RegisteredTool>,
  name: string,
): string {
  const description = tools.get(name)?.config.description;
  expect(description, `${name} should have a description`).toEqual(
    expect.any(String),
  );
  return description as string;
}

describe('registerTools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers the workflow MCP tool set', () => {
    const tools = captureRegisteredTools();
    expect([...tools.keys()]).toEqual(EXPECTED_TOOL_NAMES);
  });

  it('uses workflow-oriented descriptions without low-level persist flags', () => {
    const tools = captureRegisteredTools();

    for (const name of EXPECTED_TOOL_NAMES) {
      const description = descriptionFor(tools, name);
      expect(description).toContain('Inputs:');
      expect(description).toContain('Side effects:');
      expect(description).toContain('Returns');
      expect(description).not.toMatch(/persist defaults to true/i);
      expect(description).not.toMatch(/v0\.12 REST wrapper/i);
    }
  });

  it('marks stored trending lookup as read-only', () => {
    const tools = captureRegisteredTools();
    const tool = tools.get('youpd_get_trending_videos');

    expect(tool?.config.annotations).toMatchObject({
      readOnlyHint: true,
      idempotentHint: true,
    });
    expect(descriptionFor(tools, 'youpd_get_trending_videos')).toContain(
      'read-only and idempotent',
    );
    expect(descriptionFor(tools, 'youpd_get_trending_videos')).toContain(
      'does not call YouTube directly',
    );
  });

  it('marks job status lookup as read-only', () => {
    const tools = captureRegisteredTools();
    const tool = tools.get('youpd_get_job_status');

    expect(tool?.config.annotations).toMatchObject({
      readOnlyHint: true,
      idempotentHint: true,
    });
    expect(descriptionFor(tools, 'youpd_get_job_status')).toContain('job_id');
  });

  it('enqueues async analysis jobs instead of calling REST', async () => {
    const tools = captureRegisteredTools();
    enqueueYoupdJobMock.mockResolvedValue({
      job_id: 'wrun_123',
      status: 'pending',
      workflow: 'analyze-video',
    });

    const response = await tools
      .get('youpd_analyze_video')
      ?.handler({ videoId: 'vid-1' });

    expect(enqueueYoupdJobMock).toHaveBeenCalledWith('analyze-video', {
      videoId: 'vid-1',
    });
    expect(response).toMatchObject({
      structuredContent: {
        job_id: 'wrun_123',
        status: 'pending',
        workflow: 'analyze-video',
      },
    });
  });

  it('calls getStoredTrendingVideos directly for trending lookup', async () => {
    const tools = captureRegisteredTools();
    getStoredTrendingVideosMock.mockResolvedValue({
      data: { videos: [] },
      warnings: [],
      collectedAt: '2026-05-22T00:00:00.000Z',
    });

    await tools.get('youpd_get_trending_videos')?.handler({
      date: '2026-05-22',
      regionCode: 'KR',
      limit: 10,
    });

    expect(getStoredTrendingVideosMock).toHaveBeenCalledWith({
      date: '2026-05-22',
      regionCode: 'KR',
      limit: 10,
    });
    expect(enqueueYoupdJobMock).not.toHaveBeenCalled();
  });

  it('polls workflow status through getYoupdJobStatus', async () => {
    const tools = captureRegisteredTools();
    getYoupdJobStatusMock.mockResolvedValue({
      job_id: 'wrun_123',
      status: 'completed',
      workflow: 'runYoupdWorkflow',
      data: { ok: true },
    });

    const response = await tools
      .get('youpd_get_job_status')
      ?.handler({ job_id: 'wrun_123' });

    expect(getYoupdJobStatusMock).toHaveBeenCalledWith('wrun_123');
    expect(response).toMatchObject({
      structuredContent: {
        job_id: 'wrun_123',
        status: 'completed',
      },
    });
  });
});

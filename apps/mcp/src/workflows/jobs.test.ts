import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobNotFoundError, enqueueYoupdJob, getYoupdJobStatus } from './jobs';

const startMock = vi.fn();
const getRunMock = vi.fn();

vi.mock('workflow/api', () => ({
  start: (...args: unknown[]) => startMock(...args),
  getRun: (...args: unknown[]) => getRunMock(...args),
}));

vi.mock('./youpd-workflow', () => ({
  runYoupdWorkflow: vi.fn(),
}));

describe('enqueueYoupdJob', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts a workflow run and returns the job envelope', async () => {
    startMock.mockResolvedValue({
      runId: 'wrun_123',
      status: Promise.resolve('pending'),
    });

    await expect(
      enqueueYoupdJob('analyze-video', { videoId: 'vid-1' }),
    ).resolves.toEqual({
      job_id: 'wrun_123',
      status: 'pending',
      workflow: 'analyze-video',
    });

    expect(startMock).toHaveBeenCalledOnce();
  });
});

describe('getYoupdJobStatus', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws when the workflow run does not exist', async () => {
    getRunMock.mockReturnValue({
      exists: Promise.resolve(false),
    });

    await expect(getYoupdJobStatus('missing')).rejects.toBeInstanceOf(
      JobNotFoundError,
    );
  });

  it('returns completed job data', async () => {
    getRunMock.mockReturnValue({
      exists: Promise.resolve(true),
      status: Promise.resolve('completed'),
      workflowName: Promise.resolve('runYoupdWorkflow'),
      createdAt: Promise.resolve(new Date('2026-05-22T00:00:00.000Z')),
      returnValue: Promise.resolve({ data: { ok: true } }),
    });

    await expect(getYoupdJobStatus('wrun_123')).resolves.toEqual({
      job_id: 'wrun_123',
      status: 'completed',
      workflow: 'runYoupdWorkflow',
      created_at: '2026-05-22T00:00:00.000Z',
      data: { data: { ok: true } },
    });
  });

  it('returns failed job error details when available', async () => {
    getRunMock.mockReturnValue({
      exists: Promise.resolve(true),
      status: Promise.resolve('failed'),
      workflowName: Promise.resolve('runYoupdWorkflow'),
      createdAt: Promise.resolve(new Date('2026-05-22T00:00:00.000Z')),
      error: Promise.resolve(new Error('quota exceeded')),
    });

    await expect(getYoupdJobStatus('wrun_456')).resolves.toEqual({
      job_id: 'wrun_456',
      status: 'failed',
      workflow: 'runYoupdWorkflow',
      created_at: '2026-05-22T00:00:00.000Z',
      error: { message: 'quota exceeded' },
    });
  });
});

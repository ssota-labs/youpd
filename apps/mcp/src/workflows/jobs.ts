import 'server-only';

import { getRun, start } from 'workflow/api';
import type {
  JobEnqueueResult,
  JobStatusResult,
  YoupdWorkflowKind,
} from './schemas';
import { runYoupdWorkflow } from './youpd-workflow';

export class JobNotFoundError extends Error {
  constructor(public readonly jobId: string) {
    super(`Workflow run not found: ${jobId}`);
    this.name = 'JobNotFoundError';
  }
}

export async function enqueueYoupdJob(
  kind: YoupdWorkflowKind,
  input: Record<string, unknown>,
): Promise<JobEnqueueResult> {
  const run = await start(runYoupdWorkflow, [{ kind, input }]);
  const status = await run.status;

  return {
    job_id: run.runId,
    status,
    workflow: kind,
  };
}

export async function getYoupdJobStatus(jobId: string): Promise<JobStatusResult> {
  const run = getRun(jobId);

  if (!(await run.exists)) {
    throw new JobNotFoundError(jobId);
  }

  const [status, workflowName, createdAt] = await Promise.all([
    run.status,
    run.workflowName,
    run.createdAt,
  ]);

  const result: JobStatusResult = {
    job_id: jobId,
    status,
    workflow: workflowName,
    created_at: createdAt?.toISOString(),
  };

  if (status === 'completed') {
    result.data = await run.returnValue;
  }

  if (status === 'failed') {
    try {
      const failedRun = run as {
        error?: Promise<unknown>;
      };
      if (failedRun.error) {
        const err = await failedRun.error;
        if (err instanceof Error) {
          result.error = { message: err.message };
        } else if (err != null) {
          result.error = { message: String(err) };
        }
      }
    } catch {
      // Some worlds omit structured failure payloads.
    }
  }

  return result;
}

import type { ClockPort } from '../ports/clock';
import type { AnalysisPolicyPort } from '../ports/policy';
import type {
  SnapshotRepositoryPort,
  TrendingRepositoryPort,
} from '../ports/repository';
import type { VideoSourcePort } from '../ports/source';
import {
  createDefaultAnalysisPolicyPort,
  createFoundationSnapshotRepositoryPort,
  createFoundationTrendingRepositoryPort,
  createFoundationVideoSourcePort,
  createSystemClockPort,
} from '../adapters';

export type WorkflowDeps = {
  source: VideoSourcePort;
  trending: TrendingRepositoryPort;
  snapshots: SnapshotRepositoryPort;
  policy: AnalysisPolicyPort;
  clock: ClockPort;
};

export function createDefaultWorkflowDeps(): WorkflowDeps {
  return {
    source: createFoundationVideoSourcePort(),
    trending: createFoundationTrendingRepositoryPort(),
    snapshots: createFoundationSnapshotRepositoryPort(),
    policy: createDefaultAnalysisPolicyPort(),
    clock: createSystemClockPort(),
  };
}

function envelope<T>(data: T, warnings: { code: string; message: string; target?: Record<string, unknown> }[] = []) {
  return {
    data,
    warnings,
    collectedAt: new Date().toISOString(),
  };
}

export { envelope as workflowEnvelope };

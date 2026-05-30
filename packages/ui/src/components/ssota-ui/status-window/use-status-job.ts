/**
 * Status Job Hook
 *
 * 공통 summary job Realtime 로직. Drive / Canvas 등에서 사용.
 * 외부 훅·액션은 deps로 주입 (Parameterization).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { StatusJob } from './types';

export const STATUS_JOB_TODO_ID = 'auto-summary';

function toBlockSlug(blockId: string): string {
  if (blockId.length >= 36 && blockId.includes('-')) {
    return blockId.slice(0, 8);
  }
  return blockId;
}

/** Raw source job (domain-agnostic minimal shape) */
export interface RawSourceJob {
  status: string;
  block_id: string;
  language?: string;
  error_message?: string;
  id?: string;
  [key: string]: unknown;
}

export interface UseStatusJobDeps {
  /** Realtime 구독 (useMultiSourceJobRealtime 등) */
  useSourceJobSubscription: (
    blockIds: string[],
    onJobUpdate: (blockId: string, raw: RawSourceJob) => void
  ) => void;
  /** getLatestSourceJobByBlockId 등 */
  fetchLatestSourceJob: (params: {
    workspaceId: string;
    blockId: string;
  }) => Promise<RawSourceJob | null>;
  /** createStatusJobPatchFromSourceJob 등 - raw → patch. existingJob은 resourceId 사용 */
  createStatusJobPatch: (
    raw: RawSourceJob,
    existingJob: Pick<
      StatusJob,
      | 'id'
      | 'type'
      | 'resourceId'
      | 'templateName'
      | 'resourceTitle'
      | 'language'
      | 'createdAt'
    >
  ) => Partial<StatusJob>;
  getAutoSummaryTaskTitle: (lang: string) => string;
  /** getInProgressSourceJobAction 등 (initial restore용) */
  fetchInProgressSourceJobs?: (params: {
    pageId: string;
  }) => Promise<RawSourceJob[]>;
  isTempPageId?: (pageId: string) => boolean;
}

export interface UseStatusJobParams {
  deps: UseStatusJobDeps;
  /** Job 완료 시 호출 */
  onJobCompleted: (blockId: string, raw: RawSourceJob) => void;
  workspaceId?: string;
  enablePolling?: boolean;
  initialRestore?: { pageId: string; onComplete?: () => void };
  onShowStatusWindow?: () => void;
}

export interface UseStatusJobResult {
  jobs: StatusJob[];
  expandedJobIds: string[];
  updateJob: (id: string, patch: Partial<StatusJob>) => void;
  dismissJob: (id: string) => void;
  toggleExpandedJobId: (id: string) => void;
  pushJob: (job: Omit<StatusJob, 'id' | 'createdAt'>) => string;
  isGenerating: boolean;
  registerSummaryJob: (params: {
    blockId: string;
    workspaceId: string;
    options?: { resourceTitle?: string; language?: string };
  }) => void;
}

export function useStatusJob(
  params: UseStatusJobParams
): UseStatusJobResult {
  const {
    deps,
    onJobCompleted,
    workspaceId,
    enablePolling = false,
    initialRestore,
    onShowStatusWindow,
  } = params;

  const {
    useSourceJobSubscription,
    fetchLatestSourceJob,
    createStatusJobPatch,
    getAutoSummaryTaskTitle,
    fetchInProgressSourceJobs,
    isTempPageId = () => false,
  } = deps;

  const [jobs, setJobs] = useState<StatusJob[]>([]);
  const [expandedJobIds, setExpandedJobIds] = useState<string[]>([]);

  const onJobUpdateRef = useRef<(blockId: string, raw: RawSourceJob) => void>(
    () => {}
  );

  const pushJob = useCallback(
    (job: Omit<StatusJob, 'id' | 'createdAt'>): string => {
      const id = `job-${Math.random().toString(36).slice(2, 11)}`;
      const full: StatusJob = {
        ...job,
        id,
        createdAt: Date.now(),
      };
      setJobs((prev) => [full, ...prev]);
      setExpandedJobIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return id;
    },
    []
  );

  const updateJob = useCallback((id: string, patch: Partial<StatusJob>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...patch } : j))
    );
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setExpandedJobIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const toggleExpandedJobId = useCallback((id: string) => {
    setExpandedJobIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const onJobUpdate = useCallback(
    (blockId: string, raw: RawSourceJob) => {
      if (raw.status === 'completed') {
        onJobCompleted(blockId, raw);
      }
      setJobs((prev) => {
        const idx = prev.findIndex(
          (j) => j.type === 'summary' && j.resourceId === blockId
        );
        if (idx === -1) return prev;
        const job = prev[idx];
        if (!job) return prev;
        const patch = createStatusJobPatch(raw, {
          id: job.id,
          type: job.type,
          resourceId: job.resourceId,
          templateName: job.templateName,
          resourceTitle: job.resourceTitle,
          language: job.language,
          createdAt: job.createdAt,
        });
        const next = [...prev];
        next[idx] = { ...job, ...patch };
        return next;
      });
    },
    [onJobCompleted, createStatusJobPatch]
  );

  onJobUpdateRef.current = onJobUpdate;

  const summaryBlockIds = jobs
    .filter(
      (j) =>
        j.type === 'summary' &&
        (j.status === 'running' || j.status === 'pending')
    )
    .map((j) => j.resourceId);

  useSourceJobSubscription(summaryBlockIds, onJobUpdate);

  const registerSummaryJob = useCallback(
    (params: {
      blockId: string;
      workspaceId: string;
      options?: { resourceTitle?: string; language?: string };
    }) => {
      const { blockId, workspaceId: workspaceIdParam, options } = params;
      const lang = options?.language ?? 'en';
      const taskTitle = getAutoSummaryTaskTitle(lang);

      setJobs((prev) => {
        const existingJob = prev.find(
          (j) => j.type === 'summary' && j.resourceId === blockId
        );
        if (existingJob) {
          if (
            existingJob.status === 'completed' ||
            existingJob.status === 'failed'
          ) {
            return prev.map((j) =>
              j.id === existingJob.id
                ? {
                    ...j,
                    status: 'running' as const,
                    error: null,
                    resourceTitle: options?.resourceTitle ?? j.resourceTitle,
                    language: lang,
                    tasks: [
                      {
                        id: STATUS_JOB_TODO_ID,
                        title: taskTitle,
                        description: 'Generating source brief...',
                        status: 'pending' as const,
                      },
                    ],
                  }
                : j
            );
          }
          return prev;
        }
        const id = `summary-${blockId}-${Date.now()}`;
        const job: StatusJob = {
          id,
          type: 'summary',
          status: 'running',
          tasks: [
            {
              id: STATUS_JOB_TODO_ID,
              title: taskTitle,
              description: 'Generating source brief...',
              status: 'pending',
            },
          ],
          error: null,
          resourceId: blockId,
          resourceTitle: options?.resourceTitle,
          language: lang,
          createdAt: Date.now(),
        };
        setExpandedJobIds((p) => (p.includes(id) ? p : [...p, id]));
        return [job, ...prev];
      });

      onShowStatusWindow?.();

      const blockSlug = toBlockSlug(blockId);
      fetchLatestSourceJob({
        workspaceId: workspaceIdParam,
        blockId: blockSlug,
      })
        .then((raw) => {
          if (raw) {
            onJobUpdateRef.current(blockId, raw);
          }
        })
        .catch(() => {});
    },
    [onShowStatusWindow, getAutoSummaryTaskTitle, fetchLatestSourceJob]
  );

  // Polling fallback
  useEffect(() => {
    if (!enablePolling || !workspaceId || summaryBlockIds.length === 0) return;

    const POLL_INTERVAL_MS = 3000;
    const intervalId = setInterval(() => {
      summaryBlockIds.forEach((blockId) => {
        const blockSlug = toBlockSlug(blockId);
        fetchLatestSourceJob({ workspaceId, blockId: blockSlug })
          .then((raw) => {
            if (raw) {
              onJobUpdateRef.current(raw.block_id, raw);
            }
          })
          .catch(() => {});
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [enablePolling, workspaceId, summaryBlockIds, fetchLatestSourceJob]);

  // Initial restore
  useEffect(() => {
    if (!initialRestore?.pageId || isTempPageId(initialRestore.pageId)) return;
    if (!fetchInProgressSourceJobs) return;

    fetchInProgressSourceJobs({ pageId: initialRestore.pageId }).then(
      (sourceJobs) => {
        if (!sourceJobs.length) return;

        const initialJobs: StatusJob[] = sourceJobs.map((j) => {
          const base = {
            id: `summary-${j.block_id}-${j.id ?? ''}`,
            type: 'summary' as const,
            resourceId: j.block_id,
            resourceTitle: undefined as string | undefined,
            language: j.language,
            createdAt: Date.now(),
          };
          const patch = createStatusJobPatch(j, base);
          return { ...base, ...patch } as StatusJob;
        });

        setJobs((prev) => {
          const visualJobs = prev.filter((j) => j.type === 'visual-summary');
          return [...initialJobs, ...visualJobs];
        });
        setExpandedJobIds(initialJobs.map((j) => j.id));
        initialRestore.onComplete?.();
      }
    );
  }, [
    initialRestore,
    fetchInProgressSourceJobs,
    createStatusJobPatch,
    isTempPageId,
  ]);

  const isGenerating = jobs.some(
    (j) => j.status === 'running' || j.status === 'pending'
  );

  return {
    jobs,
    expandedJobIds,
    updateJob,
    dismissJob,
    toggleExpandedJobId,
    pushJob,
    isGenerating,
    registerSummaryJob,
  };
}

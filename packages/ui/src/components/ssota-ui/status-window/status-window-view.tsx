/**
 * Status Window View Component
 *
 * Status Window의 순수 view 컴포넌트.
 * jobs[] 기반 아코디언 카드 스택. Props로 데이터를 받아 렌더링만 담당.
 * Parameterization: onOpenResource(resourceId) - 호출부가 리소스 열기 동작 정의
 */

'use client';

import { X } from 'lucide-react';

import { Box } from '@/components/ui/box';
import type { StatusJob } from './types';
import { StatusJobCard } from './status-job-card';

export interface StatusWindowViewProps {
  jobs: StatusJob[];
  expandedJobIds: string[];
  onDismissJob: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDismiss?: () => void;
  /** 호출부가 리소스 열기 동작 정의 (Parameterization) */
  onOpenResource?: (resourceId: string) => void;
}

/**
 * StatusWindowView
 *
 * jobs.map → StatusJobCard 아코디언 스택. 빈 상태 시 "No active tasks".
 */
export function StatusWindowView({
  jobs,
  expandedJobIds,
  onDismissJob,
  onToggleExpand,
  onDismiss,
  onOpenResource,
}: StatusWindowViewProps) {
  return (
    <Box className="w-[320px] max-h-[400px] bg-background/95 backdrop-blur border border-border rounded-xl shadow-xl flex flex-col overflow-hidden">
      <Box className="px-3 py-2.5 flex items-center justify-between border-b bg-muted/30">
        <Box className="min-w-0 flex flex-col gap-0.5">
          <Box className="text-sm font-semibold text-foreground">Status</Box>
        </Box>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 shrink-0"
            aria-label="Close status window"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </Box>

      <Box className="flex-1 overflow-y-auto p-3 space-y-2">
        {jobs.length === 0 && (
          <Box className="px-3 py-4 text-sm text-muted-foreground">
            No active tasks
          </Box>
        )}
        {jobs.map((job) => (
          <Box key={job.id}>
            <StatusJobCard
              job={job}
              isExpanded={expandedJobIds.includes(job.id)}
              onToggleExpand={() => onToggleExpand(job.id)}
              onDismiss={() => onDismissJob(job.id)}
              onOpenResource={onOpenResource}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

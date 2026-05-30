/**
 * Status Job Card (아코디언 카드)
 *
 * 단일 Job: 헤더(타입 라벨, 상태 indicator, 접기/펼치기, X) + 본문(tasks, error)
 * Parameterization: onOpenResource(resourceId) - 호출부가 리소스 열기 동작 정의
 */

'use client';

import { motion } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import {
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
} from '@/components/ai-elements/queue';
import type { StatusJob } from './types';

const OPERATION_TYPE_LABELS: Record<string, string> = {
  'visual-summary': 'Visual Summary',
  summary: 'Summary',
};

function getSummaryHeaderLabel(
  isRunning: boolean,
  resourceTitle?: string
): string {
  const verb = isRunning ? 'Summarizing' : 'Summarized';
  if (!resourceTitle?.trim()) return verb;
  return `${verb} ${resourceTitle.trim()}`;
}

export interface StatusJobCardProps {
  job: StatusJob;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDismiss: () => void;
  /** 호출부가 리소스 열기 동작 정의 (Parameterization) */
  onOpenResource?: (resourceId: string) => void;
  /** Result Injection: type별 라벨. 기본값 OPERATION_TYPE_LABELS 사용 */
  getTypeLabel?: (type: string) => string;
}

export function StatusJobCard({
  job,
  isExpanded,
  onToggleExpand,
  onDismiss,
  onOpenResource,
  getTypeLabel = (type) => OPERATION_TYPE_LABELS[type] ?? type,
}: StatusJobCardProps) {
  const isRunning = job.status === 'running' || job.status === 'pending';
  const hasTodos = job.tasks.length > 0;
  const isLoadingTodos =
    hasTodos && job.tasks.some((t) => t.status !== 'completed');
  const label =
    job.type === 'summary'
      ? getSummaryHeaderLabel(isRunning, job.resourceTitle)
      : getTypeLabel(job.type);

  return (
    <Box className="rounded-lg border border-border bg-muted/20 overflow-hidden flex flex-col max-h-[280px]">
      <Box className="flex items-center min-w-0">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex items-center gap-1.5 px-2.5 py-2 min-w-0 text-left hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset rounded-tl-lg"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          {isRunning && (
            <motion.span
              className="w-2 h-2 rounded-full bg-green-500 shrink-0"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              aria-hidden
            />
          )}
          {(job.status === 'completed' || job.status === 'failed') && (
            <span className="shrink-0 text-muted-foreground" aria-hidden>
              {job.status === 'failed' ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </span>
          )}
          <Box className="min-w-0 flex-1 flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground truncate block">
              {label}
            </span>
            {job.type === 'visual-summary' && job.templateName && (
              <span className="text-xs text-muted-foreground truncate">
                {job.templateName}
              </span>
            )}
          </Box>
        </button>
        {onOpenResource && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenResource(job.resourceId);
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Open resource"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 mr-0.5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </Box>

      {isExpanded && (
        <Box className="border-t border-border flex-1 min-h-0 overflow-hidden">
          <Box className="px-2.5 py-2 space-y-2 overflow-y-auto max-h-[180px]">
            {job.error && (
              <Box className="rounded-md bg-destructive/10 border border-destructive/20 flex items-center gap-2 px-2 py-1.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {job.error.message || 'An error occurred'}
                </span>
              </Box>
            )}
            {!hasTodos && isRunning && !job.error && (
              <Box className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Starting...</span>
              </Box>
            )}
            {hasTodos && (
              <Box>
                {isLoadingTodos && (
                  <Box className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Processing tasks...</span>
                  </Box>
                )}
                <QueueList>
                  {job.tasks.map((todo) => {
                    const isCompleted = todo.status === 'completed';
                    return (
                      <QueueItem key={`${todo.id}-${todo.status}`}>
                        <div className="flex items-center gap-2">
                          <QueueItemIndicator completed={isCompleted} />
                          <QueueItemContent completed={isCompleted}>
                            {todo.title}
                          </QueueItemContent>
                        </div>
                        {todo.description && (
                          <QueueItemDescription completed={isCompleted}>
                            {todo.description}
                          </QueueItemDescription>
                        )}
                      </QueueItem>
                    );
                  })}
                </QueueList>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * Status Window Job types
 *
 * Job 단위로 상태창에 표시. Visual summary / Auto summary 공통.
 * resourceId: 도메인 중립 식별자 (Canvas: blockId, Drive: blockId 등)
 */
import type { QueueTodo } from '@/components/ai-elements/queue';

export type StatusJobType = 'visual-summary' | 'summary';

export type StatusJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface StatusJob {
  id: string;
  type: StatusJobType;
  status: StatusJobStatus;
  tasks: QueueTodo[];
  error: Error | null;
  /** 도메인 중립 식별자 (block, resource 등) */
  resourceId: string;
  templateName?: string;
  /** 리소스 제목 (Summarizing/Summarized [제목] 표시용) */
  resourceTitle?: string;
  /** 언어 코드 (task 제목용, e.g. 'en' -> 'English') */
  language?: string;
  createdAt: number;
}

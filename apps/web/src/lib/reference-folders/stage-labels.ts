import type { ConsumerStage } from '@youpd/types';

export const CONSUMER_STAGE_LABELS: Record<ConsumerStage, string> = {
  unaware: '비인지',
  problem_aware: '문제 인지',
  solution_aware: '솔루션 인지',
  product_aware: '제품 인지',
  most_aware: '구매 직전',
};

export function consumerStageLabel(stage: string | null | undefined): string {
  if (!stage) return '—';
  return CONSUMER_STAGE_LABELS[stage as ConsumerStage] ?? stage;
}

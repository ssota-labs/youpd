import type { ConsumerStage } from '@youpd/types';

export type StageFolderTemplate = {
  name: string;
  consumerStage: ConsumerStage | null;
  sortOrder: number;
  isUnspecified?: boolean;
};

export const DEFAULT_STAGE_FOLDER_TEMPLATES: StageFolderTemplate[] = [
  { name: '현상 인지', consumerStage: 'unaware', sortOrder: 0 },
  { name: '문제 인식', consumerStage: 'problem_aware', sortOrder: 1 },
  { name: '해결 탐색', consumerStage: 'solution_aware', sortOrder: 2 },
  { name: '제품 인지', consumerStage: 'product_aware', sortOrder: 3 },
  { name: '보상/행동', consumerStage: 'most_aware', sortOrder: 4 },
  { name: '혼합', consumerStage: 'problem_aware', sortOrder: 5 },
  {
    name: '미지정',
    consumerStage: 'problem_aware',
    sortOrder: 6,
    isUnspecified: true,
  },
];

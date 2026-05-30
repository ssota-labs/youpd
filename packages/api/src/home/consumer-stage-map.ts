import type { ConsumerStage } from '@youpd/types';

/** youpd-skills labels → product ConsumerStage (generation boundary). */
const SKILLS_TO_PRODUCT: Record<string, ConsumerStage> = {
  phenomenon: 'unaware',
  desire: 'problem_aware',
  plan: 'solution_aware',
  action: 'product_aware',
  reward: 'most_aware',
  mixed: 'problem_aware',
  unspecified: 'problem_aware',
};

export function mapSkillsStageToProduct(stage: string): ConsumerStage {
  const normalized = stage.trim().toLowerCase();
  if (normalized in SKILLS_TO_PRODUCT) {
    return SKILLS_TO_PRODUCT[normalized]!;
  }
  const productStages: ConsumerStage[] = [
    'unaware',
    'problem_aware',
    'solution_aware',
    'product_aware',
    'most_aware',
  ];
  if (productStages.includes(normalized as ConsumerStage)) {
    return normalized as ConsumerStage;
  }
  return 'problem_aware';
}

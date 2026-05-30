import type { ScoreGrade } from '../query/scoring';
import { SCORE_GRADES } from '../query/scoring';

export function maxPerformanceGrade(
  grades: Array<ScoreGrade | null | undefined>,
): ScoreGrade | null {
  let best: ScoreGrade | null = null;
  let bestIndex = -1;
  for (const grade of grades) {
    if (!grade) continue;
    const index = SCORE_GRADES.indexOf(grade);
    if (index > bestIndex) {
      bestIndex = index;
      best = grade;
    }
  }
  return best;
}

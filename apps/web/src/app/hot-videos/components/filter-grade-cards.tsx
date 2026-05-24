'use client';

import { useState } from 'react';
import {
  HOT_VIDEO_GRADE_OPTIONS,
  type HotVideoGradeOption,
  isPartialGradeSelection,
  resolveInitialGradeSelection,
  serializeGradeSelection,
} from '@/lib/hot-videos/grade-filter';
import type { HotVideoFilterBucket } from '@/lib/hot-videos/filter-stats';
import { gradeLabelKo } from '@/lib/hot-videos/format';
import { cn } from '@/lib/utils';

type FilterGradeCardsProps = {
  title: string;
  buckets: HotVideoFilterBucket[];
  formId: string;
  fieldName: string;
  initialGrades?: string;
  initialMinimum?: string;
};

const GRADE_DOT_COUNT: Record<HotVideoGradeOption, number> = {
  Worst: 1,
  Bad: 2,
  Normal: 3,
  Good: 4,
  Great: 5,
};

function GradeDots({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={cn(
            'size-1.5 rounded-full',
            index < count ? 'bg-current' : 'bg-current/20',
          )}
        />
      ))}
    </div>
  );
}

function gradeTone(grade: HotVideoGradeOption, selected: boolean): string {
  if (selected) {
    return 'border-primary bg-primary text-primary-foreground shadow-sm';
  }

  switch (grade) {
    case 'Worst':
    case 'Bad':
      return 'border-red-200 bg-white text-red-600 dark:border-red-900/50 dark:bg-background dark:text-red-400';
    case 'Good':
    case 'Great':
      return 'border-primary/30 bg-white text-primary dark:border-primary/40 dark:bg-background';
    default:
      return 'border-border bg-white text-muted-foreground dark:bg-background';
  }
}

export function FilterGradeCards({
  title,
  buckets,
  formId,
  fieldName,
  initialGrades,
  initialMinimum,
}: FilterGradeCardsProps) {
  const [selected, setSelected] = useState<HotVideoGradeOption[]>(() =>
    resolveInitialGradeSelection({
      grades: initialGrades,
      minimum: initialMinimum,
    }),
  );

  const counts = Object.fromEntries(
    buckets.map((bucket) => [bucket.label, bucket.count]),
  ) as Record<string, number>;

  const toggleGrade = (grade: HotVideoGradeOption) => {
    setSelected((current) => {
      if (current.includes(grade)) {
        if (current.length === 1) return current;
        return current.filter((entry) => entry !== grade);
      }
      return [...current, grade];
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{title}</p>
        <span className="text-[0.625rem] text-muted-foreground">
          {isPartialGradeSelection(selected)
            ? `${selected.length}개 선택`
            : '전체'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 xl:grid-cols-5">
        {HOT_VIDEO_GRADE_OPTIONS.map((grade) => {
          const active = selected.includes(grade);

          return (
            <button
              key={grade}
              type="button"
              aria-pressed={active}
              onClick={() => toggleGrade(grade)}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors',
                gradeTone(grade, active),
              )}
            >
              <span className="text-xs font-medium">{gradeLabelKo(grade)}</span>
              <GradeDots count={GRADE_DOT_COUNT[grade]} />
              <span className="text-[0.625rem] opacity-80">
                ({counts[grade]?.toLocaleString('ko-KR') ?? 0})
              </span>
            </button>
          );
        })}
      </div>

      <input
        form={formId}
        type="hidden"
        name={fieldName}
        value={serializeGradeSelection(selected)}
      />
    </div>
  );
}

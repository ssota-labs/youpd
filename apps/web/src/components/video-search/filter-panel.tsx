'use client';

import { FilterGradeCards } from './filter-grade-cards';
import { FilterPublishDateField } from './filter-publish-date-field';
import { FilterRangeField } from './filter-range-field';
import type { HotVideoFilterStats } from '@/lib/video-search/filter-stats';
import {
  isPartialGradeSelection,
  resolveInitialGradeSelection,
} from '@/lib/video-search/grade-filter';

export const VIDEO_SEARCH_FILTER_FORM_ID = 'video-search-filter-form';
export const HOT_VIDEOS_FILTER_FORM_ID = VIDEO_SEARCH_FILTER_FORM_ID;

type VideoSearchFilterPanelProps = {
  filterStats: HotVideoFilterStats;
  showSource?: boolean;
  source?: string;
  isShort?: string;
  scoreLogic?: string;
  minSubscribers?: string;
  maxSubscribers?: string;
  minViews?: string;
  maxViews?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  performanceGrades?: string;
  contributionGrades?: string;
  minPerformanceGrade?: string;
  minContributionGrade?: string;
};

export function VideoSearchFilterPanel({
  filterStats,
  showSource = true,
  source,
  isShort,
  scoreLogic,
  minSubscribers,
  maxSubscribers,
  minViews,
  maxViews,
  publishedAfter,
  publishedBefore,
  performanceGrades,
  contributionGrades,
  minPerformanceGrade,
  minContributionGrade,
}: VideoSearchFilterPanelProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FilterRangeField
          title="조회수"
          stats={filterStats.views}
          filterable
          formId={VIDEO_SEARCH_FILTER_FORM_ID}
          minName="minViews"
          maxName="maxViews"
          initialMin={minViews}
          initialMax={maxViews}
        />
        <FilterRangeField title="좋아요" stats={filterStats.likes} />
        <FilterRangeField
          title="구독자"
          stats={filterStats.subscribers}
          filterable
          formId={VIDEO_SEARCH_FILTER_FORM_ID}
          minName="minSubscribers"
          maxName="maxSubscribers"
          initialMin={minSubscribers}
          initialMax={maxSubscribers}
        />
        <FilterPublishDateField
          stats={filterStats.publishedAt}
          formId={VIDEO_SEARCH_FILTER_FORM_ID}
          initialAfter={publishedAfter}
          initialBefore={publishedBefore}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FilterGradeCards
          title="기여도"
          buckets={filterStats.contributionGrades}
          formId={VIDEO_SEARCH_FILTER_FORM_ID}
          fieldName="contributionGrades"
          initialGrades={contributionGrades}
          initialMinimum={minContributionGrade}
        />

        <FilterGradeCards
          title="성과도"
          buckets={filterStats.performanceGrades}
          formId={VIDEO_SEARCH_FILTER_FORM_ID}
          fieldName="performanceGrades"
          initialGrades={performanceGrades}
          initialMinimum={minPerformanceGrade}
        />
      </div>

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {showSource ? (
          <label className="flex flex-col gap-1 text-[0.625rem] font-medium text-muted-foreground">
            Source
            <select
              form={VIDEO_SEARCH_FILTER_FORM_ID}
              name="source"
              defaultValue={source ?? 'all'}
              aria-label="Source"
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
            >
              <option value="all">전체 source</option>
              <option value="youtube_trending">youtube_trending</option>
              <option value="keyword_promoted">keyword_promoted</option>
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-[0.625rem] font-medium text-muted-foreground">
          Shorts
          <select
            form={VIDEO_SEARCH_FILTER_FORM_ID}
            name="isShort"
            defaultValue={isShort ?? 'all'}
            aria-label="쇼츠"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
          >
            <option value="all">전체 길이</option>
            <option value="false">롱폼만</option>
            <option value="true">쇼츠만</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[0.625rem] font-medium text-muted-foreground">
          점수 조합
          <select
            form={VIDEO_SEARCH_FILTER_FORM_ID}
            name="scoreLogic"
            defaultValue={scoreLogic ?? 'or'}
            aria-label="점수 조합"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
          >
            <option value="or">OR</option>
            <option value="and">AND</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export const HotVideosFilterPanel = VideoSearchFilterPanel;

export function countActiveAdvancedFilters(input: {
  source?: string;
  isShort?: string;
  minPerformanceGrade?: string;
  minContributionGrade?: string;
  performanceGrades?: string;
  contributionGrades?: string;
  scoreLogic?: string;
  minSubscribers?: string;
  maxSubscribers?: string;
  minViews?: string;
  maxViews?: string;
  publishedAfter?: string;
  publishedBefore?: string;
}): number {
  const performanceSelected = resolveInitialGradeSelection({
    grades: input.performanceGrades,
    minimum: input.minPerformanceGrade,
  });
  const contributionSelected = resolveInitialGradeSelection({
    grades: input.contributionGrades,
    minimum: input.minContributionGrade,
  });

  return [
    input.source && input.source !== 'all',
    input.isShort && input.isShort !== 'all',
    isPartialGradeSelection(performanceSelected),
    isPartialGradeSelection(contributionSelected),
    input.scoreLogic === 'and',
    input.minSubscribers,
    input.maxSubscribers,
    input.minViews,
    input.maxViews,
    input.publishedAfter,
    input.publishedBefore,
  ].filter(Boolean).length;
}

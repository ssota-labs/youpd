import { describe, expect, it } from 'vitest';
import type { KeywordHotCandidate } from '@youpd/types';
import {
  addVideoToFolder,
  createReferenceGroup,
  getFolderWithVideos,
  getReferenceGroup,
  listReferenceGroups,
  removeVideoFromFolder,
} from './reference-folders-service';

/** Seeded in supabase/seed.sql for E2E + integration (YOUPD_E2E_SKIP_AUTH). */
const E2E_USER_ID = '00000000-0000-4000-8000-00000000e2e0';

const hotCandidate: KeywordHotCandidate = {
  videoId: `ref-int-${Date.now()}`,
  title: 'Reference integration fixture',
  channelTitle: 'Integration Channel',
  viewCount: 42_000,
  isShort: false,
  score: {
    performance: { ratio: 2.1, grade: 'Great' },
    contribution: { ratio: 1.8, grade: 'Good' },
    lengthAdjustment: {
      baseScore: 1,
      durationSec: 600,
      referenceDurationSec: 600,
      weight: 1,
      adjustedScore: 1,
    },
    highPerforming: true,
    policyVersion: 'youtube_score_v2',
    absoluteViews: { viewCount: 42_000, grade: 'Good', multiplier: 1 },
    recency: { daysSincePublish: 5, score: 0.9, label: 'recent' },
    rankScore: 15,
  },
  lineage: {
    probeId: '00000000-0000-4000-8000-000000000001',
    harvestId: '00000000-0000-4000-8000-000000000002',
    keyword: '레퍼런스 통합 테스트',
    keywordRank: 1,
    policyVersion: 'youtube_score_v2',
  },
  explanation: {
    summary: 'Strong keyword performance for lineage check',
    performanceGrade: 'Great',
    contributionGrade: 'Good',
    absoluteViewGrade: 'Good',
  },
  poolSource: 'keyword',
};

describe('reference folders (integration)', () => {
  it('creates group with stage folders, saves video with lineage, then removes', async () => {
    const suffix = Date.now();
    const group = await createReferenceGroup(E2E_USER_ID, {
      title: `통합 테스트 그룹 ${suffix}`,
      audience: '직장인 크리에이터',
      seedTheme: '생산성',
      intentSummary: 'S4 VERF integration coverage',
      seedStageFolders: true,
    });

    expect(group.folders).toHaveLength(7);
    expect(group.folderCount).toBe(7);

    const problemAwareFolder = group.folders.find(
      (f) => f.name === '문제 인식',
    );
    expect(problemAwareFolder).toBeDefined();

    const saved = await addVideoToFolder(
      E2E_USER_ID,
      problemAwareFolder!.id,
      {
        hotCandidate,
        saveReason: '동일 고객군 레퍼런스',
      },
    );
    expect(saved.videoId).toBe(hotCandidate.videoId);

    const folderView = await getFolderWithVideos(
      E2E_USER_ID,
      problemAwareFolder!.id,
    );
    expect(folderView.videos).toHaveLength(1);
    expect(folderView.videos[0]?.lineage.sourceKeyword).toBe(
      '레퍼런스 통합 테스트',
    );
    expect(folderView.videos[0]?.lineage.performanceGrade).toBe('Great');
    expect(folderView.videos[0]?.saveReason).toBe('동일 고객군 레퍼런스');

    const listed = await listReferenceGroups(E2E_USER_ID);
    expect(listed.some((g) => g.id === group.id)).toBe(true);

    const detail = await getReferenceGroup(E2E_USER_ID, group.id);
    expect(detail.videoCount).toBe(1);

    await removeVideoFromFolder(
      E2E_USER_ID,
      problemAwareFolder!.id,
      saved.id,
    );

    const afterRemove = await getFolderWithVideos(
      E2E_USER_ID,
      problemAwareFolder!.id,
    );
    expect(afterRemove.videos).toHaveLength(0);
  });
});

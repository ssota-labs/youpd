import { describe, expect, it } from 'vitest';
import { generateStubProbes } from './stub-probe-generator';

describe('generateStubProbes', () => {
  it('produces at least two valid probes from Korean sample input', () => {
    const probes = generateStubProbes({
      interestTopics: '엑셀 자동화, 노션 운영',
      channelDescription: '직장인 생산성·1인 크리에이터 운영 채널',
      referenceChannelUrls: [],
      excludedTopics: [],
      preferredRegionCode: 'KR',
      autoRunHarvest: false,
    });

    expect(probes.length).toBeGreaterThanOrEqual(2);
    for (const probe of probes) {
      expect(probe.probeLabel.length).toBeGreaterThan(3);
      expect(probe.audience.length).toBeGreaterThan(0);
      expect(probe.problemOrSituation.length).toBeGreaterThan(0);
      expect(probe.rationale.length).toBeGreaterThan(10);
      expect(probe.suggestedKeywords.length).toBeGreaterThan(0);
    }
  });

  it('skips excluded interest topics', () => {
    const probes = generateStubProbes({
      interestTopics: '게임, 엑셀',
      channelDescription: '테스트 채널',
      referenceChannelUrls: [],
      excludedTopics: ['게임'],
      preferredRegionCode: 'KR',
      autoRunHarvest: false,
    });

    const themed = probes.filter((p) => p.probeLabel.includes('게임 레퍼런스'));
    expect(themed).toHaveLength(0);
    expect(probes.some((p) => p.seedTheme === '엑셀')).toBe(true);
  });
});

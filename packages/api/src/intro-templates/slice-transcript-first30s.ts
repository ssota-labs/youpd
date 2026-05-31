import type { IntroStructureSlots } from '@youpd/types';

export type TranscriptSegment = {
  startMs: number;
  endMs: number;
  text: string;
};

export function sliceTranscriptFirst30s(
  segments: TranscriptSegment[],
  windowEndMs = 30000,
): { excerptText: string; windowStartMs: number; windowEndMs: number } {
  if (segments.length === 0) {
    return { excerptText: '', windowStartMs: 0, windowEndMs: 0 };
  }

  const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
  const maxEnd = Math.max(...sorted.map((s) => s.endMs));
  const effectiveEnd = Math.min(windowEndMs, maxEnd);

  const parts: string[] = [];
  for (const segment of sorted) {
    if (segment.startMs >= effectiveEnd) break;
    if (segment.endMs <= 0) continue;
    parts.push(segment.text.trim());
  }

  return {
    excerptText: parts.join(' ').trim(),
    windowStartMs: 0,
    windowEndMs: effectiveEnd,
  };
}

const SLOT_KEYS: (keyof IntroStructureSlots)[] = [
  'situation',
  'tension',
  'surprisingClaim',
  'credibilityProof',
  'promise',
  'transition',
];

export function deterministicExtractIntroStructure(
  excerptText: string,
): IntroStructureSlots {
  const trimmed = excerptText.trim();
  if (!trimmed) {
    return { notes: '빈 발췌 구간입니다.' };
  }

  const sentences = trimmed
    .split(/(?<=[.!?…])\s+|[\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return { situation: trimmed.slice(0, 500) };
  }

  const slots: IntroStructureSlots = {};
  const assignOrder: (keyof IntroStructureSlots)[] = [
    'situation',
    'tension',
    'surprisingClaim',
    'credibilityProof',
    'promise',
    'transition',
  ];

  for (let i = 0; i < sentences.length; i += 1) {
    const key = assignOrder[i % assignOrder.length]!;
    const existing = slots[key];
    slots[key] = existing ? `${existing} ${sentences[i]}` : sentences[i];
  }

  return slots;
}

export function slotCodeToStructureKey(
  code: string,
): keyof IntroStructureSlots | null {
  const map: Record<string, keyof IntroStructureSlots> = {
    situation: 'situation',
    tension: 'tension',
    surprising_claim: 'surprisingClaim',
    credibility_proof: 'credibilityProof',
    promise: 'promise',
    transition: 'transition',
  };
  return map[code] ?? SLOT_KEYS.find((k) => k === code) ?? null;
}

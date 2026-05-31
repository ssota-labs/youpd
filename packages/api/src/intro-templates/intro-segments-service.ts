import {
  getReferenceFolderVideoForUser,
  getVideoTranscriptByVideoId,
  insertIntroSegment,
} from '@youpd/supabase/repositories/intro-templates';
import {
  CreateIntroSegmentManualBodySchema,
  IntroSegmentSummarySchema,
  IntroStructureSlotsSchema,
  TranscriptSegmentSchema,
  VideoTranscriptStatusSchema,
} from '@youpd/types';
import {
  deterministicExtractIntroStructure,
  sliceTranscriptFirst30s,
} from './slice-transcript-first30s';

export class IntroSegmentsError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_FOUND'
      | 'VALIDATION'
      | 'TRANSCRIPT_UNAVAILABLE'
      | 'FORBIDDEN',
  ) {
    super(message);
    this.name = 'IntroSegmentsError';
  }
}

function parseTranscriptSegments(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const segments = [];
  for (const item of raw) {
    const parsed = TranscriptSegmentSchema.safeParse(item);
    if (parsed.success) segments.push(parsed.data);
  }
  return segments;
}

export async function getVideoTranscriptStatus(videoId: string) {
  const row = await getVideoTranscriptByVideoId(videoId);
  if (!row) {
    return VideoTranscriptStatusSchema.parse({
      videoId,
      provider: 'unavailable',
      availability: 'disabled_no_captions',
      legalNoticeCode: null,
      language: 'ko',
      fullText: null,
      errorMessage: '자막이 아직 수집되지 않았습니다.',
      userTriggered: true,
    });
  }

  return VideoTranscriptStatusSchema.parse({
    videoId: row.videoId,
    provider: row.provider,
    availability: row.availability,
    legalNoticeCode: row.legalNoticeCode,
    language: row.language,
    segments: parseTranscriptSegments(row.segmentsJson),
    fullText: row.fullText,
    errorMessage: row.errorMessage,
    userTriggered: row.userTriggered === 'true',
  });
}

export async function extractIntroSegmentFromReferenceVideo(input: {
  userId: string;
  folderId: string;
  itemId: string;
}) {
  const folderVideo = await getReferenceFolderVideoForUser(input);
  if (!folderVideo) {
    throw new IntroSegmentsError('Reference video not found', 'NOT_FOUND');
  }

  const transcript = await getVideoTranscriptByVideoId(folderVideo.video.videoId);
  if (!transcript || transcript.availability !== 'available') {
    throw new IntroSegmentsError(
      '이 영상의 자막을 사용할 수 없습니다. 수동 구조 입력을 사용하세요.',
      'TRANSCRIPT_UNAVAILABLE',
    );
  }

  const segments = parseTranscriptSegments(transcript.segmentsJson);
  if (segments.length === 0 && !transcript.fullText?.trim()) {
    throw new IntroSegmentsError(
      '자막 구간이 비어 있습니다.',
      'TRANSCRIPT_UNAVAILABLE',
    );
  }

  const sliceInput =
    segments.length > 0
      ? segments
      : [
          {
            startMs: 0,
            endMs: 30000,
            text: transcript.fullText ?? '',
          },
        ];

  const { excerptText, windowStartMs, windowEndMs } =
    sliceTranscriptFirst30s(sliceInput);
  if (!excerptText.trim()) {
    throw new IntroSegmentsError(
      '첫 30초 구간에서 텍스트를 찾지 못했습니다.',
      'TRANSCRIPT_UNAVAILABLE',
    );
  }

  const structureSlots = deterministicExtractIntroStructure(excerptText);
  const row = await insertIntroSegment({
    videoId: folderVideo.video.videoId,
    transcriptId: transcript.id,
    sourceFolderVideoId: folderVideo.item.id,
    windowStartMs,
    windowEndMs,
    excerptText,
    structureSlotsJson: structureSlots,
    sourceMode: 'extracted',
    structureExtractor: 'deterministic_v1',
    lineageSnapshot: folderVideo.item.lineage,
  });

  return IntroSegmentSummarySchema.parse({
    id: row.id,
    videoId: row.videoId,
    excerptText: row.excerptText,
    sourceMode: row.sourceMode,
    structureExtractor: row.structureExtractor,
    structureSlots: IntroStructureSlotsSchema.parse(row.structureSlotsJson),
    manualStructureNotes: row.manualStructureNotesJson
      ? IntroStructureSlotsSchema.parse(row.manualStructureNotesJson)
      : null,
    windowStartMs: row.windowStartMs,
    windowEndMs: row.windowEndMs,
  });
}

export async function createManualIntroSegmentFromReferenceVideo(input: {
  userId: string;
  folderId: string;
  itemId: string;
  body: unknown;
}) {
  const folderVideo = await getReferenceFolderVideoForUser(input);
  if (!folderVideo) {
    throw new IntroSegmentsError('Reference video not found', 'NOT_FOUND');
  }

  const { manualStructureNotes, excerptText } =
    CreateIntroSegmentManualBodySchema.parse(input.body);

  const resolvedExcerpt =
    excerptText?.trim() ??
    Object.values(manualStructureNotes)
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .join(' ')
      .trim();

  if (!resolvedExcerpt) {
    throw new IntroSegmentsError(
      '발췌 텍스트 또는 구조 슬롯 중 하나는 필요합니다.',
      'VALIDATION',
    );
  }

  const row = await insertIntroSegment({
    videoId: folderVideo.video.videoId,
    sourceFolderVideoId: folderVideo.item.id,
    windowStartMs: 0,
    windowEndMs: 30000,
    excerptText: resolvedExcerpt,
    structureSlotsJson: manualStructureNotes,
    manualStructureNotesJson: manualStructureNotes,
    sourceMode: 'manual',
    structureExtractor: 'manual',
    lineageSnapshot: folderVideo.item.lineage,
  });

  return IntroSegmentSummarySchema.parse({
    id: row.id,
    videoId: row.videoId,
    excerptText: row.excerptText,
    sourceMode: row.sourceMode,
    structureExtractor: row.structureExtractor,
    structureSlots: IntroStructureSlotsSchema.parse(row.structureSlotsJson),
    manualStructureNotes: IntroStructureSlotsSchema.parse(
      row.manualStructureNotesJson,
    ),
    windowStartMs: row.windowStartMs,
    windowEndMs: row.windowEndMs,
  });
}

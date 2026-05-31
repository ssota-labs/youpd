import { getPublishedThumbnailTemplateById } from '@youpd/supabase/repositories/creative-templates';
import {
  countGeneratedAssetsForJobs,
  getThumbnailDraftForUser,
  getThumbnailGenerationJobForUser,
  insertGeneratedAsset,
  insertThumbnailGenerationJob,
  listGeneratedAssetsForJob,
  listThumbnailGenerationJobsForUser,
  updateThumbnailGenerationJob,
  upsertThumbnailDraft,
} from '@youpd/supabase/repositories/thumbnail-generation';
import {
  CreateThumbnailJobRequestSchema,
  GeneratedAssetLineageSchema,
  ThumbnailCreateBootstrapSchema,
  ThumbnailGenerationJobListSchema,
  ThumbnailGenerationJobSchema,
  ThumbnailGenerationProviderStatusSchema,
  ThumbnailSlotValuesSchema,
  ThumbnailSkeletonSchema,
  UpsertThumbnailDraftRequestSchema,
  UpsertThumbnailDraftResponseSchema,
  type ThumbnailSlotValues,
} from '@youpd/types';
import { getThumbnailTemplateDetail } from '../thumbnail-templates/thumbnail-templates-service';
import { buildThumbnailPrompt } from './prompt-builder';
import { createImageGenerationPort } from './image-generation-port';
import { validateSlotValuesAgainstSchema } from './slot-validation';

const GENERATED_BUCKET = 'generated-thumbnails';

export class ThumbnailGenerationError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_FOUND'
      | 'VALIDATION'
      | 'FORBIDDEN'
      | 'PROVIDER_NOT_CONFIGURED',
  ) {
    super(message);
    this.name = 'ThumbnailGenerationError';
  }
}

function templateVersionFromRow(updatedAt: Date): string {
  return updatedAt.toISOString();
}

function parseSlotValuesJson(raw: unknown): ThumbnailSlotValues {
  return ThumbnailSlotValuesSchema.parse(raw);
}

function buildReferenceNotes(
  references: Awaited<ReturnType<typeof getThumbnailTemplateDetail>>['references'],
  selectedIds: string[] | undefined,
): string[] {
  if (!selectedIds?.length) return [];
  const selected = new Set(selectedIds);
  return references
    .filter((ref) => selected.has(ref.videoId))
    .map((ref) => `${ref.title} (${ref.channelTitle})`);
}

export function getThumbnailGenerationProviderStatus() {
  const port = createImageGenerationPort();
  return ThumbnailGenerationProviderStatusSchema.parse({
    configured: port.isConfigured(),
    providerKey: port.isConfigured() ? port.providerKey : null,
  });
}

export async function getThumbnailCreateBootstrap(input: {
  userId: string;
  templateId: string;
}) {
  const [template, draft, providerStatus] = await Promise.all([
    getThumbnailTemplateDetail(input.templateId),
    getThumbnailDraftForUser({
      userId: input.userId,
      templateId: input.templateId,
    }),
    Promise.resolve(getThumbnailGenerationProviderStatus()),
  ]);

  return ThumbnailCreateBootstrapSchema.parse({
    template,
    draft: draft
      ? {
          id: draft.id,
          slotValues: parseSlotValuesJson(draft.slotValuesJson),
          selectedReferenceVideoIds: Array.isArray(draft.selectedReferenceVideoIds)
            ? (draft.selectedReferenceVideoIds as string[])
            : undefined,
          updatedAt: draft.updatedAt.toISOString(),
        }
      : null,
    providerStatus,
  });
}

export async function upsertThumbnailCreateDraft(input: {
  userId: string;
  body: unknown;
}) {
  const parsed = UpsertThumbnailDraftRequestSchema.parse(input.body);
  const template = await getPublishedThumbnailTemplateById(parsed.templateId);
  if (!template) {
    throw new ThumbnailGenerationError('Template not found', 'NOT_FOUND');
  }

  const validation = validateSlotValuesAgainstSchema(
    template.slotSchemaJson,
    parsed.slotValues,
  );
  if (!validation.ok) {
    throw new ThumbnailGenerationError(validation.message, 'VALIDATION');
  }

  const row = await upsertThumbnailDraft({
    userId: input.userId,
    templateId: parsed.templateId,
    templateVersion: templateVersionFromRow(template.updatedAt),
    slotValuesJson: parsed.slotValues,
    selectedReferenceVideoIds: parsed.selectedReferenceVideoIds ?? null,
  });
  if (!row) {
    throw new ThumbnailGenerationError('Failed to save draft', 'VALIDATION');
  }

  return UpsertThumbnailDraftResponseSchema.parse({
    draftId: row.id,
    updatedAt: row.updatedAt.toISOString(),
  });
}

async function assetPreviewUrl(input: {
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  imageBytes?: Buffer;
}): Promise<string> {
  if (input.storagePath.startsWith('stub-inline/') && input.imageBytes) {
    return `data:${input.mimeType};base64,${input.imageBytes.toString('base64')}`;
  }
  return `/api/thumbnail-generation/assets/preview?bucket=${encodeURIComponent(input.storageBucket)}&path=${encodeURIComponent(input.storagePath)}`;
}

async function mapJobToResponse(input: {
  job: NonNullable<Awaited<ReturnType<typeof getThumbnailGenerationJobForUser>>>;
  userId: string;
  stubPreviewByAssetId?: Map<string, Buffer>;
}) {
  const assets = await listGeneratedAssetsForJob({
    jobId: input.job.id,
    userId: input.userId,
  });

  const mappedAssets = await Promise.all(
    assets.map(async (asset) => {
      const lineage = GeneratedAssetLineageSchema.parse(asset.lineageJson);
      const previewUrl = await assetPreviewUrl({
        storageBucket: asset.storageBucket,
        storagePath: asset.storagePath,
        mimeType: asset.mimeType,
        imageBytes: input.stubPreviewByAssetId?.get(asset.id),
      });
      return {
        id: asset.id,
        previewUrl,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        lineage,
      };
    }),
  );

  return ThumbnailGenerationJobSchema.parse({
    id: input.job.id,
    templateId: input.job.templateId,
    status: input.job.status,
    providerKey: input.job.providerKey,
    promptVersion: input.job.promptVersion,
    errorCode: input.job.errorCode,
    errorMessage: input.job.errorMessage,
    createdAt: input.job.createdAt.toISOString(),
    startedAt: input.job.startedAt?.toISOString() ?? null,
    finishedAt: input.job.finishedAt?.toISOString() ?? null,
    assets: mappedAssets,
  });
}

export async function createThumbnailGenerationJob(input: {
  userId: string;
  body: unknown;
}) {
  const parsed = CreateThumbnailJobRequestSchema.parse(input.body);
  const port = createImageGenerationPort();
  if (!port.isConfigured()) {
    throw new ThumbnailGenerationError(
      'Image generation provider is not configured',
      'PROVIDER_NOT_CONFIGURED',
    );
  }

  const template = await getPublishedThumbnailTemplateById(parsed.templateId);
  if (!template) {
    throw new ThumbnailGenerationError('Template not found', 'NOT_FOUND');
  }

  const validation = validateSlotValuesAgainstSchema(
    template.slotSchemaJson,
    parsed.slotValues,
  );
  if (!validation.ok) {
    throw new ThumbnailGenerationError(validation.message, 'VALIDATION');
  }

  const detail = await getThumbnailTemplateDetail(parsed.templateId);
  const skeleton = ThumbnailSkeletonSchema.parse(template.skeletonJson);
  const referenceNotes = buildReferenceNotes(
    detail.references,
    parsed.selectedReferenceVideoIds,
  );
  const { promptText, promptVersion, promptHash } = buildThumbnailPrompt({
    promptScaffold: template.promptScaffold,
    defaultStyle: template.defaultStyleJson as Record<string, unknown>,
    slotValues: parsed.slotValues,
    referenceNotes,
  });

  const now = new Date();
  const job = await insertThumbnailGenerationJob({
    userId: input.userId,
    templateId: parsed.templateId,
    draftId: parsed.draftId ?? null,
    status: 'running',
    providerKey: port.providerKey,
    promptText,
    promptVersion,
    slotValuesJson: parsed.slotValues,
    referenceContextJson: {
      referenceVideoIds: parsed.selectedReferenceVideoIds ?? [],
      notes: referenceNotes,
    },
    startedAt: now,
  });
  if (!job) {
    throw new ThumbnailGenerationError('Failed to create job', 'VALIDATION');
  }

  const stubPreviewByAssetId = new Map<string, Buffer>();

  try {
    const generated = await port.generate({
      prompt: promptText,
      aspect: skeleton.aspect,
      referenceImageUrls: detail.references
        .filter((ref) => parsed.selectedReferenceVideoIds?.includes(ref.videoId))
        .map((ref) => ref.thumbnailUrl)
        .filter((url): url is string => Boolean(url)),
    });

    const lineage = GeneratedAssetLineageSchema.parse({
      templateId: template.id,
      templateCode: template.code,
      templateVersion: templateVersionFromRow(template.updatedAt),
      slotValues: parsed.slotValues,
      promptVersion,
      promptHash,
      providerKey: port.providerKey,
      referenceVideoIds: parsed.selectedReferenceVideoIds,
    });

    const storagePath = `stub-inline/${input.userId}/${job.id}.png`;
    const asset = await insertGeneratedAsset({
      userId: input.userId,
      jobId: job.id,
      templateId: template.id,
      storageBucket: GENERATED_BUCKET,
      storagePath,
      mimeType: generated.mimeType,
      width: generated.width,
      height: generated.height,
      lineageJson: lineage,
    });
    if (!asset) {
      throw new ThumbnailGenerationError('Failed to persist asset', 'VALIDATION');
    }
    stubPreviewByAssetId.set(asset.id, generated.imageBytes);

    await updateThumbnailGenerationJob({
      jobId: job.id,
      userId: input.userId,
      status: 'succeeded',
      finishedAt: new Date(),
    });
  } catch (error) {
    await updateThumbnailGenerationJob({
      jobId: job.id,
      userId: input.userId,
      status: 'failed',
      finishedAt: new Date(),
      errorCode: 'GENERATION_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Generation failed',
    });
    throw error;
  }

  const refreshed = await getThumbnailGenerationJobForUser({
    jobId: job.id,
    userId: input.userId,
  });
  if (!refreshed) {
    throw new ThumbnailGenerationError('Job not found', 'NOT_FOUND');
  }

  return mapJobToResponse({
    job: refreshed,
    userId: input.userId,
    stubPreviewByAssetId,
  });
}

export async function getThumbnailGenerationJob(input: {
  userId: string;
  jobId: string;
}) {
  const job = await getThumbnailGenerationJobForUser({
    jobId: input.jobId,
    userId: input.userId,
  });
  if (!job) {
    throw new ThumbnailGenerationError('Job not found', 'NOT_FOUND');
  }
  return mapJobToResponse({ job, userId: input.userId });
}

export async function listThumbnailGenerationJobs(input: {
  userId: string;
  limit?: number;
}) {
  const jobs = await listThumbnailGenerationJobsForUser(input);
  const counts = await countGeneratedAssetsForJobs({
    jobIds: jobs.map((j) => j.id),
    userId: input.userId,
  });

  return ThumbnailGenerationJobListSchema.parse({
    jobs: jobs.map((job) => ({
      id: job.id,
      templateId: job.templateId,
      status: job.status,
      providerKey: job.providerKey,
      createdAt: job.createdAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
      assetCount: counts.get(job.id) ?? 0,
    })),
  });
}

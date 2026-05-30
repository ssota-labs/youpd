import {
  createReferenceFolderGroup,
  deleteReferenceFolderVideo,
  ensureYoutubeVideoExists,
  getReferenceFolder,
  getReferenceFolderGroup,
  insertReferenceFolderVideo,
  insertReferenceFolders,
  listReferenceFolderGroups,
  listReferenceFolderVideos,
  touchReferenceGroupUpdatedAt,
} from '@youpd/supabase/repositories/reference-folders';
import { getUserKeywordProbeByHarvestId } from '@youpd/supabase/repositories/home-probes';
import {
  AddReferenceVideoInputSchema,
  CreateReferenceGroupInputSchema,
  KeywordHotCandidateSchema,
  ReferenceFolderGroupDetailSchema,
  ReferenceFolderGroupSummarySchema,
  ReferenceFolderVideoItemSchema,
  type AddReferenceVideoInput,
  type ConsumerStage,
  type CreateReferenceGroupInput,
  type KeywordHotCandidate,
  type ReferenceFolderGroupDetail,
  type ReferenceFolderGroupSummary,
  type ReferenceFolderVideoItem,
} from '@youpd/types';
import { DEFAULT_STAGE_FOLDER_TEMPLATES } from './stage-folder-templates';
import { referenceLineageFromHotCandidate } from './reference-lineage';

export class ReferenceFoldersError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'VALIDATION'
      | 'SUB_GOOD_PLUS'
      | 'DUPLICATE',
  ) {
    super(message);
    this.name = 'ReferenceFoldersError';
  }
}

function toGroupSummary(input: {
  group: {
    id: string;
    title: string;
    audience: string;
    seedTheme: string;
    intentSummary: string;
    updatedAt: Date;
  };
  folderCount: number;
  videoCount: number;
}): ReferenceFolderGroupSummary {
  return ReferenceFolderGroupSummarySchema.parse({
    id: input.group.id,
    title: input.group.title,
    audience: input.group.audience,
    seedTheme: input.group.seedTheme,
    intentSummary: input.group.intentSummary,
    folderCount: input.folderCount,
    videoCount: input.videoCount,
    updatedAt: input.group.updatedAt.toISOString(),
  });
}

export async function listReferenceGroups(
  userId: string,
): Promise<ReferenceFolderGroupSummary[]> {
  const rows = await listReferenceFolderGroups(userId);
  return rows.map((row) => toGroupSummary(row));
}

export async function createReferenceGroup(
  userId: string,
  input: CreateReferenceGroupInput,
): Promise<ReferenceFolderGroupDetail> {
  const parsed = CreateReferenceGroupInputSchema.parse(input);
  const group = await createReferenceFolderGroup({
    userId,
    title: parsed.title,
    audience: parsed.audience,
    seedTheme: parsed.seedTheme,
    intentSummary: parsed.intentSummary,
    originUserProbeId: parsed.originUserProbeId,
    profileSnapshot: parsed.profileSnapshot,
  });

  if (parsed.seedStageFolders) {
    await insertReferenceFolders(
      DEFAULT_STAGE_FOLDER_TEMPLATES.map((template) => ({
        groupId: group.id,
        userId,
        name: template.name,
        consumerStage: template.consumerStage,
        sortOrder: template.sortOrder,
        isStageTemplate: true,
        isUnspecified: template.isUnspecified ?? false,
      })),
    );
  } else {
    await insertReferenceFolders([
      {
        groupId: group.id,
        userId,
        name: '미분류',
        consumerStage: null,
        sortOrder: 0,
        isStageTemplate: false,
        isUnspecified: false,
      },
    ]);
  }

  const detail = await getReferenceGroup(userId, group.id);
  if (!detail) throw new ReferenceFoldersError('Group not found', 'NOT_FOUND');
  return detail;
}

export async function getReferenceGroup(
  userId: string,
  groupId: string,
): Promise<ReferenceFolderGroupDetail> {
  const result = await getReferenceFolderGroup(userId, groupId);
  if (!result) throw new ReferenceFoldersError('Group not found', 'NOT_FOUND');

  return ReferenceFolderGroupDetailSchema.parse({
    id: result.group.id,
    title: result.group.title,
    audience: result.group.audience,
    seedTheme: result.group.seedTheme,
    intentSummary: result.group.intentSummary,
    folderCount: result.folders.length,
    videoCount: result.folders.reduce((sum, row) => sum + Number(row.videoCount), 0),
    updatedAt: result.group.updatedAt.toISOString(),
    originUserProbeId: result.group.originUserProbeId,
    folders: result.folders.map((row) => ({
      id: row.folder.id,
      groupId: row.folder.groupId,
      name: row.folder.name,
      consumerStage: row.folder.consumerStage,
      sortOrder: row.folder.sortOrder,
      isStageTemplate: row.folder.isStageTemplate,
      isUnspecified: row.folder.isUnspecified,
      videoCount: Number(row.videoCount),
    })),
  });
}

export async function getFolderWithVideos(
  userId: string,
  folderId: string,
): Promise<{
  folderId: string;
  groupId: string;
  name: string;
  consumerStage: string | null;
  videos: ReferenceFolderVideoItem[];
}> {
  const folder = await getReferenceFolder(userId, folderId);
  if (!folder) throw new ReferenceFoldersError('Folder not found', 'NOT_FOUND');

  const rows = await listReferenceFolderVideos(userId, folderId);
  const videos: ReferenceFolderVideoItem[] = rows.map((row) =>
    ReferenceFolderVideoItemSchema.parse({
      id: row.item.id,
      videoId: row.item.videoId,
      title: row.video.title,
      channelTitle: row.channelTitle ?? 'Unknown channel',
      thumbnailUrl: row.video.thumbnailUrl,
      lineage: row.item.lineage,
      saveReason: row.item.saveReason,
      createdAt: row.item.createdAt.toISOString(),
    }),
  );

  return {
    folderId: folder.id,
    groupId: folder.groupId,
    name: folder.name,
    consumerStage: folder.consumerStage,
    videos,
  };
}

async function resolveCandidate(
  input: AddReferenceVideoInput,
  harvestId?: string,
): Promise<KeywordHotCandidate> {
  if (input.hotCandidate) {
    return KeywordHotCandidateSchema.parse(input.hotCandidate);
  }
  throw new ReferenceFoldersError('hotCandidate is required', 'VALIDATION');
}

export async function addVideoToFolder(
  userId: string,
  folderId: string,
  input: AddReferenceVideoInput,
) {
  const parsed = AddReferenceVideoInputSchema.parse(input);
  const folder = await getReferenceFolder(userId, folderId);
  if (!folder) throw new ReferenceFoldersError('Folder not found', 'NOT_FOUND');

  const candidate = await resolveCandidate(parsed);
  if (!candidate.score.highPerforming && !parsed.allowSubGoodPlus) {
    throw new ReferenceFoldersError(
      'Candidate is below Good+ performance threshold',
      'SUB_GOOD_PLUS',
    );
  }

  const probe = await getUserKeywordProbeByHarvestId(userId, candidate.lineage.harvestId);
  const lineage = referenceLineageFromHotCandidate(candidate, {
    userProbeId: probe?.id,
    consumerStage:
      (folder.consumerStage as ConsumerStage | null) ??
      (probe?.consumerStage as ConsumerStage | undefined),
  });

  await ensureYoutubeVideoExists(candidate.videoId, candidate.title);

  try {
    const row = await insertReferenceFolderVideo({
      folderId,
      userId,
      videoId: candidate.videoId,
      lineage,
      saveReason: parsed.saveReason ?? null,
    });
    await touchReferenceGroupUpdatedAt(folder.groupId);
    return row;
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      throw new ReferenceFoldersError('Video already saved in this folder', 'DUPLICATE');
    }
    throw error;
  }
}

export async function removeVideoFromFolder(
  userId: string,
  folderId: string,
  itemId: string,
) {
  const folder = await getReferenceFolder(userId, folderId);
  if (!folder) throw new ReferenceFoldersError('Folder not found', 'NOT_FOUND');

  const deleted = await deleteReferenceFolderVideo(userId, folderId, itemId);
  if (!deleted) throw new ReferenceFoldersError('Video item not found', 'NOT_FOUND');
  await touchReferenceGroupUpdatedAt(folder.groupId);
  return deleted;
}

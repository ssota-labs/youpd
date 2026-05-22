import type { WorkflowWarning } from '../core/models';
import type { CaptureDailySnapshotsInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

export async function captureDailySnapshots(
  input: CaptureDailySnapshotsInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const snapshotDate = input.snapshotDate ?? deps.clock.todayYmd();
  const videoIds = await deps.snapshots.listAllVideoIds();
  const channelIds = await deps.snapshots.listAllChannelIds();

  let videoSnapshotCount = 0;
  let channelSnapshotCount = 0;
  const missingVideoIds: string[] = [];
  const missingChannelIds: string[] = [];

  for (const batch of chunk(videoIds, input.videoBatchSize)) {
    try {
      const result = await deps.snapshots.captureVideoAndChannelSnapshots({
        snapshotDate,
        videoIds: batch,
        channelIds: [],
        source: deps.policy.snapshotSource(),
      });
      videoSnapshotCount += result.videoSnapshots.length;
      missingVideoIds.push(...result.missingVideoIds);
    } catch (error) {
      warnings.push({
        code: 'VIDEO_SNAPSHOT_BATCH_FAILED',
        message: error instanceof Error ? error.message : String(error),
        target: { batchSize: batch.length },
      });
    }
  }

  for (const batch of chunk(channelIds, input.channelBatchSize)) {
    try {
      const result = await deps.snapshots.captureVideoAndChannelSnapshots({
        snapshotDate,
        videoIds: [],
        channelIds: batch,
        source: deps.policy.snapshotSource(),
      });
      channelSnapshotCount += result.channelSnapshots.length;
      missingChannelIds.push(...result.missingChannelIds);
    } catch (error) {
      warnings.push({
        code: 'CHANNEL_SNAPSHOT_BATCH_FAILED',
        message: error instanceof Error ? error.message : String(error),
        target: { batchSize: batch.length },
      });
    }
  }

  return workflowEnvelope(
    {
      snapshotDate,
      videoIdsProcessed: videoIds.length,
      channelIdsProcessed: channelIds.length,
      videoSnapshotCount,
      channelSnapshotCount,
      missingVideoIds,
      missingChannelIds,
    },
    warnings,
  );
}

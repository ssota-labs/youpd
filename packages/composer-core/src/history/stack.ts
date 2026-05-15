import type { Layer } from '../schema/layer';

export class HistoryBoundaryError extends Error {
  override readonly name = 'HistoryBoundaryError';
  constructor(public readonly direction: 'undo' | 'redo') {
    super(`no more history in direction: ${direction}`);
  }
}

// Persistence shape the host must provide for undo/redo. The composer-core
// doesn't talk to DBs; it just calls these. Supabase, an in-memory test
// fake, or a future SQLite host all implement the same interface.
export interface HistorySnapshotStore {
  // Append a snapshot of current layers at the current version. Called by
  // applyEdit before mutating.
  push(args: { version: number; layers: Layer[]; reason?: string }): Promise<void>;
  // Remove all snapshots strictly newer than `version`. Called when a fresh
  // edit prunes a redo branch.
  pruneAfter(args: { version: number }): Promise<void>;
  // Get the most-recent snapshot whose version is strictly older than
  // `currentVersion`. null when no further undo target exists.
  peekOlder(args: { currentVersion: number }): Promise<{ version: number; layers: Layer[] } | null>;
  // Counts used by getHistoryCounts.
  countOlder(args: { currentVersion: number }): Promise<number>;
}

// Pure decision logic: given current cursor + counts, can we navigate?
export function canUndo(args: { olderCount: number }): boolean {
  return args.olderCount > 0;
}
export function canRedo(args: { historyCursor: number }): boolean {
  return args.historyCursor > 0;
}

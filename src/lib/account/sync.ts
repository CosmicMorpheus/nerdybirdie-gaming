import { migrate, type Progress } from '../progress/model';
import { syncMerge } from '../progress/merge';

/** What the server holds for one signed-in player. `version` increases on every write (optimistic concurrency). */
export interface RemoteDoc { data: unknown; version: number }

/** Account storage. The server enforces that a player can only read and write their own row. */
export interface Remote {
  pull(): Promise<RemoteDoc | null>;
  /** Write if the server still has `expected` (null = no row yet). Returns the new version, or 'conflict'. */
  push(data: Progress, expected: number | null): Promise<number | 'conflict'>;
}

export type SyncStatus = 'idle' | 'pending' | 'synced' | 'failed' | 'disabled';

/**
 * Bring local and account progress together and write the result back.
 * Per item, the newest action wins (syncMerge), so two devices editing different items never overwrite each other,
 * and an untick made on one device sticks on the other. On a version conflict (another device wrote in between)
 * it pulls again, re-merges and retries.
 */
export async function syncOnce(local: Progress, remote: Remote, maxAttempts = 4): Promise<{ merged: Progress; version: number }> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const doc = await remote.pull();
    let merged = local;
    if (doc) {
      const m = migrate(doc.data);
      if (!m.ok && m.reason === 'newer') throw new Error('Your account was saved by a newer version of the site. Reload the page.');
      if (m.ok) merged = syncMerge(local, m.progress);
    }
    const r = await remote.push(merged, doc?.version ?? null);
    if (r !== 'conflict') return { merged, version: r };
    lastError = 'conflict';
    local = merged;
  }
  throw new Error(`Couldn't sync after ${maxAttempts} attempts (${String(lastError)})`);
}

/** Retry delays after a failed sync, in ms. */
export const RETRY_DELAYS = [2000, 5000, 15000, 60000];

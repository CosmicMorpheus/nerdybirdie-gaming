import type { ProgressState } from './useProgress';

/**
 * Says where the last change went. Honest about scope: "on this device" unless a signed-in account sync succeeded.
 */
export function SaveStatus({ state }: { state: Pick<ProgressState, 'saveState' | 'ready' | 'sync' | 'account'> }) {
  if (!state.ready) return <p class="save-status" role="status">Loading your progress…</p>;
  if (state.saveState === 'error') return <p class="save-status err" role="status">✕ Couldn't save that change. See the note above.</p>;
  if (state.account) {
    if (state.sync === 'pending') return <p class="save-status" role="status">Saving to your account…</p>;
    if (state.sync === 'synced') return <p class="save-status ok" role="status">✓ Saved to your account</p>;
    if (state.sync === 'failed') return <p class="save-status err" role="status">Couldn't sync yet: saved on this device, retrying</p>;
  }
  if (state.saveState === 'saved') return <p class="save-status ok" role="status">✓ Saved on this device</p>;
  return <p class="save-status" role="status">Progress saves automatically on this device</p>;
}

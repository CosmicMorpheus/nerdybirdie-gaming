import type { ProgressState } from './useProgress';

/**
 * Says where progress went after each change. Honest about scope: this site has no accounts yet,
 * so "saved" always means "saved in this browser".
 */
export function SaveStatus({ state }: { state: Pick<ProgressState, 'saveState' | 'ready'> }) {
  if (!state.ready) return <p class="save-status" role="status">Loading your progress…</p>;
  if (state.saveState === 'error') return <p class="save-status err" role="status">✕ Couldn't save that change. See the note above.</p>;
  if (state.saveState === 'saved') return <p class="save-status ok" role="status">✓ Saved on this device</p>;
  return <p class="save-status" role="status">Progress saves automatically on this device</p>;
}

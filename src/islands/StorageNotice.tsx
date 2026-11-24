import { SAVE_MESSAGES } from '../lib/progress/store';
import type { ProgressState } from './useProgress';

/** Tells the person, in plain words, when progress can't be saved, and what to do. */
export function StorageNotice({ state }: { state: Pick<ProgressState, 'status' | 'saveError'> }) {
  const key =
    state.saveError === 'quota' ? 'quota'
    : state.status === 'unavailable' ? 'unavailable'
    : state.status === 'newer' ? 'newer'
    : state.status === 'recovered' ? 'recovered'
    : state.saveError;
  if (!key) return null;
  return <p class="notice error" role="status">{SAVE_MESSAGES[key]}</p>;
}

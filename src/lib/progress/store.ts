import { emptyProgress, migrate, RECOVERY_KEY, STORAGE_KEY, type Progress } from './model';

/** The subset of the Web Storage API we use, so tests can pass a fake. */
export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export type LoadStatus =
  | 'ok'
  | 'empty'
  /** The browser blocks storage (private mode, settings). Progress works for this visit only. */
  | 'unavailable'
  /** Saved data couldn't be read. It was copied to RECOVERY_KEY and we started fresh. */
  | 'recovered'
  /** Saved by a newer version of the site. Left untouched; nothing is saved over it. */
  | 'newer';

export interface LoadResult {
  progress: Progress;
  status: LoadStatus;
  /** False when saving would overwrite something we must not lose. */
  canSave: boolean;
}

export function getStorage(): KV | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const probe = '__nbg_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function loadProgress(storage: KV | null): LoadResult {
  if (!storage) return { progress: emptyProgress(), status: 'unavailable', canSave: false };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { progress: emptyProgress(), status: 'unavailable', canSave: false };
  }
  if (raw === null) return { progress: emptyProgress(), status: 'empty', canSave: true };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const m = migrate(parsed);
  if (m.ok) return { progress: m.progress, status: 'ok', canSave: true };
  if (m.reason === 'newer') return { progress: emptyProgress(), status: 'newer', canSave: false };
  try {
    storage.setItem(RECOVERY_KEY, raw);
  } catch {
    // Couldn't keep a copy, so don't overwrite the original either.
    return { progress: emptyProgress(), status: 'recovered', canSave: false };
  }
  return { progress: emptyProgress(), status: 'recovered', canSave: true };
}

export type SaveResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' | 'blocked' };

export function saveProgress(storage: KV | null, p: Progress, canSave = true): SaveResult {
  if (!canSave) return { ok: false, reason: 'blocked' };
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(p));
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    return { ok: false, reason: /quota/i.test(name) ? 'quota' : 'unavailable' };
  }
}

export const SAVE_MESSAGES: Record<Exclude<SaveResult, { ok: true }>['reason'] | 'newer' | 'recovered', string> = {
  unavailable:
    "Your browser isn't letting this site save, so ticks last only until you close the page. Private browsing or strict privacy settings usually cause this.",
  quota: "Your browser's storage for this site is full, so the last change wasn't saved. Export a backup, then clear some site data.",
  blocked: "Saving is paused so nothing you had saved is overwritten. Export a backup or contact us via Discord.",
  newer: 'This progress was saved by a newer version of the site. Reload the page to get the latest version; nothing has been changed.',
  recovered:
    "We couldn't read your saved progress, so we started fresh. A copy of the old data was kept in this browser; ask in Discord if you need it back.",
};

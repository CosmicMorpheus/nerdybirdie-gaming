import { migrate, type Progress } from './model';

export const EXPORT_APP = 'nerdybirdie-gaming';
export const MAX_IMPORT_BYTES = 1_000_000;

export function exportProgress(p: Progress, now = new Date()): string {
  return JSON.stringify({ app: EXPORT_APP, exportedAt: now.toISOString(), ...p }, null, 2);
}

export function exportFileName(now = new Date()): string {
  return `nerdybirdie-progress-${now.toISOString().slice(0, 10)}.json`;
}

export type ImportResult = { ok: true; progress: Progress } | { ok: false; error: string };

/** Check a backup file. Never touches saved data; the caller applies it after the person confirms. */
export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'That file is too large to be a progress backup.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a valid backup (it isn't JSON)." };
  }
  if (typeof raw !== 'object' || raw === null || (raw as { app?: unknown }).app !== EXPORT_APP)
    return { ok: false, error: "That file isn't a NerdyBirdie LLC Gaming Guides backup." };
  const m = migrate(raw);
  if (!m.ok)
    return {
      ok: false,
      error: m.reason === 'newer' ? 'That backup is from a newer version of the site. Reload the page and try again.' : "That backup is damaged and can't be read.",
    };
  return { ok: true, progress: m.progress };
}

export interface ContextDiff {
  key: string;
  current: number;
  incoming: number;
  /** ticked in the backup but not now */
  added: number;
  /** ticked now but not in the backup: these would be unticked */
  removed: number;
}

/** What restoring would change, per game-and-platform, so the person can confirm first. */
export function diffImport(current: Progress, incoming: Progress): ContextDiff[] {
  const keys = new Set([...Object.keys(current.contexts), ...Object.keys(incoming.contexts)]);
  return [...keys].sort().map((key) => {
    const a = current.contexts[key]?.completed ?? {};
    const b = incoming.contexts[key]?.completed ?? {};
    return {
      key,
      current: Object.keys(a).length,
      incoming: Object.keys(b).length,
      added: Object.keys(b).filter((id) => !(id in a)).length,
      removed: Object.keys(a).filter((id) => !(id in b)).length,
    };
  });
}

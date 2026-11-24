import { DEFAULT_SPOILER_MODE, isSpoilerMode, type SpoilerMode } from '../spoilers';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'nbg:progress';
/** Where unreadable saved data is copied before starting fresh, so it can still be recovered by hand. */
export const RECOVERY_KEY = 'nbg:progress:unreadable';

/** One game on one platform. Xbox and PS5 progress never mix. */
export interface ContextProgress {
  /** objective id → ISO time it was ticked */
  completed: Record<string, string>;
  bookmarks: string[];
  /** objective id → the person's note */
  notes: Record<string, string>;
}

export interface Progress {
  schemaVersion: typeof SCHEMA_VERSION;
  /** key: `${gameId}|${platformId}` */
  contexts: Record<string, ContextProgress>;
  prefs: { spoilerMode: SpoilerMode; platformByGame: Record<string, string> };
  updatedAt: string;
}

export const contextKey = (gameId: string, platformId: string) => `${gameId}|${platformId}`;

export function emptyProgress(): Progress {
  return {
    schemaVersion: SCHEMA_VERSION,
    contexts: {},
    prefs: { spoilerMode: DEFAULT_SPOILER_MODE, platformByGame: {} },
    updatedAt: new Date(0).toISOString(),
  };
}

export const emptyContext = (): ContextProgress => ({ completed: {}, bookmarks: [], notes: {} });

export const MAX_NOTE_LENGTH = 1000;
const ID = /^[a-z0-9-]+:[a-z0-9:-]+$/;
const CTX = /^[a-z0-9-]+\|[a-z0-9-]+$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export type MigrateResult =
  | { ok: true; progress: Progress }
  | { ok: false; reason: 'malformed' | 'newer'; detail: string };

/**
 * Turn anything read from storage or an import file into a valid Progress.
 * Unknown keys and bad entries are dropped one by one, so one bad value never loses the rest.
 * Future schema versions add a step here; ids are never rewritten.
 */
export function migrate(raw: unknown): MigrateResult {
  if (!isObj(raw)) return { ok: false, reason: 'malformed', detail: 'not an object' };
  const v = raw.schemaVersion;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1)
    return { ok: false, reason: 'malformed', detail: 'missing schemaVersion' };
  if (v > SCHEMA_VERSION)
    return { ok: false, reason: 'newer', detail: `saved by a newer version of the site (v${v})` };

  const out = emptyProgress();
  if (isObj(raw.contexts)) {
    for (const [key, c] of Object.entries(raw.contexts)) {
      if (!CTX.test(key) || !isObj(c)) continue;
      const ctx = emptyContext();
      if (isObj(c.completed))
        for (const [id, at] of Object.entries(c.completed))
          if (ID.test(id) && typeof at === 'string' && !Number.isNaN(Date.parse(at))) ctx.completed[id] = at;
      if (Array.isArray(c.bookmarks))
        ctx.bookmarks = [...new Set(c.bookmarks.filter((b): b is string => typeof b === 'string' && ID.test(b)))];
      if (isObj(c.notes))
        for (const [id, n] of Object.entries(c.notes))
          if (ID.test(id) && typeof n === 'string' && n.trim()) ctx.notes[id] = n.slice(0, MAX_NOTE_LENGTH);
      out.contexts[key] = ctx;
    }
  }
  if (isObj(raw.prefs)) {
    if (isSpoilerMode(raw.prefs.spoilerMode)) out.prefs.spoilerMode = raw.prefs.spoilerMode;
    if (isObj(raw.prefs.platformByGame))
      for (const [g, p] of Object.entries(raw.prefs.platformByGame))
        if (typeof p === 'string' && /^[a-z0-9-]+$/.test(g) && /^[a-z0-9-]+$/.test(p)) out.prefs.platformByGame[g] = p;
  }
  if (typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))) out.updatedAt = raw.updatedAt;
  return { ok: true, progress: out };
}

/* ---- Pure updates. Each returns a new Progress. ---- */

function withContext(p: Progress, key: string, f: (c: ContextProgress) => ContextProgress, now: Date): Progress {
  const cur = p.contexts[key] ?? emptyContext();
  return { ...p, contexts: { ...p.contexts, [key]: f(cur) }, updatedAt: now.toISOString() };
}

export function setCompleted(p: Progress, key: string, id: string, done: boolean, now = new Date()): Progress {
  return withContext(p, key, (c) => {
    const completed = { ...c.completed };
    if (done) completed[id] = completed[id] ?? now.toISOString();
    else delete completed[id];
    return { ...c, completed };
  }, now);
}

export function setBookmark(p: Progress, key: string, id: string, on: boolean, now = new Date()): Progress {
  return withContext(p, key, (c) => ({
    ...c,
    bookmarks: on ? [...new Set([...c.bookmarks, id])] : c.bookmarks.filter((b) => b !== id),
  }), now);
}

export function setNote(p: Progress, key: string, id: string, note: string, now = new Date()): Progress {
  return withContext(p, key, (c) => {
    const notes = { ...c.notes };
    const t = note.slice(0, MAX_NOTE_LENGTH);
    if (t.trim()) notes[id] = t;
    else delete notes[id];
    return { ...c, notes };
  }, now);
}

/** Clears one game-and-platform context only. Prefs and other contexts are kept. */
export function resetContext(p: Progress, key: string, now = new Date()): Progress {
  const contexts = { ...p.contexts };
  delete contexts[key];
  return { ...p, contexts, updatedAt: now.toISOString() };
}

export function setPrefs(p: Progress, prefs: Partial<Progress['prefs']>, now = new Date()): Progress {
  return {
    ...p,
    prefs: {
      ...p.prefs,
      ...prefs,
      platformByGame: { ...p.prefs.platformByGame, ...(prefs.platformByGame ?? {}) },
    },
    updatedAt: now.toISOString(),
  };
}

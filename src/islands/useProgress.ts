import { useEffect, useState } from 'preact/hooks';
import { ACCOUNTS_ENABLED } from '../lib/account/config';
import { RETRY_DELAYS, syncOnce, type SyncStatus } from '../lib/account/sync';
import { syncMerge } from '../lib/progress/merge';
import { emptyProgress, STORAGE_KEY, type Progress } from '../lib/progress/model';
import { accountKey, getStorage, loadProgress, saveProgress, type KV, type LoadStatus, type SaveResult } from '../lib/progress/store';

type SaveError = Exclude<SaveResult, { ok: true }>['reason'];

interface Snapshot {
  progress: Progress;
  /** false until saved data has been read (after hydration) */
  ready: boolean;
  status: LoadStatus;
  saveError: SaveError | null;
  /** Feedback after the last change on this device: 'saved' or 'error'. null before any change. */
  saveState: 'saved' | 'error' | null;
  /** Account sync: 'disabled' when accounts aren't switched on or nobody is signed in. */
  sync: SyncStatus;
  /** The signed-in player, if any. */
  account: { id: string; email: string | null } | null;
}
export interface ProgressState extends Snapshot {
  update: (f: (p: Progress) => Progress) => void;
  replace: (p: Progress) => SaveResult;
  /** Save without "Saved" feedback, for things the player didn't explicitly do (e.g. where they left off). */
  remember: (f: (p: Progress) => Progress) => void;
}

/*
 * One progress store per page, shared by every island on it, so ticking in one part of the page updates the others
 * immediately. Guests: this browser only. Signed in (when accounts are switched on): a per-account copy on this
 * device plus automatic sync after every change, with retries. Other tabs are picked up via the storage event.
 */
let snap: Snapshot = { progress: emptyProgress(), ready: false, status: 'empty', saveError: null, saveState: null, sync: 'disabled', account: null };
const listeners = new Set<(s: Snapshot) => void>();
let storage: KV | null = null;
let canSave = false;
let key = STORAGE_KEY;
let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
let pushing = false;
let dirty = false;

function set(patch: Partial<Snapshot>) {
  snap = { ...snap, ...patch };
  for (const l of listeners) l(snap);
}

function load() {
  const r = loadProgress(storage, key);
  canSave = r.canSave;
  set({ progress: r.progress, status: r.status });
}

async function pushNow(): Promise<void> {
  const u = snap.account;
  if (!u) return;
  if (pushing) { dirty = true; return; } // one sync at a time; run again when this one finishes
  pushing = true;
  dirty = false;
  set({ sync: 'pending' });
  try {
    const { remoteFor } = await import('../lib/account/client');
    const { merged } = await syncOnce(snap.progress, remoteFor(u.id));
    if (snap.account?.id !== u.id) return; // signed out meanwhile
    // Merge into the CURRENT local state, so ticks made while the request was in flight are kept.
    const now = syncMerge(snap.progress, merged);
    saveProgress(storage, now, canSave, key);
    attempt = 0;
    set({ progress: now, sync: dirty ? 'pending' : 'synced' });
  } catch {
    set({ sync: 'failed' });
    const delay = RETRY_DELAYS[Math.min(attempt++, RETRY_DELAYS.length - 1)]!;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void pushNow(), delay);
  } finally {
    pushing = false;
    if (dirty) schedule();
  }
}

function schedule() {
  if (!snap.account) return;
  set({ sync: 'pending' });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void pushNow(), 700);
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  storage = getStorage();
  load();
  set({ ready: true });
  addEventListener('storage', (e) => { if (e.key === key) load(); });
  addEventListener('online', () => { if (snap.account) void pushNow(); });
  if (!ACCOUNTS_ENABLED) return;
  void import('../lib/account/client').then(async ({ currentUser, supabase }) => {
    const signIn = (u: { id: string; email: string | null } | null) => {
      key = u ? accountKey(u.id) : STORAGE_KEY;
      set({ account: u, sync: u ? 'pending' : 'disabled' });
      load();
      if (u) void pushNow();
    };
    signIn(await currentUser());
    supabase().auth.onAuthStateChange((_e, session) => {
      const u = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
      if (u?.id !== snap.account?.id) signIn(u);
    });
  }).catch(() => set({ sync: 'failed' }));
}

function replace(p: Progress): SaveResult {
  const r = saveProgress(storage, p, canSave, key);
  set({ progress: p, saveError: r.ok ? null : r.reason, saveState: r.ok ? 'saved' : 'error' });
  schedule();
  return r;
}
const update = (f: (p: Progress) => Progress) => { replace(f(snap.progress)); };
const remember = (f: (p: Progress) => Progress) => {
  const p = f(snap.progress);
  saveProgress(storage, p, canSave, key);
  set({ progress: p });
  schedule();
};

export function useProgress(): ProgressState {
  const [s, setS] = useState(snap);
  useEffect(() => {
    listeners.add(setS);
    start();
    setS(snap);
    return () => { listeners.delete(setS); };
  }, []);
  return { ...s, update, replace, remember };
}

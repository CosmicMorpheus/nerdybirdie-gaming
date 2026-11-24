import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { ACCOUNTS_ENABLED } from '../lib/account/config';
import { RETRY_DELAYS, syncOnce, type SyncStatus } from '../lib/account/sync';
import { emptyProgress, STORAGE_KEY, type Progress } from '../lib/progress/model';
import { accountKey, getStorage, loadProgress, saveProgress, type KV, type LoadStatus, type SaveResult } from '../lib/progress/store';

type SaveError = Exclude<SaveResult, { ok: true }>['reason'];

export interface ProgressState {
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
  update: (f: (p: Progress) => Progress) => void;
  replace: (p: Progress) => SaveResult;
  /** Save without "Saved" feedback, for things the player didn't explicitly do (e.g. where they left off). */
  remember: (f: (p: Progress) => Progress) => void;
}

/**
 * Saved progress. Guests: this browser only. Signed in (when accounts are switched on): a per-account copy on this
 * device plus automatic sync to the account after every change, with retries. Other tabs are picked up too.
 */
export function useProgress(): ProgressState {
  const storage = useRef<KV | null>(null);
  const canSave = useRef(false);
  const key = useRef(STORAGE_KEY);
  const latest = useRef<Progress>(emptyProgress());
  const userRef = useRef<{ id: string; email: string | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);
  const [progress, setProgress] = useState<Progress>(latest.current);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('empty');
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'error' | null>(null);
  const [sync, setSync] = useState<SyncStatus>('disabled');
  const [account, setAccount] = useState<{ id: string; email: string | null } | null>(null);

  const load = useCallback(() => {
    const r = loadProgress(storage.current, key.current);
    canSave.current = r.canSave;
    latest.current = r.progress;
    setProgress(r.progress);
    setStatus(r.status);
  }, []);

  const pushNow = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;
    setSync('pending');
    try {
      const { remoteFor } = await import('../lib/account/client');
      const { merged } = await syncOnce(latest.current, remoteFor(u.id));
      if (userRef.current?.id !== u.id) return; // signed out meanwhile
      latest.current = merged;
      setProgress(merged);
      saveProgress(storage.current, merged, canSave.current, key.current);
      attempt.current = 0;
      setSync('synced');
    } catch {
      setSync('failed');
      const delay = RETRY_DELAYS[Math.min(attempt.current++, RETRY_DELAYS.length - 1)]!;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void pushNow(), delay);
    }
  }, []);

  const schedule = useCallback(() => {
    if (!userRef.current) return;
    setSync('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void pushNow(), 700);
  }, [pushNow]);

  useEffect(() => {
    storage.current = getStorage();
    load();
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === key.current) load(); };
    const onOnline = () => { if (userRef.current) void pushNow(); };
    addEventListener('storage', onStorage);
    addEventListener('online', onOnline);
    let unsub: (() => void) | undefined;
    if (ACCOUNTS_ENABLED) {
      void import('../lib/account/client').then(async ({ currentUser, supabase }) => {
        const signIn = (u: { id: string; email: string | null } | null) => {
          userRef.current = u;
          setAccount(u);
          key.current = u ? accountKey(u.id) : STORAGE_KEY;
          load();
          if (u) void pushNow(); else setSync('disabled');
        };
        signIn(await currentUser());
        const { data } = supabase().auth.onAuthStateChange((_e, session) => {
          const u = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
          if (u?.id !== userRef.current?.id) signIn(u);
        });
        unsub = () => data.subscription.unsubscribe();
      }).catch(() => setSync('failed'));
    }
    return () => { removeEventListener('storage', onStorage); removeEventListener('online', onOnline); unsub?.(); if (timer.current) clearTimeout(timer.current); };
  }, [load, pushNow]);

  const replace = useCallback((p: Progress): SaveResult => {
    latest.current = p;
    setProgress(p);
    const r = saveProgress(storage.current, p, canSave.current, key.current);
    setSaveError(r.ok ? null : r.reason);
    setSaveState(r.ok ? 'saved' : 'error');
    schedule();
    return r;
  }, [schedule]);

  const update = useCallback((f: (p: Progress) => Progress) => { replace(f(latest.current)); }, [replace]);
  const remember = useCallback((f: (p: Progress) => Progress) => {
    const p = f(latest.current);
    latest.current = p;
    setProgress(p);
    saveProgress(storage.current, p, canSave.current, key.current);
    schedule();
  }, [schedule]);

  return { progress, ready, status, saveError, saveState, sync, account, update, replace, remember };
}

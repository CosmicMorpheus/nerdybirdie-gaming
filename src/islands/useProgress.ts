import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { emptyProgress, STORAGE_KEY, type Progress } from '../lib/progress/model';
import { getStorage, loadProgress, saveProgress, type KV, type LoadStatus, type SaveResult } from '../lib/progress/store';

type SaveError = Exclude<SaveResult, { ok: true }>['reason'];

export interface ProgressState {
  progress: Progress;
  /** false until saved data has been read (after hydration) */
  ready: boolean;
  status: LoadStatus;
  saveError: SaveError | null;
  update: (f: (p: Progress) => Progress) => void;
  replace: (p: Progress) => SaveResult;
}

/** Saved progress for this browser. Changes in another tab are picked up too. */
export function useProgress(): ProgressState {
  const storage = useRef<KV | null>(null);
  const canSave = useRef(false);
  const latest = useRef<Progress>(emptyProgress());
  const [progress, setProgress] = useState<Progress>(latest.current);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('empty');
  const [saveError, setSaveError] = useState<SaveError | null>(null);

  const load = useCallback(() => {
    const r = loadProgress(storage.current);
    canSave.current = r.canSave;
    latest.current = r.progress;
    setProgress(r.progress);
    setStatus(r.status);
  }, []);

  useEffect(() => {
    storage.current = getStorage();
    load();
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) load(); };
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, [load]);

  const replace = useCallback((p: Progress): SaveResult => {
    latest.current = p;
    setProgress(p);
    const r = saveProgress(storage.current, p, canSave.current);
    setSaveError(r.ok ? null : r.reason);
    return r;
  }, []);

  const update = useCallback((f: (p: Progress) => Progress) => { replace(f(latest.current)); }, [replace]);

  return { progress, ready, status, saveError, update, replace };
}

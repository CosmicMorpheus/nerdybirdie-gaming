import { useProgress } from './useProgress';

/** "Continue where you left off" — shown only when there's somewhere to go back to. */
export default function ContinueButton() {
  const { progress, ready } = useProgress();
  const r = progress.prefs.resume;
  if (!ready || !r) return null;
  return <a class="btn btn-ghost continue" href={r.href}>↻ Continue: {r.label}</a>;
}

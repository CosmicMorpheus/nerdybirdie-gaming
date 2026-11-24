import { useEffect, useState } from 'preact/hooks';
import { ACCOUNTS_ENABLED } from '../lib/account/config';
import { guestTicks, mergeGuestIntoAccount } from '../lib/progress/merge';
import { getStorage, loadProgress, MERGE_DONE_KEY } from '../lib/progress/store';
import { STORAGE_KEY, type Progress } from '../lib/progress/model';
import { SaveStatus } from './SaveStatus';
import { useProgress } from './useProgress';
import './tracker.css';

/** Sign in / out and the one-time offer to add this device's guest progress to the account. */
export default function AccountPanel() {
  const state = useProgress();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [guest, setGuest] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state.account) return;
    const s = getStorage();
    if (!s || s.getItem(MERGE_DONE_KEY(state.account.id))) return;
    const g = loadProgress(s, STORAGE_KEY).progress;
    if (guestTicks(g) > 0) setGuest(g);
  }, [state.account?.id]);

  if (!ACCOUNTS_ENABLED) {
    return (
      <section class="panel">
        <h2>Accounts aren't switched on yet</h2>
        <p>Right now progress is saved <strong>in this browser on this device only</strong>. Use <a href="/progress/">My progress → Download backup</a> to keep a copy or move it.</p>
        <p class="small muted">Signing in to sync across devices will appear here once account storage is set up for the site.</p>
      </section>
    );
  }

  return (
    <div class="tracker">
      {state.account ? (
        <section class="panel">
          <h2>Signed in</h2>
          <p>{state.account.email ?? 'Your account'}: your progress saves to your account automatically and follows you to any device where you sign in.</p>
          <SaveStatus state={state} />
          <button type="button" class="btn btn-quiet" onClick={async () => { const { signOut } = await import('../lib/account/client'); await signOut(); setMsg({ kind: 'ok', text: 'Signed out. This device is back to guest progress.' }); }}>Sign out</button>
        </section>
      ) : (
        <section class="panel">
          <h2>Sign in to sync your progress</h2>
          <p class="muted">We'll email you a sign-in link. No password, no Discord, no wallet. You can keep using the guide without signing in.</p>
          <form class="btn-row" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { sendMagicLink } = await import('../lib/account/client');
            const err = await sendMagicLink(email.trim());
            setBusy(false);
            setMsg(err ? { kind: 'error', text: `Couldn't send the link: ${err}` } : { kind: 'ok', text: `Check ${email.trim()} for a sign-in link.` });
          }}>
            <label class="search-field"><span class="sr-only">Email address</span><input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} /></label>
            <button class="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a link'}</button>
          </form>
        </section>
      )}
      {state.account && guest && state.sync === 'synced' && (
        <div class="confirm" role="group" aria-label="Add this device's progress to your account">
          <p><strong>Add this device's progress to your account?</strong> This device has {guestTicks(guest)} ticks from before you signed in.
            They'll be added to your account. Nothing on your account is unticked or replaced, including anything you deliberately unticked there.</p>
          <button type="button" class="btn btn-primary" onClick={() => {
            const { merged, added } = mergeGuestIntoAccount(state.progress, guest);
            state.replace(merged);
            getStorage()?.setItem(MERGE_DONE_KEY(state.account!.id), new Date().toISOString());
            setGuest(null);
            setMsg({ kind: 'ok', text: `Added ${added} tick${added === 1 ? '' : 's'} to your account.` });
          }}>Add to my account</button>
          <button type="button" class="btn btn-quiet" onClick={() => { getStorage()?.setItem(MERGE_DONE_KEY(state.account!.id), 'declined'); setGuest(null); }}>Not now</button>
        </div>
      )}
      {msg && <p class={msg.kind === 'error' ? 'notice error' : 'notice'} role="status">{msg.text}</p>}
    </div>
  );
}

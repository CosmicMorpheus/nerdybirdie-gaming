import { emptyContext, type ContextProgress, type Progress } from './model';

const t = (s: string | undefined) => (s ? Date.parse(s) : -Infinity);

/**
 * Two copies of the SAME player's progress (two devices, or device vs account): per item, the newest action wins.
 * A tick newer than an untick stays ticked; an untick newer than a tick stays unticked. Items only one side has
 * touched are kept. Notes: the side whose context changed most recently wins a conflict; saved items are combined.
 */
export function syncMerge(a: Progress, b: Progress): Progress {
  const contexts: Record<string, ContextProgress> = {};
  for (const key of new Set([...Object.keys(a.contexts), ...Object.keys(b.contexts)])) {
    const x = a.contexts[key] ?? emptyContext();
    const y = b.contexts[key] ?? emptyContext();
    const out = emptyContext();
    for (const id of new Set([...Object.keys(x.completed), ...Object.keys(x.unchecked), ...Object.keys(y.completed), ...Object.keys(y.unchecked)])) {
      const tick = Math.max(t(x.completed[id]), t(y.completed[id]));
      const untick = Math.max(t(x.unchecked[id]), t(y.unchecked[id]));
      if (tick > untick) {
        // keep the earliest completion time of the copies that are ticked
        const times = [x.completed[id], y.completed[id]].filter(Boolean) as string[];
        out.completed[id] = times.sort((m, n) => t(m) - t(n))[0]!;
      } else {
        out.unchecked[id] = (t(x.unchecked[id]) >= t(y.unchecked[id]) ? x.unchecked[id] : y.unchecked[id])!;
      }
    }
    const newer = t(a.updatedAt) >= t(b.updatedAt) ? [y, x] : [x, y];
    out.notes = { ...newer[0]!.notes, ...newer[1]!.notes };
    out.bookmarks = [...new Set([...x.bookmarks, ...y.bookmarks])];
    contexts[key] = out;
  }
  const [older, newer] = t(a.updatedAt) >= t(b.updatedAt) ? [b, a] : [a, b];
  return {
    ...newer,
    contexts,
    prefs: { ...older.prefs, ...newer.prefs, platformByGame: { ...older.prefs.platformByGame, ...newer.prefs.platformByGame }, map: newer.prefs.map },
    updatedAt: new Date(Math.max(t(a.updatedAt), t(b.updatedAt), 0)).toISOString(),
  };
}

/**
 * One-time merge of a guest (signed-out) device into an account, offered after sign-in.
 * The account's data is preserved: a guest tick is added only for items the account has never ticked or unticked,
 * so a deliberate untick on the account is never undone. Saved items are combined; account notes and settings win.
 */
export function mergeGuestIntoAccount(account: Progress, guest: Progress, now = new Date()): { merged: Progress; added: number; conflictsKept: number } {
  const contexts: Record<string, ContextProgress> = {};
  let added = 0;
  let conflictsKept = 0;
  for (const key of new Set([...Object.keys(account.contexts), ...Object.keys(guest.contexts)])) {
    const a = account.contexts[key] ?? emptyContext();
    const g = guest.contexts[key] ?? emptyContext();
    const completed = { ...a.completed };
    for (const [id, at] of Object.entries(g.completed)) {
      if (id in a.unchecked) { conflictsKept++; continue; }
      if (!(id in completed)) { completed[id] = at; added++; }
      else if (t(at) < t(completed[id])) completed[id] = at;
    }
    for (const id of Object.keys(g.notes)) if (a.notes[id] && a.notes[id] !== g.notes[id]) conflictsKept++;
    contexts[key] = { completed, unchecked: { ...a.unchecked }, bookmarks: [...new Set([...a.bookmarks, ...g.bookmarks])], notes: { ...g.notes, ...a.notes } };
  }
  return {
    merged: { ...account, contexts, prefs: { ...guest.prefs, ...account.prefs, platformByGame: { ...guest.prefs.platformByGame, ...account.prefs.platformByGame } }, updatedAt: now.toISOString() },
    added,
    conflictsKept,
  };
}

/** Count of ticks a guest merge would add (for the prompt). */
export function guestTicks(p: Progress): number {
  return Object.values(p.contexts).reduce((n, c) => n + Object.keys(c.completed).length, 0);
}

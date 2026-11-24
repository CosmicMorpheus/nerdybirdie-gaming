import { emptyContext, type ContextProgress, type Progress } from './model';

/**
 * Merge rule for when account storage exists: combine guest (this-browser) progress into account progress.
 * Nothing is ever unticked or deleted by a merge:
 *  - ticks: union; if both have one, keep the earlier completion time
 *  - saved items: union
 *  - notes: the account's note wins if both exist and differ; otherwise keep whichever exists
 *  - preferences: the account's win
 * Not used yet: the site has no accounts (see docs/ACCOUNTS.md).
 */
export function mergeProgress(account: Progress, guest: Progress, now = new Date()): { merged: Progress; added: number; conflictsKept: number } {
  const contexts: Record<string, ContextProgress> = {};
  let added = 0;
  let conflictsKept = 0;
  for (const key of new Set([...Object.keys(account.contexts), ...Object.keys(guest.contexts)])) {
    const a = account.contexts[key] ?? emptyContext();
    const g = guest.contexts[key] ?? emptyContext();
    const completed = { ...a.completed };
    for (const [id, at] of Object.entries(g.completed)) {
      if (!(id in completed)) { completed[id] = at; added++; }
      else if (Date.parse(at) < Date.parse(completed[id]!)) completed[id] = at;
    }
    const notes = { ...g.notes, ...a.notes };
    for (const id of Object.keys(g.notes)) if (a.notes[id] && a.notes[id] !== g.notes[id]) conflictsKept++;
    contexts[key] = { completed, bookmarks: [...new Set([...a.bookmarks, ...g.bookmarks])], notes };
  }
  return {
    merged: { ...account, contexts, prefs: { ...guest.prefs, ...account.prefs, platformByGame: { ...guest.prefs.platformByGame, ...account.prefs.platformByGame } }, updatedAt: now.toISOString() },
    added,
    conflictsKept,
  };
}

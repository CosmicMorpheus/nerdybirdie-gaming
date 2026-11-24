export interface Tally {
  done: number;
  total: number;
  /** null when there is nothing to count: an empty list is never "100%". */
  percent: number | null;
}

export function tally(ids: readonly string[], completed: Record<string, string>): Tally {
  const total = ids.length;
  const done = ids.reduce((n, id) => n + (id in completed ? 1 : 0), 0);
  return { done, total, percent: total === 0 ? null : Math.floor((done / total) * 100) };
}

/** Overall and per-category totals. Ticks for ids not in the list (retired, other platform) don't count. */
export function progressFor(
  objectives: readonly { id: string; category: string }[],
  completed: Record<string, string>,
  categoryIds: readonly string[],
): { overall: Tally; byCategory: Record<string, Tally> } {
  const byCategory: Record<string, Tally> = {};
  for (const c of categoryIds)
    byCategory[c] = tally(objectives.filter((o) => o.category === c).map((o) => o.id), completed);
  return { overall: tally(objectives.map((o) => o.id), completed), byCategory };
}

export function formatTally(t: Tally): string {
  return t.percent === null ? 'Not verified yet' : `${t.done} of ${t.total}`;
}

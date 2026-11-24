/** Player ranks and checkpoints. Purely cosmetic: ticks are self-reported and never earn anything real. */
export interface Rank { min: number; title: string; level: number }

export const RANKS: Rank[] = [
  { min: 0, title: 'New Arrival', level: 1 },
  { min: 10, title: 'Local', level: 2 },
  { min: 25, title: 'Hustler', level: 3 },
  { min: 50, title: 'Big Shot', level: 4 },
  { min: 75, title: 'Legend', level: 5 },
  // Top rank means "our published list is cleared", never "the game is 100% complete".
  { min: 100, title: 'List Cleared', level: 6 },
];

export const CHECKPOINTS = [25, 50, 75, 100] as const;

/** null percent (nothing verified to count) gives no rank. */
export function rankFor(percent: number | null): Rank | null {
  if (percent === null) return null;
  let r = RANKS[0]!;
  for (const x of RANKS) if (percent >= x.min) r = x;
  return r;
}

export function nextRank(percent: number | null): Rank | null {
  if (percent === null) return null;
  return RANKS.find((r) => r.min > percent) ?? null;
}

/** The checkpoint crossed going from `before` to `after`, if any (only upward). */
export function crossedCheckpoint(before: number | null, after: number | null): number | null {
  if (before === null || after === null || after <= before) return null;
  const hit = CHECKPOINTS.filter((c) => before < c && after >= c);
  return hit.length ? hit[hit.length - 1]! : null;
}

/**
 * What to do next: missable first (they can be lost), then saved items, then the rest in list order.
 * Spoiler-safe: the caller shows safe titles unless revealed.
 */
export function nextUp<T extends { id: string; missable: boolean | 'unknown' }>(
  list: readonly T[], completed: Record<string, string>, bookmarks: readonly string[], limit = 3,
): T[] {
  const todo = list.filter((o) => !(o.id in completed));
  const score = (o: T) => (o.missable === true ? 0 : bookmarks.includes(o.id) ? 1 : 2);
  return todo.map((o, i) => ({ o, i })).sort((a, b) => score(a.o) - score(b.o) || a.i - b.i).slice(0, limit).map((x) => x.o);
}

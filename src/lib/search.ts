/** Search over spoiler-safe fields only. Protected text is never passed in, so it can't leak into results. */
export interface SearchDoc {
  id: string;
  title: string;
  text: string;
  url: string;
  kind: string;
}

export function normalize(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Every word in the query must appear. Title matches rank first. */
export function search<T extends { title: string; text: string }>(docs: readonly T[], query: string, limit = 50): T[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const scored: { d: T; s: number }[] = [];
  for (const d of docs) {
    const t = normalize(d.title);
    const all = `${t} ${normalize(d.text)}`;
    if (!words.every((w) => all.includes(w))) continue;
    scored.push({ d, s: words.reduce((n, w) => n + (t.includes(w) ? 2 : 1), 0) + (t.startsWith(words[0]!) ? 1 : 0) });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.d);
}

import type { Entry } from '../content/schema';
import { watchUrl, parseVideoUrl } from '../video';
import type { Intent } from './intent';
import type { AskAction, AskDoc } from './retrieve';

type EntryLike = Omit<Entry, 'details'> & { hasDetails?: boolean; details?: Entry['details'] };

/** A guide entry as an ASK item. Uses only spoiler-free fields; `details` stays out. */
export function entryDoc(e: EntryLike, sectionLabel: string, base = '/games/gta-vi'): AskDoc {
  const facts = e.facts.map((f) => `${f.label}: ${f.value}`).join('. ');
  const answers = new Set<Intent>(['info']);
  if (e.mapPinIds.length || e.facts.some((f) => /location|where|found at|spawn/i.test(f.label))) answers.add('location');
  if (e.steps.length || e.facts.some((f) => /available|requires|unlock|prerequisite/i.test(f.label))) { answers.add('unlock'); answers.add('howto'); }
  if (e.facts.some((f) => /keep|after the mission/i.test(`${f.label} ${f.value}`))) answers.add('keep');
  if (e.category === 'money') answers.add('money');
  const actions: AskAction[] = [{ label: 'Open checklist', href: `${base}/guides/${e.category}/#entry-${e.slug}`, kind: 'checklist' }];
  if (e.mapPinIds[0]) actions.unshift({ label: 'Show on map', href: `${base}/map/?pin=${e.mapPinIds[0].split(':').pop()}`, kind: 'map' });
  return {
    id: e.id, kind: 'entry', title: e.title, text: [e.summary, facts].filter(Boolean).join(' '), category: sectionLabel,
    spoilerLevel: e.spoilerLevel, hasSpoilerDetails: e.hasDetails ?? !!e.details, verification: e.verification, answers: [...answers],
    sources: e.sources.map((s) => ({ publisher: s.publisher, title: s.title, url: s.url, checkedAt: s.checkedAt })), actions,
  };
}

export function pinDoc(p: { id: string; src: string; name: string; type: string; area: string | null; region: string | null; note: string; spoiler: 'none' | 'minor' | 'major'; kind: string }, categoryLabel: string, credit: { publisher: string; url: string; checkedAt: string }, base = '/games/gta-vi'): AskDoc {
  const where = p.area ?? (p.region ? p.region.replace(/(^|-)([a-z])/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase()) : null);
  return {
    id: p.id, kind: 'pin', title: p.name, text: `${p.type}${where ? ` in ${where}` : ''}. Pinned on our map.${p.spoiler === 'none' && p.note ? ` ${p.note}` : ''}`,
    category: categoryLabel, spoilerLevel: p.spoiler, hasSpoilerDetails: p.spoiler !== 'none', verification: 'community', answers: ['location', 'info'],
    sources: [{ publisher: credit.publisher, title: 'Open GTA 6 Map data', url: credit.url, checkedAt: credit.checkedAt }],
    actions: [{ label: 'Show on map', href: `${base}/map/?pin=${p.src}`, kind: 'map' }],
  };
}

/** Approved videos only: one item per moment, titled with our spoiler-safe label. */
export function videoDocs(v: { url: string; title: string; creator: string; spoilerLevel: 'none' | 'minor' | 'major'; moments: { target: string; start: number | null; label: string }[] }): AskDoc[] {
  const p = parseVideoUrl(v.url);
  if (!p) return [];
  return v.moments.map((m, i) => ({
    id: `${v.url}#${i}`, kind: 'video' as const, title: m.label, text: `Video by ${v.creator}.`, category: 'Videos',
    spoilerLevel: v.spoilerLevel, hasSpoilerDetails: v.spoilerLevel !== 'none', verification: 'confirmed' as const, answers: ['location', 'howto', 'info'] as Intent[],
    sources: [{ publisher: v.creator, title: v.title, url: v.url, checkedAt: null, creator: v.creator }],
    actions: [{ label: 'Watch walkthrough', href: watchUrl(v.url, p, m.start), kind: 'video' as const }],
  }));
}

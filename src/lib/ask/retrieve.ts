import { normalize } from '../search';
import type { SpoilerMode } from '../spoilers';
import { modeAllows } from '../spoilers';
import { intentOf, subjectTokens, type Intent } from './intent';

export interface AskAction { label: string; href: string; kind: 'map' | 'checklist' | 'video' | 'guide' | 'discord' }
export interface AskSource { publisher: string; title: string; url: string; checkedAt: string | null; creator?: string | null }

/** One searchable item from the published guide. Every text field is spoiler-safe. */
export interface AskDoc {
  id: string;
  kind: 'entry' | 'pin' | 'objective' | 'video';
  title: string;
  text: string;
  category: string;
  spoilerLevel: 'none' | 'minor' | 'major';
  /** There is hidden spoiler text the player can choose to reveal. */
  hasSpoilerDetails: boolean;
  verification: 'confirmed' | 'unconfirmed' | 'rumor' | 'community';
  /** Which intents this item can answer (e.g. a map pin answers "location"). */
  answers: Intent[];
  sources: AskSource[];
  actions: AskAction[];
}

export interface Hit { doc: AskDoc; score: number; subjectMatch: number }

export function retrieve(question: string, docs: readonly AskDoc[], limit = 5): Hit[] {
  const subj = subjectTokens(question);
  if (!subj.length) return [];
  const hits: Hit[] = [];
  for (const doc of docs) {
    const title = normalize(doc.title);
    const all = `${title} ${normalize(doc.text)} ${normalize(doc.category)}`;
    let score = 0, inTitle = 0;
    for (const w of subj) {
      if (new RegExp(`\\b${w}`).test(title)) { score += 3; inTitle++; }
      else if (new RegExp(`\\b${w}`).test(all)) score += 1;
    }
    if (score) hits.push({ doc, score, subjectMatch: inTitle / subj.length });
  }
  return hits.sort((a, b) => b.score - a.score || b.subjectMatch - a.subjectMatch).slice(0, limit);
}

export type Coverage = 'answered' | 'partial' | 'none';
export interface GuideAnswer {
  coverage: Coverage;
  intent: Intent;
  /** Best match, if any. */
  top: Hit | null;
  /** Spoiler-safe short answer built from our own guide text. */
  text: string;
  actions: AskAction[];
  /** Set when the best answer has spoiler details the player hasn't allowed: offer a reveal instead of showing it. */
  spoilerGate: { id: string; level: 'minor' | 'major' } | null;
  confirms: string[];
}

/** Answer from the published guide only. "partial" = we know the thing, but not the specific detail asked. */
export function answerFromGuide(question: string, docs: readonly AskDoc[], mode: SpoilerMode): GuideAnswer {
  const intent = intentOf(question);
  const hits = retrieve(question, docs);
  const top = hits[0] ?? null;
  if (!top || top.subjectMatch < 0.5) return { coverage: 'none', intent, top: null, text: '', actions: [], spoilerGate: null, confirms: [] };
  const d = top.doc;
  const covers = d.answers.includes(intent) || (intent === 'info' && d.text.length > 0) || (intent === 'howto' && d.answers.includes('unlock'));
  const gate = d.hasSpoilerDetails && d.spoilerLevel !== 'none' && !modeAllows(d.spoilerLevel, mode) ? { id: d.id, level: d.spoilerLevel } : null;
  const label = d.verification === 'confirmed' ? 'Our guide (confirmed)' : d.verification === 'community' ? 'Our map (community-reported, not yet confirmed)' : `Our guide (${d.verification})`;
  return {
    coverage: covers ? 'answered' : 'partial',
    intent,
    top,
    text: `${label}: ${d.title}. ${d.text}`,
    actions: d.actions,
    spoilerGate: gate,
    confirms: covers ? [`${d.title}: ${d.text}`] : [],
  };
}

import type { SpoilerMode } from '../spoilers';
import { modeAllows } from '../spoilers';
import { clusterKey } from './intent';
import { entryDoc } from './docs';
import { getOverrides, recordQuestion } from './queue';
import type { Findings, Researcher } from './research';
import { answerFromGuide, type AskAction, type AskDoc, type GuideAnswer } from './retrieve';
import type { JsonStore } from './store';

export interface AskConfig {
  limits: { questionsPerVisitorPerDay: number; webSearchesPerDay: number; maxWebSearchesPerQuestion: number; answerCacheHours: number };
}
export interface AskDeps {
  store: JsonStore;
  /** Published guide items (from /data/<game>/ask-index.json). */
  docs: AskDoc[];
  sectionLabels: Record<string, string>;
  /** null when live search isn't configured: the guide still answers and questions are still recorded. */
  researcher: Researcher | null;
  config: AskConfig;
  community: { label: string; href: string } | null;
  now?: Date;
}
export interface AskResult {
  status: 'guide' | 'guide+outside' | 'outside' | 'unanswered';
  guide: Pick<GuideAnswer, 'coverage' | 'text' | 'actions' | 'spoilerGate' | 'confirms'> & { title: string | null; sources: AskDoc['sources'] };
  outside: (Findings & { cached: boolean; checkedAt: string }) | null;
  /** Spoiler-safe: true when outside findings include a spoiler the player's setting hides. */
  outsideSpoilerHidden: boolean;
  notes: string[];
  recorded: { itemId: string; count: number } | null;
  community: { label: string; href: string } | null;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Answer one player question: our guide first, then (only for what's missing) outside sources, and queue the gap. */
export async function ask(question: string, spoilerMode: SpoilerMode, visitor: string, deps: AskDeps): Promise<AskResult> {
  const now = deps.now ?? new Date();
  const q = question.trim().slice(0, 300);
  const notes: string[] = [];

  // Approved corrections apply immediately, ahead of the next site build.
  const overrides = await getOverrides(deps.store);
  const docs = deps.docs.filter((d) => !overrides[d.id]).concat(Object.values(overrides).map((o) => entryDoc(o.entry, deps.sectionLabels[o.entry.category] ?? o.entry.category)));
  const g = answerFromGuide(q, docs, spoilerMode);
  const guide = { coverage: g.coverage, text: g.text, actions: g.actions, spoilerGate: g.spoilerGate, confirms: g.confirms, title: g.top?.doc.title ?? null, sources: g.top?.doc.sources ?? [] };
  if (g.coverage === 'answered') return { status: 'guide', guide, outside: null, outsideSpoilerHidden: false, notes, recorded: null, community: null };

  // Usage limits keep the guide free to run. Over a limit, the guide answer still works and the question is still recorded.
  const vKey = `limits/visitor/${day(now)}/${visitor}`;
  const vCount = ((await deps.store.get<number>(vKey)) ?? 0) + 1;
  await deps.store.set(vKey, vCount);
  const wKey = `limits/web/${day(now)}`;
  const webUsed = (await deps.store.get<number>(wKey)) ?? 0;

  const key = clusterKey(q, g.top && g.top.subjectMatch >= 0.5 ? g.top.doc.id : null);
  const cacheKey = `cache/${key}`;
  let outside: AskResult['outside'] = null;
  const cached = await deps.store.get<{ at: string; findings: Findings }>(cacheKey);
  if (cached && now.getTime() - Date.parse(cached.at) < deps.config.limits.answerCacheHours * 3600_000) {
    outside = { ...cached.findings, cached: true, checkedAt: cached.at };
  } else if (!deps.researcher) {
    notes.push('Live web search is switched off right now, so this answer only uses our guide.');
  } else if (vCount > deps.config.limits.questionsPerVisitorPerDay || webUsed + deps.config.limits.maxWebSearchesPerQuestion > deps.config.limits.webSearchesPerDay) {
    notes.push("We've hit today's limit for live searches, so this answer only uses our guide.");
  } else {
    await deps.store.set(wKey, webUsed + deps.config.limits.maxWebSearchesPerQuestion);
    const guideContext = g.top ? `${g.top.doc.title}: ${g.top.doc.text}` : 'Our guide has nothing on this yet.';
    try {
      const f = await deps.researcher.research(q, guideContext, spoilerMode);
      if (f) { outside = { ...f, cached: false, checkedAt: now.toISOString() }; await deps.store.set(cacheKey, { at: now.toISOString(), findings: f }); }
    } catch {
      notes.push("Live search didn't respond, so this answer only uses our guide.");
    }
  }

  const affected = g.top && g.top.subjectMatch >= 0.5 ? { id: g.top.doc.id, title: g.top.doc.title, href: g.top.doc.actions[0]?.href ?? '' } : null;
  const gap = g.coverage === 'partial' ? `Our guide has "${affected!.title}" but doesn't answer the ${g.intent} question.` : 'Nothing in our guide covers this yet.';
  const item = await recordQuestion(deps.store, { question: q, clusterKey: key, intent: g.intent, affected, gap, findings: outside ? stripMeta(outside) : null, now });
  notes.push("We've added this to our guide's update list so the next player gets a direct answer.");

  const unresolved = !outside || outside.uncertain.length > 0 || outside.disagreements.length > 0;
  return {
    status: outside ? (g.coverage === 'partial' ? 'guide+outside' : 'outside') : 'unanswered',
    guide,
    outside,
    outsideSpoilerHidden: !!outside?.spoilerDetail && !modeAllows(outside.spoilerLevel, spoilerMode),
    notes,
    recorded: { itemId: item.id, count: item.count },
    community: unresolved ? deps.community : null,
  };
}

function stripMeta(o: NonNullable<AskResult['outside']>): Findings {
  const { cached: _c, checkedAt: _a, ...f } = o;
  return f;
}

export type { AskAction };

import { Entry } from '../content/schema';
import type { JsonStore } from './store';
import type { Findings } from './research';
import type { Intent } from './intent';

export type ItemStatus = 'open' | 'needs-verification' | 'approved' | 'dismissed';
export interface QueueItem {
  id: string;
  clusterKey: string;
  intent: Intent;
  /** What players want to know (the first phrasing; others are in `questions`). */
  title: string;
  questions: { text: string; at: string }[];
  count: number;
  firstAt: string;
  lastAt: string;
  origin: 'player' | 'source-check';
  /** The guide entry or map pin this is about, if one exists. */
  affected: { id: string; title: string; href: string } | null;
  /** What our guide is missing or may have wrong. */
  gap: string;
  findings: Findings | null;
  findingsCheckedAt: string | null;
  /** The editable draft that approval would publish (a full guide entry). */
  draft: unknown | null;
  needsVerification: string[];
  status: ItemStatus;
  log: { at: string; action: string; note?: string }[];
}

export interface Override { entry: Entry; approvedAt: string; itemId: string; version: number }
export interface HistoryRecord { id: string; at: string; itemId: string; entryId: string; before: Override | null; after: Override | null; undoneAt?: string }

const ITEM = (id: string) => `queue/${id}`;
const OVERRIDES = 'overrides/entries';
const HISTORY = 'history/log';
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60);

/**
 * Add a question to the queue: a new item, or +1 on the item for the same gap (same cluster key).
 * Popularity only raises review priority; it never changes verification.
 */
export async function recordQuestion(store: JsonStore, q: {
  question: string; clusterKey: string; intent: Intent; affected: QueueItem['affected']; gap: string;
  findings: Findings | null; origin?: QueueItem['origin']; now?: Date;
}): Promise<QueueItem> {
  const now = (q.now ?? new Date()).toISOString();
  const id = slug(q.clusterKey);
  const existing = await store.get<QueueItem>(ITEM(id));
  const needs = (f: Findings | null) => [
    ...(f?.disagreements.map((d) => `Sources disagree: ${d}`) ?? []),
    ...(f?.uncertain ?? []),
    ...(f && f.sources.length < 2 ? ['Only one outside source; needs a second independent source or direct gameplay evidence.'] : []),
    ...(!f ? ['No reliable answer found yet.'] : []),
  ];
  if (existing && existing.status !== 'approved' && existing.status !== 'dismissed') {
    existing.questions.push({ text: q.question, at: now });
    existing.count++;
    existing.lastAt = now;
    if (q.findings) {
      existing.findings = q.findings;
      existing.findingsCheckedAt = now;
      existing.needsVerification = needs(q.findings);
      existing.draft ??= draftFrom(q.findings, existing);
      existing.log.push({ at: now, action: 'findings updated' });
    }
    await store.set(ITEM(id), existing);
    return existing;
  }
  const item: QueueItem = {
    id, clusterKey: q.clusterKey, intent: q.intent, title: q.question, questions: [{ text: q.question, at: now }], count: 1,
    firstAt: now, lastAt: now, origin: q.origin ?? 'player', affected: q.affected, gap: q.gap,
    findings: q.findings, findingsCheckedAt: q.findings ? now : null, draft: null, needsVerification: needs(q.findings),
    status: 'open', log: [{ at: now, action: existing ? 'reopened' : 'created' }],
  };
  item.draft = q.findings ? draftFrom(q.findings, item) : null;
  await store.set(ITEM(id), item);
  return item;
}

/** A complete draft guide entry from findings (unverified until a human approves it). */
function draftFrom(f: Findings, item: QueueItem) {
  if (!f.proposed) return null;
  const s = slug(f.proposed.title);
  return {
    id: item.affected?.id.startsWith('gta-vi:entry:') ? item.affected.id : `gta-vi:entry:${s}`,
    gameId: 'gta-vi', slug: item.affected?.id.startsWith('gta-vi:entry:') ? item.affected.id.split(':').pop() : s,
    category: f.proposed.category, title: f.proposed.title, summary: f.proposed.summary, steps: f.proposed.steps, facts: f.proposed.facts,
    chapter: null, mode: 'story', spoilerLevel: f.spoilerLevel, details: f.spoilerDetail ? { summary: f.spoilerDetail, steps: [] } : null,
    verification: f.disagreements.length || f.sources.length < 2 ? 'unconfirmed' : 'confirmed',
    sources: f.sources.map((x) => ({ publisher: x.publisher, title: x.title, url: x.url, checkedAt: (x.checkedAt ?? new Date().toISOString()).slice(0, 10) })),
    platformNote: f.platform, gameVersion: f.patch, mapPinIds: [], objectiveIds: [], status: 'published',
  };
}

/** Review list: open items first, most-asked first, then most recent. */
export async function listQueue(store: JsonStore): Promise<QueueItem[]> {
  const items = (await Promise.all((await store.list('queue/')).map((k) => store.get<QueueItem>(k)))).filter(Boolean) as QueueItem[];
  const rank = { open: 0, 'needs-verification': 1, approved: 2, dismissed: 3 } as const;
  return items.sort((a, b) => rank[a.status] - rank[b.status] || b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

export async function getOverrides(store: JsonStore): Promise<Record<string, Override>> {
  return (await store.get<Record<string, Override>>(OVERRIDES)) ?? {};
}
export async function getHistory(store: JsonStore): Promise<HistoryRecord[]> {
  return (await store.get<HistoryRecord[]>(HISTORY)) ?? [];
}

/**
 * Publish an item's (edited) draft as a guide entry. Validated against the same schema as the guide.
 * Entry ids are kept, so players' saved ticks stay attached. Every change is recorded for undo.
 */
export async function approve(store: JsonStore, itemId: string, editedDraft?: unknown, now = new Date()): Promise<{ ok: true; entry: Entry } | { ok: false; error: string }> {
  const item = await store.get<QueueItem>(ITEM(itemId));
  if (!item) return { ok: false, error: 'No such item' };
  const parsed = Entry.safeParse(editedDraft ?? item.draft);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  if (parsed.data.spoilerLevel !== 'none' && !parsed.data.details) return { ok: false, error: 'Spoiler entries need "details" (keep the visible text spoiler-free).' };
  if (parsed.data.sources.length === 0) return { ok: false, error: 'At least one source is required.' };
  const overrides = await getOverrides(store);
  const before = overrides[parsed.data.id] ?? null;
  const after: Override = { entry: parsed.data, approvedAt: now.toISOString(), itemId, version: (before?.version ?? 0) + 1 };
  overrides[parsed.data.id] = after;
  await store.set(OVERRIDES, overrides);
  const history = await getHistory(store);
  history.push({ id: `h${history.length + 1}`, at: now.toISOString(), itemId, entryId: parsed.data.id, before, after });
  await store.set(HISTORY, history);
  item.status = 'approved';
  item.draft = parsed.data;
  item.log.push({ at: now.toISOString(), action: 'approved', note: `published ${parsed.data.id} v${after.version}` });
  await store.set(ITEM(itemId), item);
  return { ok: true, entry: parsed.data };
}

export async function setStatus(store: JsonStore, itemId: string, status: 'dismissed' | 'needs-verification' | 'open', note?: string, now = new Date()) {
  const item = await store.get<QueueItem>(ITEM(itemId));
  if (!item) return null;
  item.status = status;
  item.log.push({ at: now.toISOString(), action: status, note });
  await store.set(ITEM(itemId), item);
  return item;
}

export async function saveDraft(store: JsonStore, itemId: string, draft: unknown, now = new Date()) {
  const item = await store.get<QueueItem>(ITEM(itemId));
  if (!item) return null;
  item.draft = draft;
  item.log.push({ at: now.toISOString(), action: 'draft edited' });
  await store.set(ITEM(itemId), item);
  return item;
}

/** Undo a published change: restore what was there before (or remove the override). The item reopens for review. */
export async function undo(store: JsonStore, historyId: string, now = new Date()): Promise<boolean> {
  const history = await getHistory(store);
  const rec = history.find((h) => h.id === historyId);
  if (!rec || rec.undoneAt) return false;
  const overrides = await getOverrides(store);
  if (rec.before) overrides[rec.entryId] = rec.before; else delete overrides[rec.entryId];
  await store.set(OVERRIDES, overrides);
  rec.undoneAt = now.toISOString();
  history.push({ id: `h${history.length + 1}`, at: now.toISOString(), itemId: rec.itemId, entryId: rec.entryId, before: rec.after, after: rec.before });
  await store.set(HISTORY, history);
  await setStatus(store, rec.itemId, 'open', `undo of ${historyId}`, now);
  return true;
}

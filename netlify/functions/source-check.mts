import type { Config } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { recordQuestion } from '../../src/lib/ask/queue.ts';
import { askConfig, researcher, store } from '../lib/shared.mts';

/**
 * Scheduled check of trusted sources (content/ask/config.json → sourceChecks). When a page changes, live research
 * drafts what changed into the same review queue. Nothing is published automatically. Set SOURCE_CHECKS=on to enable.
 */
export default async () => {
  if (process.env.SOURCE_CHECKS !== 'on') return new Response('source checks off');
  const s = store();
  const r = researcher();
  const report: string[] = [];
  for (const src of askConfig.sourceChecks) {
    try {
      const res = await fetch(src.url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) { report.push(`${src.id}: HTTP ${res.status}`); continue; }
      const hash = createHash('sha256').update(await res.text()).digest('hex');
      const prev = await s.get<{ hash: string }>(`sources/${src.id}`);
      await s.set(`sources/${src.id}`, { hash, checkedAt: new Date().toISOString() });
      if (!prev || prev.hash === hash) { report.push(`${src.id}: ${prev ? 'unchanged' : 'baseline saved'}`); continue; }
      if (!r) { report.push(`${src.id}: changed (no API key, not drafted)`); continue; }
      const q = `What changed for GTA VI on ${src.name} (${src.url})? Look for: ${src.looksFor}. Report only new or corrected information.`;
      const f = await r.research(q, 'Compare with what a GTA VI guide would already know; report only changes.', 'safe');
      // One item per source+topic: repeated coverage of the same discovery updates the existing item.
      const topic = (f?.proposed?.title ?? 'update').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      await recordQuestion(s, { question: q, clusterKey: `source:${src.id}:${topic}`, intent: 'info', affected: null, gap: `${src.name} changed since the last check.`, findings: f, origin: 'source-check' });
      report.push(`${src.id}: changed → drafted`);
    } catch (e) {
      report.push(`${src.id}: ${(e as Error).message}`);
    }
  }
  return new Response(report.join('\n'));
};
// Daily at 06:17 UTC. Change here to adjust; sources and what to look for are in content/ask/config.json.
export const config: Config = { schedule: '17 6 * * *' };

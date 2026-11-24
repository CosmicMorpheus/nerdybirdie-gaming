import type { APIRoute } from 'astro';
import { games, getPlatform, publicObjectives } from '../../lib/content/load';
import type { SearchDoc } from '../../lib/search';

/** Search index built from spoiler-safe fields only. */
export const GET: APIRoute = () => {
  const docs: SearchDoc[] = [];
  for (const g of games) {
    docs.push({ id: g.id, title: g.title, text: g.summary, url: `/games/${g.id}/`, kind: 'Game' });
    docs.push({ id: `${g.id}:tracker`, title: `${g.shortTitle} achievements & trophies tracker`, text: 'Track achievements and trophies, spoiler-free', url: `/games/${g.id}/achievements/`, kind: 'Tracker' });
    for (const o of publicObjectives(g.id)) {
      const platforms = o.platformIds.map((p) => getPlatform(p).shortLabel).join(', ');
      docs.push({ id: o.id, title: o.safeTitle, text: `${o.safeSummary} · ${platforms}`, url: `/games/${g.id}/achievements/`, kind: getPlatform(o.platformIds[0]!).objectiveNoun.replace(/s$/, '') });
    }
  }
  docs.push({ id: 'progress', title: 'My progress', text: 'Back up and restore your saved progress', url: '/progress/', kind: 'Page' });
  return new Response(JSON.stringify(docs), { headers: { 'content-type': 'application/json' } });
};

import type { APIRoute } from 'astro';
import { creatorDoc, entryDoc, pinDoc, videoDocs } from '../../../lib/ask/docs';
import type { AskDoc } from '../../../lib/ask/retrieve';
import { creatorsFor, games, getPlatform, mapData, publicEntries, publicObjectives, videosFor } from '../../../lib/content/load';
import { DISCOVERY_FEED } from '../../../config';

/** Everything ASK "COZMC" can search: published entries, exact map pins, achievements, approved videos, creators we follow. Spoiler-free fields only. */
export function getStaticPaths() { return games.map((g) => ({ params: { game: g.id } })); }
export const GET: APIRoute = ({ params }) => {
  const game = games.find((g) => g.id === params.game)!;
  const label = Object.fromEntries(game.guideCategories.map((c) => [c.id, c.label]));
  const docs: AskDoc[] = publicEntries(game.id).map((e) => entryDoc(e, label[e.category] ?? e.category));
  const m = mapData(game.id);
  if (m) {
    const cat = new Map(m.categories.map((c) => [c.id, c.label]));
    for (const p of m.pins) docs.push(pinDoc(p, cat.get(p.kind) ?? p.kind, { publisher: m.provenance.source, url: m.provenance.repo, checkedAt: m.provenance.checkedAt }));
  }
  for (const o of publicObjectives(game.id)) {
    docs.push({ id: o.id, kind: 'objective', title: o.safeTitle, text: `${o.safeSummary} (${o.platformIds.map((p) => getPlatform(p).shortLabel).join(', ')})`,
      category: 'Achievements & trophies', spoilerLevel: o.spoilerLevel, hasSpoilerDetails: o.hasProtected, verification: o.draft ? 'unconfirmed' : 'confirmed',
      answers: ['unlock', 'howto', 'info'], sources: [], actions: [{ label: 'Open checklist', href: `/games/${game.id}/achievements/`, kind: 'checklist' }] });
  }
  for (const v of videosFor(game.id).filter((x) => !x.unreviewed)) docs.push(...videoDocs(v));
  if (DISCOVERY_FEED) for (const c of creatorsFor(game.id)) docs.push(creatorDoc(c));
  return new Response(JSON.stringify({ docs, sectionLabels: label }), { headers: { 'content-type': 'application/json' } });
};

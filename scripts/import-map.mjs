#!/usr/bin/env node
/**
 * Import licensed map data into a local snapshot (editor-run; the public site never calls the source).
 *
 *   npm run import:map -- --dry-run          # show what would change, write nothing
 *   npm run import:map                       # write the snapshot
 *   npm run import:map -- --from <dir>       # use already-downloaded files instead of fetching
 *
 * Source and pinned revision: content/games/gta-vi/map/source.json. Change `revision` to update.
 * Re-imports keep ids (gta-vi:map:<upstream id>), so players' progress survives. Records that disappear
 * upstream are kept as `retired` rather than deleted. On any validation error nothing is written and the
 * last good snapshot stays in place.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const DIR = 'content/games/gta-vi/map';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const fromIdx = args.indexOf('--from');
const FROM = fromIdx >= 0 ? args[fromIdx + 1] : null;
const src = JSON.parse(readFileSync(join(DIR, 'source.json'), 'utf8'));
if (!/^[0-9a-f]{40}$/.test(src.revision)) { console.error('source.json revision must be a full 40-character commit hash'); process.exit(1); }

/* ---------- upstream schemas (only the fields we use; extra fields are ignored) ---------- */
const coord = z.number().finite();
const text = (max) => z.string().max(max).regex(/^[^<>]*$/, 'no angle brackets');
const Location = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/), kind: z.string().regex(/^[a-z0-9-]{1,40}$/), x: coord, y: coord, name: text(160).min(1),
  type: text(80).optional(), description: z.string().max(4000).optional().nullable(), area: text(80).optional().nullable(),
  region: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().nullable(), confidence: z.string().optional().nullable(), source_urls: z.array(z.string()).optional(),
});
const Categories = z.object({
  groups: z.array(z.string()),
  kinds: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]{1,40}$/), name: text(80).min(1), colour: z.string().regex(/^#[0-9a-f]{6}$/i), group: text(40).min(1), pinnable: z.boolean() })),
});
const Land = z.array(z.array(z.array(z.tuple([coord, coord]))));
const Roads = z.object({ features: z.array(z.object({ properties: z.object({ kind: z.string() }), geometry: z.object({ type: z.literal('LineString'), coordinates: z.array(z.tuple([coord, coord])) }) })) });
const Labels = z.array(z.object({ name: text(60).min(1), x: coord, y: coord }));
const Removed = z.array(z.object({ id: z.string(), reason: z.string() }));

async function get(file) {
  if (FROM) return JSON.parse(readFileSync(join(FROM, file), 'utf8'));
  const url = `${src.rawBase}/${src.revision}/public/data/${file}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  const body = await r.text();
  if (body.length > 25_000_000) throw new Error(`${url} is unexpectedly large (${body.length} bytes)`);
  return JSON.parse(body);
}
function parse(name, schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${name} does not match the expected schema:\n` + r.error.issues.slice(0, 8).map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
  return r.data;
}

/* ---------- geometry simplification (Douglas–Peucker) ---------- */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const sq = (a, b, p) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const l = dx * dx + dy * dy; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1]; return x * x + y * y; };
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop(); let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) { const d = sq(pts[s], pts[e], pts[i]); if (d > max) { max = d; idx = i; } }
    if (max > tol * tol) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}

const short = (s, n = 160) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || '');

async function main() {
  console.log(`Importing ${src.name} @ ${src.revision.slice(0, 12)} ${FROM ? `(from ${FROM})` : '(fetching)'}`);
  const [locRaw, catRaw, landRaw, roadRaw, labRaw, remRaw] = await Promise.all(
    ['locations.json', 'categories.json', 'land.json', 'roads.json', 'labels.json', 'removed.json'].map(get));
  const locations = parse('locations.json', z.array(Location), locRaw);
  const categories = parse('categories.json', Categories, catRaw);
  const land = parse('land.json', Land, landRaw);
  const roads = parse('roads.json', Roads, roadRaw);
  const labels = parse('labels.json', Labels, labRaw);
  const removed = new Set(parse('removed.json', Removed, remRaw).map((r) => r.id));

  const kinds = new Map(categories.kinds.map((k) => [k.key, k]));
  const variable = new Set(src.variableKinds);
  const spoilerKinds = new Set(src.spoilerKinds);
  const invalid = [], unknownKind = [], seen = new Map(), dupIds = [], skippedRemoved = [];
  const pins = [];
  for (const l of locations) {
    if (removed.has(l.id)) { skippedRemoved.push(l.id); continue; }
    if (!(l.x >= 0 && l.x <= 1024 && l.y >= 0 && l.y <= 1024)) { invalid.push(l.id); continue; }
    const k = kinds.get(l.kind);
    if (!k) { unknownKind.push(`${l.id} (${l.kind})`); continue; }
    if (seen.has(l.id)) { dupIds.push(l.id); continue; }
    seen.set(l.id, true);
    pins.push({
      id: `gta-vi:map:${l.id}`, src: l.id, kind: l.kind, name: l.name, type: l.type || k.name,
      x: Math.round(l.x * 10) / 10, y: Math.round(l.y * 10) / 10,
      area: l.area || null, region: l.region || null, note: short((l.description || '').replace(/[<>]/g, '')),
      // Evidence: every record here comes from one community-maintained dataset.
      evidence: 'community',
      trackable: k.pinnable,
      // Chance spawns and pickups need corroboration before an exact pin is shown (review queue).
      exact: !variable.has(l.kind),
      spoiler: spoilerKinds.has(l.kind) ? 'minor' : 'none',
    });
  }
  // Possible duplicates: same name within 1 map unit (notes, not errors).
  const near = [];
  const byName = new Map();
  for (const p of pins) { const a = byName.get(p.name) || []; for (const q of a) if (Math.hypot(p.x - q.x, p.y - q.y) < 1) near.push(`${q.src} ~ ${p.src}`); a.push(p); byName.set(p.name, a); }

  // Our overrides: crime colours match the in-game map legend (founder, 25 Nov 2026) and labels use the game's terms.
  // Exploration categories are shades of purple, like the in-game exploration icons (founder, 25 Nov 2026).
  const OVERRIDES = { gang: { label: 'Illegal operations', colour: '#ffd000' }, smash: { colour: '#2dc653' }, store: { label: 'Stick-ups', colour: '#7dd3fc' }, bank: { colour: '#b07aa1' },
    waink: { colour: '#a855f7' }, magazine: { colour: '#c084fc' }, meditation: { colour: '#e9d5ff' }, treasure: { colour: '#7e22ce' }, playlist: { colour: '#d8b4fe' },
    flamingo: { colour: '#9333ea' }, kenton: { colour: '#6b21a8' }, underwater: { colour: '#8b5cf6' }, bookswap: { colour: '#f4a261' } };
  const ourCats = categories.kinds.map((k) => ({ id: k.key, label: k.name, colour: k.colour, group: k.group, trackable: k.pinnable, ...(OVERRIDES[k.key] ?? {}) }));
  const geometry = {
    land: land.map((poly) => poly.map((ring) => simplify(ring, 0.25)).filter((r) => r.length >= 3)).filter((p) => p.length),
    roads: roads.features.filter((f) => f.properties.kind === 'highway' || f.properties.kind === 'main')
      .map((f) => ({ k: f.properties.kind === 'highway' ? 'h' : 'm', c: simplify(f.geometry.coordinates, 0.35) })),
    labels,
  };

  /* ---------- diff against the current snapshot ---------- */
  const prevPath = join(DIR, 'pins.json');
  const prev = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, 'utf8')) : { pins: [], retired: [] };
  const prevById = new Map(prev.pins.map((p) => [p.id, p]));
  const nowIds = new Set(pins.map((p) => p.id));
  const added = pins.filter((p) => !prevById.has(p.id));
  const changed = pins.filter((p) => { const o = prevById.get(p.id); return o && JSON.stringify(o) !== JSON.stringify(p); });
  const gone = prev.pins.filter((p) => !nowIds.has(p.id));
  const retired = [...new Map([...(prev.retired || []), ...gone.map((p) => ({ id: p.id, name: p.name, retiredAt: new Date().toISOString().slice(0, 10) }))].map((r) => [r.id, r])).values()]
    .filter((r) => !nowIds.has(r.id));

  console.log(`\nSummary`);
  console.log(`  pins: ${pins.length} (${pins.filter((p) => p.trackable).length} trackable, ${pins.filter((p) => !p.exact).length} in review queue as chance spawns/pickups)`);
  console.log(`  added: ${added.length}  changed: ${changed.length}  removed upstream (kept as retired): ${gone.length}`);
  console.log(`  skipped: ${skippedRemoved.length} listed in upstream removed.json, ${invalid.length} invalid coordinates, ${unknownKind.length} unknown category, ${dupIds.length} duplicate ids`);
  console.log(`  possible duplicates to check by hand: ${near.length}${near.length ? ` (e.g. ${near.slice(0, 3).join(', ')})` : ''}`);
  console.log(`  geometry: ${geometry.land.length} land polygons, ${geometry.roads.length} roads, ${labels.length} labels`);
  if (invalid.length) console.log(`  invalid: ${invalid.slice(0, 10).join(', ')}`);
  if (unknownKind.length) console.log(`  unknown kind: ${unknownKind.slice(0, 10).join(', ')}`);

  if (DRY) { console.log('\nDry run: nothing written.'); return; }
  const provenance = {
    source: src.name, author: src.author, repo: src.repo, revision: src.revision, license: src.license, licenseUrl: src.licenseUrl,
    credit: src.credit, importedAt: new Date().toISOString(), checkedAt: src.checkedAt,
    changes: 'Coordinates kept in the source\'s map units (0–1024, y down). Geometry simplified (Douglas–Peucker); only highways and main roads kept. Descriptions shortened to 160 characters. Records in removed.json skipped. Tiles, pins, screenshots and game art not imported. Map drawn by Nerdy Birdie Gaming.',
  };
  mkdirSync(DIR, { recursive: true });
  // Write to temp files first, then swap, so a crash never leaves a half-written snapshot.
  const out = { 'pins.json': { provenance, categories: ourCats, pins, retired }, 'geometry.json': geometry };
  for (const [f, data] of Object.entries(out)) writeFileSync(join(DIR, f + '.tmp'), JSON.stringify(data));
  for (const f of Object.keys(out)) renameSync(join(DIR, f + '.tmp'), join(DIR, f));
  console.log(`\nWrote ${DIR}/pins.json and geometry.json`);
}
main().catch((e) => { console.error(`\nImport failed; the existing snapshot was left unchanged.\n${e.message}`); process.exit(1); });

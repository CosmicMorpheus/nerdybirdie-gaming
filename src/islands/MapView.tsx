import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapPin } from '../lib/content/load';
import { contextKey, emptyContext, setCompleted, setPrefs, setResume } from '../lib/progress/model';
import { tally } from '../lib/progress/totals';
import { search } from '../lib/search';
import { modeAllows } from '../lib/spoilers';
import { SaveStatus } from './SaveStatus';
import { StorageNotice } from './StorageNotice';
import { useProgress } from './useProgress';
import VideoEmbed, { type VideoLike } from './VideoEmbed';
import './tracker.css';
import './map.css';

interface Category { id: string; label: string; colour: string; group: string; trackable: boolean }
interface MapJson { withheld?: number; provenance: { source: string; repo: string; revision: string; license: string; licenseUrl: string; credit: string; checkedAt: string }; categories: Category[]; pins: MapPin[] }
interface Geometry { land: [number, number][][][]; roads: { k: 'h' | 'm'; c: [number, number][] }[]; labels: { name: string; x: number; y: number }[] }
type Moment = { target: string; start: number | null; label: string };
interface Props { gameId: string; dataUrl: string; geometryUrl: string; protectedUrl: string; videos: (VideoLike & { spoilerLevel: 'none' | 'minor' | 'major'; moments: Moment[] })[]; base: string }

import { MAP_CONTEXT } from '../lib/progress/contexts';
const DEFAULT_GROUPS = ['Collectibles'];
const REGION_LABEL = (r: string) => r.replace(/(^|-)([a-z])/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase());
/** Source map units → Leaflet (CRS.Simple): origin top-left, x right, y down (so lat = -y). 0–1024 square. */
const ll = (x: number, y: number): L.LatLngTuple => [-y, x];

/** Filters and view as a shareable query string. Spoiler settings are never in the link. */
function readUrl() {
  const q = new URLSearchParams(location.search);
  return { cats: q.get('c'), region: q.get('r'), hideFound: q.get('hf') === '1', pin: q.get('pin'), view: q.get('v') };
}

export default function MapView({ gameId, dataUrl, geometryUrl, protectedUrl, videos, base }: Props) {
  const state = useProgress();
  const { progress, update, remember, ready } = state;
  const key = contextKey(gameId, MAP_CONTEXT);
  const done = (progress.contexts[key] ?? emptyContext()).completed;
  const [data, setData] = useState<MapJson | null>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [failed, setFailed] = useState(false);
  const [cats, setCats] = useState<Set<string> | null>(null);
  const [region, setRegion] = useState('all');
  const [hideFound, setHideFound] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(false);
  const [inView, setInView] = useState<MapPin[]>([]);
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState<Record<string, { summary: string }> | null>(null);
  const [revealFailed, setRevealFailed] = useState(false);
  const revealNote = async (id: string) => {
    const d = hidden ?? await fetch(protectedUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setRevealFailed(!d);
    if (d) { setHidden(d); setRevealed((r) => new Set(r).add(id)); }
  };
  // In Minor/All spoiler mode, spoiler notes load straight away for the selected pin.
  useEffect(() => {
    const p = selected ? pinBySrc.get(selected) : null;
    if (p && p.spoiler !== 'none' && modeAllows(p.spoiler, progress.prefs.spoilerMode) && !revealed.has(p.id)) void revealNote(p.id);
  }, [selected, progress.prefs.spoilerMode]);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pinRenderer = useRef<L.Canvas | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    Promise.all([fetch(dataUrl).then((r) => (r.ok ? r.json() : Promise.reject())), fetch(geometryUrl).then((r) => (r.ok ? r.json() : Promise.reject()))])
      .then(([d, g]) => { setData(d); setGeo(g); }).catch(() => setFailed(true));
  }, []);

  const catById = useMemo(() => new Map((data?.categories ?? []).map((c) => [c.id, c])), [data]);
  const pinBySrc = useMemo(() => new Map((data?.pins ?? []).map((p) => [p.src, p])), [data]);
  const trackable = useMemo(() => (data?.pins ?? []).filter((p) => p.trackable && catById.get(p.kind)?.trackable), [data, catById]);
  const regions = useMemo(() => [...new Set((data?.pins ?? []).map((p) => p.region).filter(Boolean) as string[])].sort(), [data]);

  // Restore filters: a shared link wins; otherwise this player's last map view.
  useEffect(() => {
    if (!data || !ready || !mapReady || restored.current) return;
    restored.current = true;
    const u = readUrl();
    const fromPrefs = !location.search && progress.prefs.map.filters ? new URLSearchParams(progress.prefs.map.filters) : null;
    const c = u.cats ?? fromPrefs?.get('c');
    setCats(new Set(c ? c.split(',').filter((k) => catById.has(k)) : data.categories.filter((k) => DEFAULT_GROUPS.includes(k.group)).map((k) => k.id)));
    setRegion(u.region ?? fromPrefs?.get('r') ?? 'all');
    setHideFound(u.hideFound || fromPrefs?.get('hf') === '1');
    const pin = u.pin ?? (location.search ? null : progress.prefs.map.pin);
    const view = u.view ?? (location.search ? null : progress.prefs.map.view);
    if (view && map.current) { const [z, x, y] = view.split('/').map(Number); if ([z, x, y].every(Number.isFinite)) map.current.setView(ll(x!, y!), z!); }
    if (pin && pinBySrc.has(pin)) select(pin, !view);
  }, [data, ready, mapReady]);

  const visible = useMemo(() => (data?.pins ?? []).filter((p) =>
    cats?.has(p.kind) && (region === 'all' || p.region === region) && !(hideFound && p.id in done)), [data, cats, region, hideFound, done]);

  // Build the base map once.
  useEffect(() => {
    if (!geo || !mapEl.current || map.current) return;
    const m = L.map(mapEl.current, { crs: L.CRS.Simple, minZoom: 0, maxZoom: 6, zoomSnap: 0.5, preferCanvas: true, attributionControl: true });
    const renderer = L.canvas({ padding: 0.3 });
    m.fitBounds([ll(205, 210), ll(595, 770)]);
    m.setMaxBounds([ll(100, 100), ll(700, 880)]);
    for (const poly of geo.land) L.polygon(poly.map((ring) => ring.map(([x, y]) => ll(x, y))), { renderer, stroke: true, color: '#3a4560', weight: 1, fillColor: '#1d2436', fillOpacity: 1, interactive: false }).addTo(m);
    for (const r of geo.roads) L.polyline(r.c.map(([x, y]) => ll(x, y)), { renderer, color: r.k === 'h' ? '#c9846a' : '#5d6680', weight: r.k === 'h' ? 1.6 : 1, opacity: 0.8, interactive: false }).addTo(m);
    for (const lb of geo.labels) {
      // Imported text is set as textContent, never as HTML.
      const el = document.createElement('span');
      el.textContent = lb.name;
      L.marker(ll(lb.x, lb.y), { interactive: false, keyboard: false, icon: L.divIcon({ className: 'map-label', html: el, iconSize: undefined }) }).addTo(m);
    }
    m.attributionControl.setPrefix(false);
    layer.current = L.layerGroup().addTo(m);
    pinRenderer.current = L.canvas({ padding: 0.3 });
    const sync = () => {
      const b = m.getBounds(); const c = m.getCenter();
      setInView((visibleRef.current ?? []).filter((p) => b.contains(ll(p.x, p.y))).sort((a, z) => Math.hypot(a.x - c.lng, -a.y - c.lat) - Math.hypot(z.x - c.lng, -z.y - c.lat)).slice(0, 40));
      writeUrlRef.current();
    };
    m.on('moveend zoomend', sync);
    map.current = m;
    setMapReady(true);
    return () => { m.remove(); map.current = null; setMapReady(false); };
  }, [geo]);

  const writeUrlRef = useRef(() => {});
  const visibleRef = useRef<MapPin[]>([]);
  visibleRef.current = visible;

  // Draw pins.
  useEffect(() => {
    const m = map.current; const g = layer.current;
    if (!m || !g || !data) return;
    g.clearLayers();
    const renderer = pinRenderer.current!;
    for (const p of visible) {
      const c = catById.get(p.kind)!;
      const found = p.id in done;
      const sel = p.src === selected;
      L.circleMarker(ll(p.x, p.y), {
        renderer, radius: sel ? 9 : 6, color: sel ? '#ffffff' : '#000', weight: sel ? 3 : 1.5,
        fillColor: c.colour, fillOpacity: found ? 0.3 : 1,
      }).on('click', () => select(p.src, false)).addTo(g);
    }
    m.fire('moveend');
  }, [visible, selected, done, data, map.current]);

  const live = useRef({ cats, region, hideFound, selected });
  live.current = { cats, region, hideFound, selected };
  function writeUrl() {
    const { cats, region, hideFound, selected } = live.current;
    const m = map.current; if (!m || !cats || !restored.current) return;
    const c = m.getCenter();
    const q = new URLSearchParams();
    q.set('c', [...cats].join(','));
    if (region !== 'all') q.set('r', region);
    if (hideFound) q.set('hf', '1');
    if (selected) q.set('pin', selected);
    const view = `${m.getZoom()}/${Math.round(c.lng)}/${Math.round(-c.lat)}`;
    q.set('v', view);
    const qs = q.toString().replace(/%2C/g, ',').replace(/%2F/g, '/');
    history.replaceState(null, '', `?${qs}`);
    const filters = new URLSearchParams({ c: [...cats].join(','), ...(region !== 'all' ? { r: region } : {}), ...(hideFound ? { hf: '1' } : {}) }).toString().replace(/%2C/g, ',');
    const sel = selected ? pinBySrc.get(selected) : null;
    remember((s) => setResume(setPrefs(s, { map: { view, filters, pin: selected } }), { href: `${base}?${qs}`, label: sel ? `Map: ${sel.name}` : 'Leonida map', at: new Date().toISOString() }));
  }
  writeUrlRef.current = writeUrl;
  useEffect(() => { if (restored.current) writeUrl(); }, [cats, region, hideFound, selected]);

  function select(src: string, fly = true) {
    const p = pinBySrc.get(src); if (!p) return;
    // Make sure the chosen pin is visible under the current filters.
    setCats((c) => (c && !c.has(p.kind) ? new Set(c).add(p.kind) : c));
    if (region !== 'all' && p.region !== region) setRegion('all');
    if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('.pin-detail')) lastFocus.current = document.activeElement;
    setSelected(src);
    setSheet(false);
    if (fly && map.current) map.current.setView(ll(p.x, p.y), Math.max(map.current.getZoom(), 4));
    setTimeout(() => detailRef.current?.focus(), 50);
  }

  const closeDetail = () => { setSelected(null); setTimeout(() => (lastFocus.current ?? mapEl.current)?.focus(), 0); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && selected) closeDetail(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [selected]);

  const results = useMemo(() => {
    if (!query.trim() || !data) return null;
    const docs = data.pins.map((p) => ({ p, title: p.name, text: `${p.type} ${p.area ?? ''} ${p.region ?? ''} ${catById.get(p.kind)?.label ?? ''}` }));
    return search(docs, query, 50).map((d) => d.p);
  }, [query, data]);

  const overall = tally(trackable.map((p) => p.id), done);
  const sel = selected ? pinBySrc.get(selected) : null;
  const selCat = sel ? catById.get(sel.kind) : null;
  const selVideos = sel ? videos.flatMap((v) => v.moments.filter((m) => m.target === sel.id).map((m) => ({ v, m }))) : [];
  const groups = [...new Set((data?.categories ?? []).map((c) => c.group))];

  if (failed) return <p class="notice error">The map couldn't load. Check your connection and reload. The guide and checklists still work without it.</p>;

  const list = (pins: MapPin[]) => (
    <ul class="pin-list">
      {pins.map((p) => (
        <li key={p.id}>
          <button type="button" class={p.src === selected ? 'on' : ''} onClick={() => select(p.src)}>
            <i style={{ background: catById.get(p.kind)?.colour }} aria-hidden="true" />
            <span>{p.name}<small>{catById.get(p.kind)?.label}{p.area ? ` · ${p.area}` : p.region ? ` · ${REGION_LABEL(p.region)}` : ''}</small></span>
            {p.id in done && <b class="found"><span aria-hidden="true">✓</span><span class="sr-only">found</span></b>}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div class="mapwrap">
      <div class={`map-panel${sheet ? ' open' : ''}`}>
        <button type="button" class="sheet-handle" aria-expanded={sheet} onClick={() => setSheet(!sheet)}>
          {sheet ? 'Close filters ▾' : `Filters & list · ${visible.length} pins ▴`}
        </button>
        <div class="panel-body">
          <div class="map-sum">
            <p class="hud-label">Map checklist</p>
            <p class="big pixel">{ready ? `${overall.done}/${overall.total}` : '…'}</p>
            <div class="bar" role="progressbar" aria-label="Map collectibles found" aria-valuemin={0} aria-valuemax={overall.total} aria-valuenow={overall.done}><i style={{ width: `${overall.percent ?? 0}%` }} /></div>
            <p class="small muted">Found, out of every checklist pin we publish. Filters never change this count. It isn't the game's own 100%, which hasn't been verified.</p>
            {data && (
              <details class="small muted counts">
                <summary>Why do the numbers differ?</summary>
                <p>{data.pins.length.toLocaleString()} pins are drawn on the map. {overall.total.toLocaleString()} of them count toward the checklist; shops and places are for reference only.
                  {data.withheld ? ` ${data.withheld.toLocaleString()} chance spawns (vehicles, weapons, events) are held back until confirmed.` : ''} All pins are community-reported and Unconfirmed until checked; that doesn't mean they're wrong.</p>
              </details>
            )}
            <SaveStatus state={state} />
          </div>
          <StorageNotice state={state} />
          <label class="search-field">
            <span class="sr-only">Search the map</span>
            <input type="search" placeholder="Search pins, e.g. “Pricilla”" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
          </label>
          {results && (results.length ? <>{<p class="small muted">{results.length} result{results.length > 1 ? 's' : ''}</p>}{list(results)}</> : <p class="small muted">No pins match.</p>)}
          {!results && (
            <>
              <div class="map-filters">
                <label class="field-label compact">Region
                  <select value={region} onChange={(e) => setRegion((e.target as HTMLSelectElement).value)}>
                    <option value="all">All of Leonida</option>
                    {regions.map((r) => <option key={r} value={r}>{REGION_LABEL(r)}</option>)}
                  </select>
                </label>
                <label class="toggle"><input type="checkbox" checked={hideFound} onChange={(e) => setHideFound((e.target as HTMLInputElement).checked)} /> Hide found</label>
              </div>
              <details class="cat-groups" open>
                <summary>Categories ({cats?.size ?? 0} on)</summary>
                {groups.map((g) => (
                  <fieldset key={g}>
                    <legend>{g}</legend>
                    {data!.categories.filter((c) => c.group === g).map((c) => {
                      const pins = (data!.pins).filter((p) => p.kind === c.id);
                      if (!pins.length) return null;
                      const t = tally(pins.filter((p) => p.trackable).map((p) => p.id), done);
                      return (
                        <label key={c.id} class="cat-row">
                          <input type="checkbox" checked={cats?.has(c.id) ?? false} onChange={(e) => {
                            const on = (e.target as HTMLInputElement).checked;
                            setCats((s) => { const n = new Set(s); on ? n.add(c.id) : n.delete(c.id); return n; });
                          }} />
                          <i style={{ background: c.colour }} aria-hidden="true" />
                          <span>{c.label}</span>
                          <small>{c.trackable ? `${t.done}/${t.total}` : `${pins.length} · not counted`}</small>
                        </label>
                      );
                    })}
                  </fieldset>
                ))}
              </details>
              <h2 class="hud-label inview-h">In view · nearest first</h2>
              {inView.length ? list(inView) : <p class="small muted">No pins in view. Zoom out or turn on more categories.</p>}
            </>
          )}
        </div>
      </div>

      <div class="map-stage">
        <div ref={mapEl} tabIndex={-1} class="leaflet-host" role="application" aria-label="Map of Leonida. Use the list of pins for keyboard access." />
        {sel && selCat && (
          <div class="pin-detail" ref={detailRef} tabIndex={-1} role="dialog" aria-label={sel.name}>
            <button type="button" class="close" onClick={closeDetail} aria-label="Close (Esc)">✕</button>
            <p class="hud-label"><i style={{ background: selCat.colour }} aria-hidden="true" /> {selCat.label}</p>
            <h2>{sel.name}</h2>
            <p class="small muted">{sel.type}{sel.area ? ` · ${sel.area}` : ''}{sel.region ? ` · ${REGION_LABEL(sel.region)}` : ''}</p>
            <p><span class="tag v-warn" title="From one community-maintained dataset; not yet independently confirmed">? Unconfirmed · community map data</span></p>
            {sel.spoiler === 'none' ? (sel.note && <p class="note">{sel.note}</p>)
              : (revealed.has(sel.id) && hidden?.[sel.id]) ? <p class="note">{hidden[sel.id]!.summary}</p>
              : (revealed.has(sel.id) && hidden && !hidden[sel.id]) ? null
              : <button type="button" class="act reveal" onClick={() => void revealNote(sel.id)}>Reveal mild spoiler details</button>}
            {revealFailed && <p class="small notice error">Couldn't load the hidden details. Check your connection.</p>}
            {sel.trackable && selCat.trackable ? (
              <label class="found-toggle">
                <input type="checkbox" class="check" checked={sel.id in done} disabled={!ready}
                  onChange={(e) => update((s) => setCompleted(s, key, sel.id, (e.target as HTMLInputElement).checked))} />
                <span>{sel.id in done ? 'Found ✓' : 'Mark as found'}</span>
              </label>
            ) : <p class="small muted">Shops and places are shown for reference and don't count toward completion.</p>}
            {selVideos.map(({ v, m }) => (modeAllows(v.spoilerLevel, progress.prefs.spoilerMode) || revealed.has(`v:${sel.id}`))
              ? <VideoEmbed video={v} start={m.start} label={m.label} />
              : <button type="button" class="act reveal" onClick={() => setRevealed((r) => new Set(r).add(`v:${sel.id}`))}>Show video (may contain spoilers)</button>)}
            <div class="detail-actions">
              <button type="button" class="btn btn-quiet" onClick={async () => {
                const u = new URL(location.href); try { await navigator.clipboard.writeText(u.toString()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { prompt('Copy this link', u.toString()); }
              }}>{copied ? 'Link copied ✓' : 'Copy link to this pin'}</button>
            </div>
          </div>
        )}
      </div>
      {data && (
        <p class="map-credit small muted">
          {data.provenance.credit}: <a href={data.provenance.repo} target="_blank" rel="noopener">{data.provenance.source}</a> (revision {data.provenance.revision.slice(0, 7)}),{' '}
          <a href={data.provenance.licenseUrl} target="_blank" rel="noopener">{data.provenance.license}</a>. Changed by us: simplified geometry, shortened notes, our own map drawing and pins. No game art or screenshots are used.
        </p>
      )}
    </div>
  );
}

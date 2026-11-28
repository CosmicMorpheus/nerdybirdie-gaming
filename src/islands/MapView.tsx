import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapPin } from '../lib/content/load';
import { contextKey, setCompleted, setPrefs, setResume } from '../lib/progress/model';
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
/** Shared "nothing found yet" record. A fresh object on every render made the pin layer redraw in a loop for new players. */
const NONE_FOUND: Readonly<Record<string, string>> = Object.freeze({});

/** Filters and view as a shareable query string. Spoiler settings are never in the link. */
function readUrl() {
  const q = new URLSearchParams(location.search);
  return { cats: q.get('c'), region: q.get('r'), hideFound: q.get('hf') === '1', pin: q.get('pin'), view: q.get('v'), show: q.get('show') };
}

export default function MapView({ gameId, dataUrl, geometryUrl, protectedUrl, videos, base }: Props) {
  const state = useProgress();
  const { progress, update, remember, ready } = state;
  const key = contextKey(gameId, MAP_CONTEXT);
  const done = progress.contexts[key]?.completed ?? NONE_FOUND;
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
  /** Pins a guide entry asked to show (?show=a,b,c): highlighted, listed and zoomed to. Cleared by the player. */
  const [focus, setFocus] = useState<string[] | null>(null);
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
    // A guide entry's set of places: turn their categories on and frame them (unless the link also carries a view).
    const shown = (u.show ?? '').split(',').filter((src) => pinBySrc.has(src));
    if (shown.length) {
      setFocus(shown);
      setCats((cs) => { const n = new Set(cs); for (const src of shown) n.add(pinBySrc.get(src)!.kind); return n; });
      if (!view && !pin && map.current) map.current.fitBounds(L.latLngBounds(shown.map((src) => { const p = pinBySrc.get(src)!; return ll(p.x, p.y); })).pad(0.15), { maxZoom: 5 });
    }
  }, [data, ready, mapReady]);
  const focusSet = useMemo(() => new Set(focus ?? []), [focus]);
  // Map data credit (CC BY 4.0) in the map's corner credit strip. Built from escaped text; never raw HTML from the data.
  useEffect(() => {
    const m = map.current; if (!m || !data) return;
    const esc = (t: string) => t.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
    const v = data.provenance;
    const html = `${esc(v.credit)}, <a href="${esc(v.repo)}" target="_blank" rel="noopener">${esc(v.source)}</a> (rev ${esc(v.revision.slice(0, 7))}), `
      + `<a href="${esc(v.licenseUrl)}" target="_blank" rel="noopener">${esc(v.license)}</a>. Simplified and redrawn by us; no game art.`;
    m.attributionControl.addAttribution(html);
    return () => { m.attributionControl.removeAttribution(html); };
  }, [mapReady, data]);

  const visible = useMemo(() => (data?.pins ?? []).filter((p) =>
    cats?.has(p.kind) && (region === 'all' || p.region === region) && !(hideFound && p.id in done)), [data, cats, region, hideFound, done]);

  // Build the base map once.
  useEffect(() => {
    if (!geo || !mapEl.current || map.current) return;
    const m = L.map(mapEl.current, { crs: L.CRS.Simple, minZoom: -1, maxZoom: 6, zoomSnap: 0.25, /* -1 lets short laptop screens see the whole island */ preferCanvas: true, attributionControl: true });
    const renderer = L.canvas({ padding: 0.3 });
    // Frame the whole island, and keep it framed while the box settles or the window resizes, until the player moves the map.
    // The whole coastline, worked out from the land outline (falls back to the island's usual extent).
    const landPts = geo.land.flatMap((poly) => poly.flatMap((ring) => ring.map(([x, y]) => ll(x, y))));
    const home = landPts.length ? L.latLngBounds(landPts) : L.latLngBounds([ll(205, 210), ll(595, 770)]);
    let autoFit = true, fitting = false;
    const fit = () => { fitting = true; m.invalidateSize(); m.fitBounds(home, { padding: [16, 16] }); fitting = false; };
    m.on('movestart', () => { if (!fitting) autoFit = false; });
    fit();
    const ro = new ResizeObserver(() => { if (autoFit) fit(); else m.invalidateSize(); });
    ro.observe(mapEl.current);
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
    m.attributionControl.setPosition('bottomleft'); // bottom-right is where the ASK button floats
    layer.current = L.layerGroup().addTo(m);
    pinRenderer.current = L.canvas({ padding: 0.3 });
    // The player moved the map: refresh the "in view" list and save the view (URL + resume point).
    m.on('moveend zoomend', () => { updateInViewRef.current(); writeUrlRef.current(); });
    map.current = m;
    setMapReady(true);
    return () => { ro.disconnect(); m.remove(); map.current = null; setMapReady(false); };
  }, [geo]);

  const writeUrlRef = useRef(() => {});
  /** Nearest 40 visible pins inside the current view. Cheap; never writes progress or the URL. */
  const updateInViewRef = useRef(() => {});
  updateInViewRef.current = () => {
    const m = map.current; if (!m) return;
    const b = m.getBounds(); const c = m.getCenter();
    setInView(visibleRef.current.filter((p) => b.contains(ll(p.x, p.y))).sort((a, z) => Math.hypot(a.x - c.lng, -a.y - c.lat) - Math.hypot(z.x - c.lng, -z.y - c.lat)).slice(0, 40));
  };
  const visibleRef = useRef<MapPin[]>([]);
  visibleRef.current = visible;

  // Draw pins.
  useEffect(() => {
    const m = map.current; const g = layer.current;
    if (!m || !g || !data) return;
    g.clearLayers();
    const renderer = pinRenderer.current!;
    // Guide-set pins are drawn last so faded neighbours never cover them.
    const order = focusSet.size ? [...visible].sort((a, z) => Number(focusSet.has(a.src)) - Number(focusSet.has(z.src))) : visible;
    for (const p of order) {
      const c = catById.get(p.kind)!;
      const found = p.id in done;
      const sel = p.src === selected;
      const inFocus = focusSet.has(p.src);
      const faded = focusSet.size > 0 && !inFocus && !sel;
      L.circleMarker(ll(p.x, p.y), {
        // While a guide set is shown, the other pins fade back so the set stands out.
        renderer, radius: sel ? 9 : inFocus ? 8 : faded ? 4 : 6, color: sel || inFocus ? '#ffffff' : '#000', weight: sel ? 3 : inFocus ? 2.5 : faded ? 0.5 : 1.5,
        fillColor: c.colour, fillOpacity: faded ? 0.25 : found ? 0.3 : 1,
      }).on('click', () => select(p.src, false)).addTo(g);
    }
    updateInViewRef.current();
  }, [visible, selected, done, data, mapReady, focusSet]);

  const live = useRef({ cats, region, hideFound, selected, focus });
  live.current = { cats, region, hideFound, selected, focus };
  function writeUrl() {
    const { cats, region, hideFound, selected } = live.current;
    const m = map.current; if (!m || !cats || !restored.current) return;
    const c = m.getCenter();
    const q = new URLSearchParams();
    q.set('c', [...cats].join(','));
    if (region !== 'all') q.set('r', region);
    if (hideFound) q.set('hf', '1');
    if (selected) q.set('pin', selected);
    if (live.current.focus?.length) q.set('show', live.current.focus.join(','));
    const view = `${m.getZoom()}/${Math.round(c.lng)}/${Math.round(-c.lat)}`;
    q.set('v', view);
    const qs = q.toString().replace(/%2C/g, ',').replace(/%2F/g, '/');
    history.replaceState(null, '', `?${qs}`);
    const filters = new URLSearchParams({ c: [...cats].join(','), ...(region !== 'all' ? { r: region } : {}), ...(hideFound ? { hf: '1' } : {}) }).toString().replace(/%2C/g, ',');
    const sel = selected ? pinBySrc.get(selected) : null;
    remember((s) => setResume(setPrefs(s, { map: { view, filters, pin: selected } }), { href: `${base}?${qs}`, label: sel ? `Map: ${sel.name}` : 'Leonida map', at: new Date().toISOString() }));
  }
  writeUrlRef.current = writeUrl;
  useEffect(() => { if (restored.current) writeUrl(); }, [cats, region, hideFound, selected, focus]);

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
  /** Categories that have at least one pin on this map: the ones the filter list shows, and what "Show all" turns on. */
  const available = useMemo(() => {
    const kinds = new Set((data?.pins ?? []).map((p) => p.kind));
    return (data?.categories ?? []).filter((c) => kinds.has(c.id));
  }, [data]);
  /** One-tap filter presets. "Checklist only" hides the reference-only places (shops, food, transport…). */
  const views = useMemo(() => {
    const inGroup = (g: string) => available.filter((c) => c.group === g).map((c) => c.id);
    return [
      { id: 'checklist', label: 'Checklist only', hint: 'Everything that counts toward the map checklist; hides shops, food and other reference places', ids: available.filter((c) => c.trackable).map((c) => c.id) },
      ...['Collectibles', 'Activities', 'Crime'].filter((g) => inGroup(g).length).map((g) => ({ id: g, label: g, hint: `Only ${g.toLowerCase()}`, ids: inGroup(g) })),
    ].filter((v) => v.ids.length);
  }, [available]);
  const sameSet = (ids: string[]) => !!cats && ids.length === available.filter((c) => cats.has(c.id)).length && ids.every((id) => cats.has(id));
  /** Category groups the player has open. Starts with the groups that have something switched on. */
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const groupsOpened = useRef(false);
  useEffect(() => {
    if (groupsOpened.current || !cats || !data) return;
    groupsOpened.current = true;
    setOpenGroups(new Set(available.filter((c) => cats.has(c.id)).map((c) => c.group)));
  }, [cats, data]);
  /** Turn a set of categories on or off together (everything, or one group). Other categories keep their state. */
  const setMany = (ids: string[], on: boolean) => setCats((s) => {
    const n = new Set(s);
    for (const id of ids) (on ? n.add(id) : n.delete(id));
    return n;
  });

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
            {data && (
              <details class="small muted counts">
                <summary>About these numbers</summary>
                <p>Found, out of every checklist pin we publish. Filters never change this count. It isn't the game's own 100%, which hasn't been verified.</p>
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
            {focus && focus.length > 0 && (
              <section class="focus-list" aria-labelledby="focus-h">
                <div class="focus-head">
                  <h2 id="focus-h" class="hud-label">From the guide · {focus.length} place{focus.length > 1 ? 's' : ''}</h2>
                  <button type="button" onClick={() => setFocus(null)}>Clear</button>
                </div>
                {list(focus.map((src) => pinBySrc.get(src)!).filter(Boolean))}
              </section>
            )}
          {results && (results.length ? <>{<p class="small muted">{results.length} result{results.length > 1 ? 's' : ''}</p>}{list(results)}</> : <p class="small muted">No pins match.</p>)}
          {!results && (
            <>
              <div class="quick-views" role="group" aria-label="Quick views">
                <p class="hud-label">Quick views</p>
                <div class="qv-row">
                  {views.map((v) => (
                    <button key={v.id} type="button" aria-pressed={sameSet(v.ids)} onClick={() => setCats(new Set(v.ids))} title={v.hint}>{v.label}</button>
                  ))}
                </div>
              </div>
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
                <summary>Categories ({available.filter((c) => cats?.has(c.id)).length} of {available.length} on)</summary>
                <div class="cat-bulk" role="group" aria-label="All categories">
                  <button type="button" onClick={() => setMany(available.map((c) => c.id), true)} disabled={available.every((c) => cats?.has(c.id))}>Show all</button>
                  <button type="button" onClick={() => setMany(available.map((c) => c.id), false)} disabled={!available.some((c) => cats?.has(c.id))}>Hide all</button>
                </div>
                {groups.map((g) => {
                  const ids = available.filter((c) => c.group === g).map((c) => c.id);
                  if (!ids.length) return null;
                  const on = ids.filter((id) => cats?.has(id)).length;
                  return (
                  <details key={g} class="cat-group" open={openGroups.has(g)}
                    onToggle={(e) => { const o = (e.currentTarget as HTMLDetailsElement).open; setOpenGroups((s) => { const n = new Set(s); o ? n.add(g) : n.delete(g); return n; }); }}>
                    <summary><span class="grp-name">{g}</span><small>{on} of {ids.length} on</small></summary>
                    <div class="grp-bulk">
                      <button type="button" onClick={() => setMany(ids, true)} disabled={on === ids.length}>All<span class="sr-only"> {g}</span></button>
                      <button type="button" onClick={() => setMany(ids, false)} disabled={on === 0}>None<span class="sr-only"> {g}</span></button>
                    </div>
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
                  </details>
                  );
                })}
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
    </div>
  );
}

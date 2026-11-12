// Settle In · experience film (90 s). A deterministic timeline: window.seek(t) draws the frame at t seconds,
// and scripts/experience-film.mjs screenshots it 30 times per second.
// Scenes: 1 office · 2 dive to the site + brief · 3 options A/B/C · 4 approve · 5 the team lives and works ·
// 6 re-plan month 3 · 7 Spain roll-out · 8 end card. Numbers come from src/data/facts.ts.
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CITY_POINTS, FACTS, MADRID_SITE, NEW_HOMES, OPTIONS, REPLAN, RINGS_MIN, chosen, madridUnits, ringKm } from './data';
import { createOffice } from './office';
import { DEMO_BRIEF } from '../src/data/brief';

export const DURATION = 90;
const $ = (id: string) => document.getElementById(id)!;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const out = (x: number) => 1 - (1 - x) ** 3;
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const fadeWin = (t: number, a: number, b: number, f = 0.5) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));

// ── Camera ───────────────────────────────────────────────────────────────
type Cam = { t: number; lng: number; lat: number; zoom: number; pitch: number; bearing: number; ease?: boolean };
const S = MADRID_SITE;
const SPAIN = { lng: -3.55, lat: 40.05 };
const KEYS: Cam[] = [
  { t: 0, ...SPAIN, zoom: 5.6, pitch: 0, bearing: 0 },
  { t: 8, ...SPAIN, zoom: 5.6, pitch: 0, bearing: 0 },
  { t: 12.8, ...S, zoom: 14.7, pitch: 62, bearing: -25, ease: true },
  { t: 20, ...S, zoom: 15.0, pitch: 64, bearing: 60 },
  { t: 23, lng: S.lng + 0.02, lat: S.lat - 0.05, zoom: 10.45, pitch: 46, bearing: 12, ease: true },
  { t: 38, lng: S.lng + 0.02, lat: S.lat - 0.05, zoom: 10.6, pitch: 48, bearing: 24 },
  { t: 41, lng: S.lng - 0.01, lat: S.lat - 0.03, zoom: 11.25, pitch: 55, bearing: 30, ease: true },
  { t: 48, lng: S.lng - 0.01, lat: S.lat - 0.03, zoom: 11.35, pitch: 56, bearing: 40 },
  { t: 66, lng: S.lng - 0.01, lat: S.lat - 0.03, zoom: 11.3, pitch: 56, bearing: 78 },
  { t: 76, lng: S.lng - 0.01, lat: S.lat - 0.03, zoom: 11.2, pitch: 54, bearing: 92 },
  { t: 80.5, lng: -2.2, lat: 39.75, zoom: 5.75, pitch: 30, bearing: 0, ease: true },
  { t: 90, lng: -2.2, lat: 39.75, zoom: 5.8, pitch: 32, bearing: 3 },
];
function camAt(t: number) {
  let i = KEYS.findIndex((k) => k.t > t);
  if (i < 0) return KEYS[KEYS.length - 1];
  if (i === 0) return KEYS[0];
  const a = KEYS[i - 1];
  const b = KEYS[i];
  const x0 = seg(t, a.t, b.t);
  const x = b.ease ? io(x0) : x0;
  // Zoom changes feel linear when interpolated in log space; centre follows the eased value.
  return { lng: lerp(a.lng, b.lng, x), lat: lerp(a.lat, b.lat, x), zoom: lerp(a.zoom, b.zoom, x), pitch: lerp(a.pitch, b.pitch, x), bearing: lerp(a.bearing, b.bearing, x) };
}

// ── Geometry helpers ─────────────────────────────────────────────────────
const M_PER_DEG = 111_320;
const cosLat = Math.cos((S.lat * Math.PI) / 180);
const mpp = (zoom: number) => (156_543.03 * cosLat) / 2 ** zoom; // metres per screen pixel
function circle(lng: number, lat: number, r: number, n = 18): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([lng + (r * Math.cos(a)) / (M_PER_DEG * cosLat), lat + (r * Math.sin(a)) / M_PER_DEG]);
  }
  return pts;
}
function arc(from: { lng: number; lat: number }, to: { lng: number; lat: number }, n = 40) {
  // Gentle curve: a quadratic Bézier bent to the side.
  const mx = (from.lng + to.lng) / 2;
  const my = (from.lat + to.lat) / 2;
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  const c = { lng: mx - dy * 0.18, lat: my + dx * 0.18 * cosLat };
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return [(1 - u) ** 2 * from.lng + 2 * (1 - u) * u * c.lng + u * u * to.lng, (1 - u) ** 2 * from.lat + 2 * (1 - u) * u * c.lat + u * u * to.lat];
  });
}
const partial = (line: number[][], p: number) => line.slice(0, Math.max(2, Math.round(p * (line.length - 1)) + 1));
const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features });
const poly = (ring: number[][], props: Record<string, unknown>): GeoJSON.Feature => ({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } });
const lineF = (coords: number[][], props: Record<string, unknown> = {}): GeoJSON.Feature => ({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coords } });

// ── Data for the scenes ──────────────────────────────────────────────────
const unitPos = new Map(madridUnits.map((u) => [u.id, { lng: u.lng, lat: u.lat }]));
const SITE_POS = { lng: S.lng, lat: S.lat };
const B = chosen('B');
const A = chosen('A');
const C = chosen('C');
const NEW = new Set(NEW_HOMES);
const homes = OPTIONS.B.assignments.map((a) => a.unitId);
const routes = new Map(homes.concat(NEW_HOMES).map((id) => [id, arc(unitPos.get(id)!, SITE_POS)]));
const distKm = (id: string) => Math.hypot((unitPos.get(id)!.lng - S.lng) * cosLat, unitPos.get(id)!.lat - S.lat) * 111.32;

// Option highlights, timed to the clicks in the app clip shown in the rectangle.
const OPT_TIMES = { A: 26.2, C: 29.6, B: 33.0 };

// ── Map style: OpenFreeMap Positron, recoloured to the brand ─────────────
async function brandStyle(): Promise<StyleSpecification> {
  const style = (await (await fetch('https://tiles.openfreemap.org/styles/positron')).json()) as StyleSpecification;
  const keepLabels = new Set(['label_city', 'label_city_capital', 'label_town', 'label_country_1', 'label_country_2', 'label_country_3']);
  for (const l of style.layers as any[]) {
    l.paint ??= {};
    if (l.id === 'background') l.paint['background-color'] = '#F3ECE5';
    else if (l.id === 'water') l.paint['fill-color'] = '#D8E1E3';
    else if (l.id === 'park' || l.id === 'landcover_wood') l.paint['fill-color'] = '#E4E5D6';
    else if (l.id === 'landuse_residential') l.paint['fill-color'] = '#EEE5DD';
    else if (l.id === 'building') l.paint['fill-color'] = '#E8DED5';
    else if (l.type === 'line' && l.id.startsWith('boundary')) l.paint['line-color'] = '#C9BBB0';
    else if (l.type === 'line' && l.id.includes('casing')) l.paint['line-color'] = '#E0D4CA';
    else if (l.type === 'line' && (l.id.includes('rail'))) l.paint['line-color'] = '#DCCFC5';
    else if (l.type === 'line' && l.source === 'openmaptiles' && l['source-layer'] === 'transportation') l.paint['line-color'] = '#FFFFFF';
    if (l.type === 'symbol') {
      if (!keepLabels.has(l.id)) l.layout = { ...(l.layout ?? {}), visibility: 'none' };
      else {
        l.paint['text-color'] = '#8C7D75';
        l.paint['text-halo-color'] = '#F3ECE5';
      }
    }
  }
  (style.layers as any[]).splice(
    (style.layers as any[]).findIndex((l) => l.id === 'building') + 1,
    0,
    { id: 'bld3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 12.5, paint: { 'fill-extrusion-color': '#E3D8CE', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.92 } },
  );
  return style;
}

// ── Rectangle: frames of the real app ────────────────────────────────────
const RECT = [
  { name: 'brief', t0: 9.6, t1: 20.6 },
  { name: 'options', t0: 23.8, t1: 38.4 },
  { name: 'approve', t0: 39.2, t1: 48.4 },
  { name: 'checkin', t0: 50, t1: 66.2 },
  { name: 'replan', t0: 66.6, t1: 76.4 },
];
let frames: Record<string, number> = {};

// ── Captions ─────────────────────────────────────────────────────────────
const CAPS = [
  { a: 0.8, b: 7.7, eye: 'Monday, 9:02 · HR', html: `Iberia Grid won a data-centre fit-out.<br><span>${FACTS.demo.people} engineers need a home.</span>`, dark: false },
  { a: 9.4, b: 20.4, eye: '1 · Brief', html: 'One brief.<br><span>The AI reads it.</span>' },
  { a: 23.4, b: 38.2, eye: '2 · Plan', html: 'Three plans.<br><span>Cost against commute.</span>' },
  { a: 38.8, b: 48.2, eye: '3 · Approve', html: 'A person checks.<br><span>One click approves.</span>' },
  { a: 49, b: 66, eye: '4 · Live', html: `Day 1. Everyone lives<br><span>≤ ${DEMO_BRIEF.maxCommuteMin} min from the site.</span>` },
  { a: 66.6, b: 76.2, eye: '5 · Re-plan', html: `+${FACTS.replan.people} engineers from month ${FACTS.replan.fromMonth}.<br><span>Nobody moved.</span>` },
  { a: 77.4, b: 84, eye: 'Next missions', html: `${FACTS.cities[0]} first.<br><span>Four more cities.</span>` },
];

// ── Build ────────────────────────────────────────────────────────────────
let map: maplibregl.Map;
let office: ReturnType<typeof createOffice>;
const cityEls: HTMLElement[] = [];

async function init() {
  $('tagline').textContent = FACTS.brand.tagline;
  try {
    frames = await (await fetch('./.frames/manifest.json')).json();
  } catch {
    frames = {};
  }
  office = createOffice($('office') as HTMLCanvasElement);
  const c0 = camAt(0);
  map = new maplibregl.Map({
    container: 'map',
    style: await brandStyle(),
    center: [c0.lng, c0.lat],
    zoom: c0.zoom,
    pitch: c0.pitch,
    bearing: c0.bearing,
    interactive: false,
    fadeDuration: 0,
    attributionControl: false,
    maxPitch: 75,
    pixelRatio: 1,
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
  } as maplibregl.MapOptions);
  await new Promise<void>((r) => map.once('load', () => r()));
  const add = (id: string) => map.addSource(id, { type: 'geojson', data: fc([]) });
  ['rings', 'routes', 'units', 'site', 'people', 'cities'].forEach(add);
  map.addLayer({ id: 'rings', type: 'line', source: 'rings', paint: { 'line-color': '#2A2320', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': ['get', 'o'] } });
  map.addLayer({ id: 'ring-labels', type: 'symbol', source: 'rings', filter: ['==', ['geometry-type'], 'Point'], layout: { 'text-field': ['get', 'label'], 'text-size': 22, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#2A2320', 'text-opacity': ['get', 'o'], 'text-halo-color': '#F3ECE5', 'text-halo-width': 2 } });
  map.addLayer({ id: 'routes', type: 'line', source: 'routes', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 2.5, 'line-opacity': ['get', 'o'] } });
  map.addLayer({ id: 'site', type: 'fill-extrusion', source: 'site', paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': 1 } });
  map.addLayer({ id: 'units', type: 'fill-extrusion', source: 'units', paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 1 } });
  map.addLayer({ id: 'people', type: 'fill-extrusion', source: 'people', paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': 1 } });
  map.addLayer({ id: 'cities', type: 'circle', source: 'cities', paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'c'], 'circle-opacity': ['get', 'o'], 'circle-stroke-color': '#F7EEE7', 'circle-stroke-width': 3, 'circle-stroke-opacity': ['get', 'o'] } });
  for (const c of CITY_POINTS) {
    const el = document.createElement('div');
    el.className = c.city === 'Madrid' ? 'city launch' : 'city';
    el.innerHTML = `<b>${c.city}</b><span>${FACTS.rollout[c.city]}</span>`;
    $('cities').appendChild(el);
    cityEls.push(el);
  }
  (window as any).filmReady = true;
}

// ── Frame ────────────────────────────────────────────────────────────────
const set = (id: string, data: GeoJSON.FeatureCollection) => (map.getSource(id) as GeoJSONSource).setData(data);
const op = (id: string, o: number) => (($(id).style.opacity = String(o)), ($(id).style.visibility = o > 0.001 ? 'visible' : 'hidden'));

async function seek(t: number) {
  const cam = camAt(t);
  map.jumpTo({ center: [cam.lng, cam.lat], zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing });
  const px = mpp(cam.zoom); // metres per pixel now

  // Scene 1 · office (fades into the map)
  const officeO = 1 - seg(t, 7.4, 8.6);
  op('office', officeO);
  if (officeO > 0) office.render(Math.min(t, 8.6));

  // Site: campus block + a pin that rises in scene 2
  const pinH = out(seg(t, 11.2, 13.4)) * 150 * px * (t > 76 ? 1 - seg(t, 76, 78) : 1);
  const campus = [
    [S.lng - 0.0032, S.lat - 0.0016],
    [S.lng + 0.0032, S.lat - 0.0016],
    [S.lng + 0.0032, S.lat + 0.0016],
    [S.lng - 0.0032, S.lat + 0.0016],
    [S.lng - 0.0032, S.lat - 0.0016],
  ];
  const siteF = [
    poly(campus, { c: '#2A2320', h: Math.max(30, 10 * px) * seg(t, 10.5, 12) * (1 - seg(t, 77, 79)), b: 0 }),
    poly(circle(S.lng, S.lat, 7 * px), { c: '#C4573D', h: pinH, b: 0 }),
    poly(circle(S.lng, S.lat, 13 * px), { c: '#C4573D', h: pinH + 26 * px * (pinH > 0 ? 1 : 0), b: pinH }),
  ];
  set('site', fc(siteF));

  // Rings: 15 and 30 minutes, drawn in scene 3
  const ringP = seg(t, 20.8, 23.4);
  const ringO = ringP > 0 ? 1 - seg(t, 47, 49) : 0;
  set(
    'rings',
    fc(
      RINGS_MIN.flatMap((m, i) => {
        const r = ringKm(m) * 1000;
        const line = circle(S.lng, S.lat, r, 120);
        const pt = line[Math.round(0.68 * 120)];
        return [lineF(partial(line, out(seg(ringP, i * 0.25, 0.75 + i * 0.25))), { o: ringO * 0.55 }), { type: 'Feature', properties: { o: ringO * seg(t, 23, 23.6), label: `${m} min` }, geometry: { type: 'Point', coordinates: pt } } as GeoJSON.Feature];
      }),
    ),
  );

  // Apartments: appear in scene 3; options light up A → C → B; B stays
  const which = t < OPT_TIMES.A ? null : t < OPT_TIMES.C ? A : t < OPT_TIMES.B ? C : B;
  const unitsF: GeoJSON.Feature[] = [];
  for (const u of madridUnits) {
    const isNew = NEW.has(u.id);
    const appear = isNew ? out(seg(t, 66.8, 68.2)) : out(seg(t, 21.6 + distKm(u.id) * 0.06, 22.6 + distKm(u.id) * 0.06));
    if (appear <= 0) continue;
    const inSel = which?.has(u.id) ?? false;
    const ours = (t >= OPT_TIMES.B && B.has(u.id)) || (isNew && t >= 66.8);
    const late = t >= 40; // after approval, other apartments step back
    const base = late && !ours ? 10 : 34;
    const h = (inSel || ours ? (late ? 46 : 64) : base) * appear * px * (1 - seg(t, 77, 79));
    const col = ours ? '#C4573D' : inSel ? '#C4573D' : late ? '#E3D9D0' : '#BDAFA5';
    unitsF.push(poly(circle(u.lng, u.lat, (inSel || ours ? 6 : 4.5) * px, 6), { c: col, h }));
  }
  set('units', fc(unitsF));

  // Routes: drawn on approval (scene 4), new ones in month 3
  const routeF: GeoJSON.Feature[] = [];
  const routeO = 1 - seg(t, 76, 77.5);
  for (const id of homes) {
    const p = out(seg(t, 39.5 + distKm(id) * 0.05, 41.5 + distKm(id) * 0.05));
    if (p > 0) routeF.push(lineF(partial(routes.get(id)!, p), { c: '#C4573D', o: 0.75 * routeO }));
  }
  for (const id of NEW_HOMES) {
    const p = out(seg(t, 67.6, 69));
    if (p > 0) routeF.push(lineF(partial(routes.get(id)!, p), { c: '#2A2320', o: 0.9 * routeO }));
  }
  set('routes', fc(routeF));

  // People: scene 5 commute + time-lapse, scene 6 with the 3 newcomers
  const peopleF: GeoJSON.Feature[] = [];
  const commute = (s: number) => {
    // s ∈ [0,1]: 0 at home, 1 at the site
    return s;
  };
  let pos: number | null = null; // shared progress along routes, null = hidden
  let clock = '';
  if (t >= 48.6 && t < 76.5) {
    if (t < 53.6) {
      pos = commute(io(seg(t, 49.2, 53.4)));
      clock = 'Day 1 · 08:00';
    } else if (t < 55.4) {
      pos = 1;
      clock = 'Day 1 · on site';
    } else if (t < 59.2) {
      pos = 1 - io(seg(t, 55.6, 59));
      clock = 'Day 1 · 18:30';
    } else if (t < 66.4) {
      const d = (t - 59.2) / 0.9; // one day every 0.9 s
      pos = 0.5 - 0.5 * Math.cos(d * Math.PI * 2);
      const day = 2 + Math.floor(d * 7.4);
      clock = day < 60 ? `Day ${day}` : `Month 3`;
    } else {
      pos = t < 68.6 ? 0 : io(seg(t, 68.8, 73));
      clock = `Month ${FACTS.replan.fromMonth} · +${FACTS.replan.people} engineers · ${REPLAN.moved} moved`;
    }
  }
  if (pos !== null) {
    const travellers = t >= 66.4 ? homes.concat(NEW_HOMES) : homes;
    travellers.forEach((id, i) => {
      const line = routes.get(id)!;
      const k = Math.min(line.length - 1, Math.round(pos! * (line.length - 1)));
      let [lng, lat] = line[k];
      if (pos! > 0.98) {
        // gather around the campus
        const a = (i / travellers.length) * Math.PI * 2;
        lng = S.lng + (22 * px * Math.cos(a)) / (M_PER_DEG * cosLat);
        lat = S.lat + (22 * px * Math.sin(a)) / M_PER_DEG;
      }
      if (pos! < 0.02) return; // at home: inside the building
      const isNew = NEW.has(id);
      peopleF.push(poly(circle(lng, lat, 3.4 * px, 10), { c: isNew ? '#C4573D' : '#2A2320', h: 15 * px, b: 0 }));
      peopleF.push(poly(circle(lng, lat, 2.6 * px, 10), { c: isNew ? '#C4573D' : '#2A2320', h: 21 * px, b: 16 * px }));
    });
  }
  set('people', fc(peopleF));
  $('clock').textContent = clock;
  op('clock', clock ? fadeWin(t, 48.8, 76.2, 0.4) : 0);

  // Approval seal
  $('seal').innerHTML = `✓ Approved · <em>${OPTIONS.B.assignments.length} / ${DEMO_BRIEF.employees.length}</em> housed`;
  op('seal', fadeWin(t, 43.2, 48.4, 0.4));

  // Spain roll-out
  const cityO = (i: number) => (i === 0 ? seg(t, 78.6, 79.2) : i < 3 ? seg(t, 80.2, 80.8) : seg(t, 81.6, 82.2)) * (1 - seg(t, 85, 85.6));
  set('cities', fc(CITY_POINTS.map((c, i) => ({ type: 'Feature', properties: { o: cityO(i), r: i === 0 ? 14 : 10, c: i === 0 ? '#C4573D' : '#2A2320' }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } }))));
  CITY_POINTS.forEach((c, i) => {
    const p = map.project([c.lng, c.lat]);
    cityEls[i].style.left = `${p.x}px`;
    cityEls[i].style.top = `${p.y - 18}px`;
    cityEls[i].style.opacity = String(cityO(i));
  });

  // Captions
  const cap = CAPS.find((c) => t >= c.a - 0.6 && t <= c.b + 0.1);
  if (cap) {
    $('eye').textContent = cap.eye;
    $('title').innerHTML = cap.html;
  }
  const capO = cap ? fadeWin(t, cap.a, cap.b, 0.5) : 0;
  op('cap', capO);
  ($('cap') as HTMLElement).style.transform = `translateY(${(1 - capO) * 16}px)`;
  op('capbg', t < 84 ? capO : 0);

  // Rectangle with the real app
  const r = RECT.find((x) => t >= x.t0 - 0.5 && t <= x.t1);
  const rO = r ? fadeWin(t, r.t0 - 0.5, r.t1, 0.5) : 0;
  op('rect', rO);
  ($('rect') as HTMLElement).style.transform = `translateY(${(1 - rO) * 24}px)`;
  if (r && frames[r.name]) {
    const n = clamp(Math.floor((t - r.t0) * 30) + 1, 1, frames[r.name]);
    const src = `./.frames/${r.name}/f${String(n).padStart(5, '0')}.jpg`;
    const img = $('rectimg') as HTMLImageElement;
    if (!img.src.endsWith(src.slice(1))) {
      img.src = src;
      await img.decode().catch(() => {});
    }
  }

  // End card and the first fade-in
  op('end', seg(t, 84.2, 85.2));
  op('fade', 1 - seg(t, 0, 0.6));

  await new Promise<void>((res) => {
    const done = setTimeout(res, 10_000);
    map.once('idle', () => (clearTimeout(done), res()));
    map.triggerRepaint();
  });
}

(window as any).seek = seek;
(window as any).DURATION = DURATION;
init().then(() => seek(Number(new URLSearchParams(location.search).get('t') ?? 0)));

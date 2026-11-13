// Settle In · experience film (90 s). A deterministic timeline: window.seek(t) draws the frame at t seconds,
// and scripts/experience-film.mjs screenshots it 30 times per second.
// Story: the meeting where the demand is born → HR the traditional way → Settle In, one brief →
// 1 Brief · 2 Plan · 3 Approve · 4 Move in · 5 Re-plan → Spain roll-out → end card.
// Numbers come from src/data/facts.ts and the engines (film/data.ts).
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// Bundle MapLibre's worker with Vite and tell MapLibre where it is (works whatever node_modules is).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
maplibregl.setWorkerUrl(workerUrl);
import { CITY_POINTS, EUROPE, FACTS, MADRID_SITE, OPTIONS, RELEASED, REPLAN, RINGS_MIN, chosen, madridUnits, ringKm } from './data';
import { createMeeting } from './meeting';
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

// ── Scene times (s) ──────────────────────────────────────────────────────
const MEET = [0, 9.6]; // the meeting
const DESK = [9.2, 22.2]; // HR, traditional way → Settle In → push into the screen
const MAP_IN = 21.6; // the map appears behind the screen
const OPT_TIMES = { A: 34.4, C: 37.8, B: 41.2 }; // timed to the clicks in the app clip
const APPROVED = 46.5;
const MOVE_IN = [55, 64.4];
const REPLAN_T = 64.4;
const SPAIN = 73.6;
const EUROPE_T = 81.4; // camera rises from Spain to Europe
const END = 85;

// ── Camera ───────────────────────────────────────────────────────────────
type Cam = { t: number; lng: number; lat: number; zoom: number; pitch: number; bearing: number; ease?: boolean };
const S = MADRID_SITE;
const ES = { lng: -3.55, lat: 40.05 };
const firstHome = OPTIONS.B.assignments[0];
const homeUnit = madridUnits.find((u) => u.id === firstHome.unitId)!;
const H = { lng: homeUnit.lng, lat: homeUnit.lat };
const AREA = { lng: S.lng + 0.02, lat: S.lat - 0.05 };
const NEAR = { lng: S.lng - 0.01, lat: S.lat - 0.03 };
const KEYS: Cam[] = [
  { t: 0, ...ES, zoom: 5.6, pitch: 0, bearing: 0 },
  { t: MAP_IN, ...ES, zoom: 5.6, pitch: 0, bearing: 0 },
  { t: 26.6, ...S, zoom: 15.6, pitch: 63, bearing: -30, ease: true },
  { t: 31.4, ...S, zoom: 15.9, pitch: 65, bearing: 55 },
  { t: 34, ...AREA, zoom: 10.45, pitch: 46, bearing: 12, ease: true },
  { t: 45, ...AREA, zoom: 10.6, pitch: 48, bearing: 24 },
  { t: 48, ...NEAR, zoom: 11.3, pitch: 58, bearing: 30, ease: true },
  { t: 55, ...NEAR, zoom: 11.4, pitch: 58, bearing: 42 },
  { t: 58, ...H, zoom: 15.6, pitch: 64, bearing: 20, ease: true },
  { t: 64.4, ...H, zoom: 15.8, pitch: 64, bearing: 75 },
  { t: 67.4, ...NEAR, zoom: 11.5, pitch: 58, bearing: 55, ease: true },
  { t: SPAIN, ...NEAR, zoom: 11.5, pitch: 58, bearing: 70 },
  { t: 77.4, lng: -2.2, lat: 39.75, zoom: 5.75, pitch: 34, bearing: -12, ease: true },
  { t: EUROPE_T, lng: -1.4, lat: 40.0, zoom: 5.85, pitch: 42, bearing: 14 },
  { t: 84.2, lng: 2.5, lat: 44.6, zoom: 4.25, pitch: 30, bearing: 6, ease: true },
  { t: 90, lng: 2.6, lat: 44.8, zoom: 4.2, pitch: 30, bearing: 8 },
];
function camAt(t: number) {
  const i = KEYS.findIndex((k) => k.t > t);
  if (i < 0) return KEYS[KEYS.length - 1];
  if (i === 0) return KEYS[0];
  const a = KEYS[i - 1];
  const b = KEYS[i];
  const x0 = seg(t, a.t, b.t);
  const x = b.ease ? io(x0) : x0;
  return { lng: lerp(a.lng, b.lng, x), lat: lerp(a.lat, b.lat, x), zoom: lerp(a.zoom, b.zoom, x), pitch: lerp(a.pitch, b.pitch, x), bearing: lerp(a.bearing, b.bearing, x) };
}

// ── Geometry helpers ─────────────────────────────────────────────────────
const M_PER_DEG = 111_320;
const cosLat = Math.cos((S.lat * Math.PI) / 180);
const mpp = (zoom: number) => (156_543.03 * cosLat) / 2 ** zoom; // metres per screen pixel
const dLng = (m: number) => m / (M_PER_DEG * cosLat);
const dLat = (m: number) => m / M_PER_DEG;
function circle(lng: number, lat: number, r: number, n = 18): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([lng + dLng(r * Math.cos(a)), lat + dLat(r * Math.sin(a))]);
  }
  return pts;
}
/** Rectangle centred on (lng, lat), w × d metres, rotated by rot radians. */
function rect(lng: number, lat: number, w: number, d: number, rot = 0): number[][] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]];
  return pts.map(([x, y]) => [lng + dLng(x * c - y * s), lat + dLat(x * s + y * c)]);
}
const partial = (line: number[][], p: number) => line.slice(0, Math.max(2, Math.round(p * (line.length - 1)) + 1));
const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features });
const poly = (ring: number[][], props: Record<string, unknown>): GeoJSON.Feature => ({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } });
const lineF = (coords: number[][], props: Record<string, unknown> = {}): GeoJSON.Feature => ({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coords } });

// ── Data for the scenes ──────────────────────────────────────────────────
const B = chosen('B');
const A = chosen('A');
const C = chosen('C');
const RELEASED_SET = new Set(RELEASED);
const distKm = (u: { lng: number; lat: number }) => Math.hypot((u.lng - S.lng) * cosLat, u.lat - S.lat) * 111.32;
const occupant = (unitId: string) => DEMO_BRIEF.employees.find((e) => e.id === OPTIONS.B.assignments.find((a) => a.unitId === unitId)?.employeeId)?.name ?? '';
/** Deterministic per-building variety (floors, which floor is ours, rotation). */
function hash(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

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
    else if (l.type === 'line' && l.id.includes('rail')) l.paint['line-color'] = '#DCCFC5';
    else if (l.type === 'line' && l['source-layer'] === 'transportation') l.paint['line-color'] = '#FFFFFF';
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
  { name: 'brief', t0: 22.8, t1: 31.6 },
  { name: 'options', t0: 32, t1: 45.4 },
  { name: 'approve', t0: 46, t1: 55 },
  { name: 'checkin', t0: 56.2, t1: 64.4 },
  { name: 'replan', t0: 64.9, t1: 73.4 },
];
let frames: Record<string, number> = {};

// ── Captions ─────────────────────────────────────────────────────────────
const P = FACTS.demo.people;
const R = FACTS.replan;
const CAPS = [
  { a: 0.7, b: 4.5, eye: 'Monday · Iberia Grid', html: `We won the ${FACTS.demo.city} data-centre.<br><span>Who goes on site?</span>` },
  { a: 4.9, b: 9.3, eye: 'The decision', html: `${P} engineers, ${FACTS.demo.months} months.<br><span>From 1 December.</span>` },
  { a: 10, b: 15.6, eye: 'HR, the traditional way', html: `${P} landlords. ${P} contracts.<br><span>${P} deposits. ${FACTS.demo.hrHoursByHand} hours.</span>` },
  { a: 16, b: 21.4, eye: 'With Settle In', html: 'One brief.<br><span>One partner.</span>' },
  { a: 22.6, b: 31.4, eye: '1 · Brief', html: 'HR sends one brief.<br><span>The AI reads it.</span>' },
  { a: 31.8, b: 45.2, eye: '2 · Plan', html: 'Cheapest. Closest. Balanced.<br><span>From real, verified flats.</span>' },
  { a: 45.6, b: 54.8, eye: '3 · Approve', html: `A person checks.<br><span>${P} homes, one signature.</span>` },
  { a: 55.4, b: 64.2, eye: '4 · Move in', html: 'A home near the site.<br><span>Keys and Wi-Fi on WhatsApp.</span>' },
  { a: 64.8, b: 73.2, eye: '5 · Re-plan', html: `From month ${R.fromMonth}, a team of ${P - R.people}.<br><span>${R.people} flats released. Nobody moved.</span>` },
  { a: 74.4, b: 84.6, eye: 'Next missions', html: `${FACTS.cities[0]} first.<br><span>Then Spain, then Europe.</span>` },
];
const STEPS = [22.4, 31.8, 45.6, 55.2, 64.6, 73.8];

// ── Build ────────────────────────────────────────────────────────────────
let map: maplibregl.Map;
let office: ReturnType<typeof createOffice>;
let meeting: ReturnType<typeof createMeeting>;
const cityEls: HTMLElement[] = [];

async function init() {
  $('tagline').textContent = FACTS.brand.tagline;
  $('endline').textContent = 'One brief. One plan. One invoice.';
  try {
    frames = await (await fetch('./.frames/manifest.json')).json();
  } catch {
    frames = {};
  }
  meeting = createMeeting($('meeting') as HTMLCanvasElement);
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
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
  } as maplibregl.MapOptions);
  await new Promise<void>((r) => map.once('load', () => r()));
  ['rings', 'units', 'site', 'siteline', 'cities', 'arcs', 'cpins'].forEach((id) => map.addSource(id, { type: 'geojson', data: fc([]) }));
  map.addLayer({ id: 'rings', type: 'line', source: 'rings', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#2A2320', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': ['get', 'o'] } });
  map.addLayer({ id: 'ring-labels', type: 'symbol', source: 'rings', filter: ['==', ['geometry-type'], 'Point'], layout: { 'text-field': ['get', 'label'], 'text-size': 22, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#2A2320', 'text-opacity': ['get', 'o'], 'text-halo-color': '#F3ECE5', 'text-halo-width': 2 } });
  map.addLayer({ id: 'siteline', type: 'line', source: 'siteline', paint: { 'line-color': '#C4573D', 'line-width': 3, 'line-opacity': ['get', 'o'] } });
  map.addLayer({ id: 'site', type: 'fill-extrusion', source: 'site', paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': 1 } });
  map.addLayer({ id: 'units', type: 'fill-extrusion', source: 'units', paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true } });
  map.addLayer({ id: 'arcs', type: 'line', source: 'arcs', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 4, 'line-opacity': ['get', 'o'] } });
  map.addLayer({ id: 'cpins', type: 'fill-extrusion', source: 'cpins', paint: { 'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': 1 } });
  map.addLayer({ id: 'cities', type: 'circle', source: 'cities', paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'c'], 'circle-opacity': ['get', 'o'], 'circle-stroke-color': '#F7EEE7', 'circle-stroke-width': 3, 'circle-stroke-opacity': ['get', 'o'] } });
  for (const c of [...CITY_POINTS.map((x) => ({ name: x.city as string, when: FACTS.rollout[x.city] })), { name: EUROPE.label, when: EUROPE.when }]) {
    const el = document.createElement('div');
    el.className = c.name === 'Madrid' ? 'city launch' : 'city';
    el.innerHTML = `<b>${c.name}</b><span>${c.when}</span>`;
    $('cities').appendChild(el);
    cityEls.push(el);
  }
  (window as any).filmReady = true;
}

// ── Frame ────────────────────────────────────────────────────────────────
const set = (id: string, data: GeoJSON.FeatureCollection) => (map.getSource(id) as GeoJSONSource).setData(data);
const op = (id: string, o: number) => (($(id).style.opacity = String(o)), ($(id).style.visibility = o > 0.001 ? 'visible' : 'hidden'));

/** The project site: data-centre halls, offices, a cooling yard, a fence, and a beacon visible from afar. */
function siteFeatures(t: number, px: number) {
  const grow = out(seg(t, 24.2, 26.4)) * (1 - seg(t, SPAIN + 1, SPAIN + 3));
  const k = clamp((3.2 * px) / 6, 1, 2.2); // the campus grows a little when far, so it reads at any zoom
  const halls: GeoJSON.Feature[] = [
    [-150, 40, 120, 70, 22],
    [0, 40, 120, 70, 22],
    [150, 40, 120, 70, 22],
    [-60, -70, 80, 40, 30],
    [100, -75, 120, 30, 9],
  ].map(([x, y, w, d, h], i) => poly(rect(S.lng + dLng(x * k), S.lat + dLat(y * k), w * k, d * k, 0.28), { c: i < 3 ? '#4A3F3A' : i === 3 ? '#2A2320' : '#9C8E87', h: h * k * grow, b: 0 }));
  const beaconH = Math.min(60 * px + 40, 2600) * out(seg(t, 25.2, 27)) * (1 - seg(t, SPAIN + 1, SPAIN + 3));
  const bx = S.lng + dLng(260 * k);
  const by = S.lat + dLat(-20 * k);
  const beacon = [
    poly(circle(bx, by, Math.max(6, 3 * px), 14), { c: '#C4573D', h: beaconH, b: 0 }),
    poly(circle(bx, by, Math.max(14, 7 * px), 18), { c: '#C4573D', h: beaconH + Math.max(12, 9 * px) * (beaconH > 0 ? 1 : 0), b: beaconH }),
  ];
  // Rooftop cooling units on the halls, and a tower crane: the site is being built
  const roof: GeoJSON.Feature[] = [];
  [-150, 0, 150].forEach((x, i) =>
    [-30, 0, 30].forEach((dx) => roof.push(poly(rect(S.lng + dLng((x + dx) * k), S.lat + dLat(40 * k), 14 * k, 40 * k, 0.28), { c: '#D9CCC1', h: 26 * k * grow, b: 22 * k * grow, i }))),
  );
  const cg = out(seg(t, 26, 28.4)) * (1 - seg(t, 33, 34)); // crane only in the close-up
  const cx = S.lng + dLng(-260 * k);
  const cy = S.lat + dLat(60 * k);
  const crane = [
    poly(rect(cx, cy, 5 * k, 5 * k, 0.28), { c: '#C4573D', h: 70 * k * cg, b: 0 }),
    poly(rect(cx + dLng(25 * k), cy + dLat(7 * k), 70 * k, 3 * k, 0.28), { c: '#C4573D', h: 72 * k * cg, b: 68 * k * cg }),
  ];
  const fence = rect(S.lng, S.lat, 560 * k, 300 * k, 0.28);
  const solids = [...halls, ...roof, ...beacon, ...crane].filter((f) => (f.properties!.h as number) - (f.properties!.b as number) > 0.5);
  return { solids: fc(solids), fence: fc(grow > 0.01 ? [lineF(partial(fence, out(seg(t, 25, 26.8))), { o: 0.9 * grow })] : []) };
}

/** A residential block with our flat as a terracotta band. Size never drops below a few pixels. */
function building(id: string, lng: number, lat: number, px: number, appear: number, ours: boolean, faded: boolean) {
  const r = hash(id);
  const floors = 6 + Math.floor(r * 5);
  const ourFloor = 2 + Math.floor(r * 3);
  const fl = Math.max(6, 3.4 * px); // floor height (m), exaggerated so the block reads at every zoom
  const w = Math.max(70, 9 * px);
  const d = Math.max(50, 7 * px);
  const ring = rect(lng, lat, w, d, r * Math.PI);
  const body = '#F4EDE6';
  const top = floors * fl * appear;
  if (!ours) return [poly(ring, { c: faded ? '#E3D9D0' : '#BDAFA5', h: top * (faded ? 0.5 : 1), b: 0 })];
  // our flat: a terracotta band, at least ~11 px tall so it is visible from afar
  const band = Math.max(fl, 11 * px);
  const b0 = Math.min(top, ourFloor * fl);
  const b1 = Math.min(top + band, b0 + band);
  return [poly(ring, { c: body, h: b0, b: 0 }), poly(rect(lng, lat, w * 1.06, d * 1.06, r * Math.PI), { c: '#C4573D', h: b1 * appear, b: b0 }), poly(ring, { c: body, h: Math.max(b1, top + band) * appear, b: b1 })];
}

async function seek(t: number) {
  const cam = camAt(t);
  map.jumpTo({ center: [cam.lng, cam.lat], zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing });
  const px = mpp(cam.zoom);

  // Scene 1 · the meeting, Scene 2 · HR's desk (pushes into the screen, then the map)
  const meetO = 1 - seg(t, MEET[1] - 0.5, MEET[1]);
  op('meeting', meetO);
  if (meetO > 0) meeting.render(Math.min(t, MEET[1]));
  const officeO = t < DESK[0] ? 0 : 1 - seg(t, DESK[1] - 0.7, DESK[1]);
  op('office', officeO);
  if (officeO > 0) office.render(clamp(t - DESK[0], 0, DESK[1] - DESK[0]));

  // Site
  const site = siteFeatures(t, px);
  set('site', site.solids);
  set('siteline', site.fence);

  // Rings: 15 and 30 minutes, drawn in the plan scene
  const ringP = seg(t, 32.2, 34.6);
  const ringO = ringP > 0 ? 1 - seg(t, 54, 56) : 0;
  set(
    'rings',
    fc(
      RINGS_MIN.flatMap((m, i) => {
        const line = circle(S.lng, S.lat, ringKm(m) * 1000, 120);
        return [lineF(partial(line, out(seg(ringP, i * 0.25, 0.75 + i * 0.25))), { o: ringO * 0.55 }), { type: 'Feature', properties: { o: ringO * seg(t, 34.2, 34.8), label: `${m} min` }, geometry: { type: 'Point', coordinates: line[Math.round(0.68 * 120)] } } as GeoJSON.Feature];
      }),
    ),
  );

  // Apartments: appear in the plan scene, options light up A → C → B; after approval our homes become
  // residential buildings with our flat highlighted; month 3 adds three more.
  const which = t < OPT_TIMES.A ? null : t < OPT_TIMES.C ? A : t < OPT_TIMES.B ? C : B;
  const unitsF: GeoJSON.Feature[] = [];
  const gone = 1 - seg(t, SPAIN + 1, SPAIN + 3);
  for (const u of madridUnits) {
    const appear = out(seg(t, 32.8 + distKm(u) * 0.06, 33.8 + distKm(u) * 0.06)) * gone;
    if (appear <= 0) continue;
    const ours = t >= OPT_TIMES.B && B.has(u.id);
    // re-plan: the five leavers' flats are released one after the other (the band switches off)
    const released = RELEASED_SET.has(u.id) && t >= REPLAN_T + 1.8 + RELEASED.indexOf(u.id) * 0.45;
    if (t >= APPROVED) {
      if (ours) unitsF.push(...building(u.id, u.lng, u.lat, px, Math.max(0.001, out(seg(t, APPROVED, APPROVED + 1.4))) * gone, !released, released));
      else {
        const left = appear * (1 - seg(t, APPROVED, APPROVED + 1.2));
        if (left > 0) unitsF.push(poly(circle(u.lng, u.lat, 4.5 * px, 6), { c: '#BDAFA5', h: 34 * left * px, b: 0 }));
      }
      continue;
    }
    const inSel = which?.has(u.id) ?? false;
    const h = (inSel ? 64 : 34) * appear * px;
    unitsF.push(poly(circle(u.lng, u.lat, (inSel ? 6 : 4.5) * px, 6), { c: inSel ? '#C4573D' : '#BDAFA5', h, b: 0 }));
  }
  set('units', fc(unitsF.filter((f) => (f.properties!.h as number) - (f.properties!.b as number) > 0.5)));
  // In the move-in close-up the city's own buildings step back so ours stands out
  map.setPaintProperty('bld3d', 'fill-extrusion-opacity', 0.92 - 0.55 * fadeWin(t, MOVE_IN[0] + 1.5, MOVE_IN[1] + 2, 1.2));

  // Badges
  const replanOn = t >= REPLAN_T + 1 && t < SPAIN;
  // Expansion counter: flats occupied on average each year as the cities open (financial model)
  const years = FACTS.kpi.occupiedByYear;
  const stage = t < 79.4 ? 0 : t < 80.6 ? 1 : t < EUROPE_T ? 2 : t < 83 ? 3 : 4;
  const growth = ['2027 · Madrid', '2028 · + Valencia, Zaragoza', '2029 · + Barcelona, Málaga', '2030 · five cities', `2031 · ${EUROPE.label}`][stage];
  const flats = stage < 4 ? ` · <em>${years[stage]}</em> flats occupied` : ' · first hub abroad';
  const spainOn = t >= SPAIN + 4.4 && t < END;
  $('clock').innerHTML = replanOn ? `Month ${R.fromMonth} · team of ${P - R.people} · <em>${R.people}</em> flats released · ${REPLAN.moved} moved` : spainOn ? growth + flats : '';
  op('clock', replanOn ? fadeWin(t, REPLAN_T + 1, SPAIN, 0.4) : spainOn ? fadeWin(t, SPAIN + 4.4, END, 0.4) : 0);
  $('seal').innerHTML = `✓ Approved · <em>${OPTIONS.B.assignments.length} / ${DEMO_BRIEF.employees.length}</em> housed`;
  op('seal', fadeWin(t, 50, 55, 0.4));

  // Move in: a label on our engineer's building
  const tagO = fadeWin(t, MOVE_IN[0] + 3.2, MOVE_IN[1] - 0.2, 0.5);
  op('flat', tagO);
  if (tagO > 0) {
    const p = map.project([H.lng, H.lat]);
    const el = $('flat');
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y - 300}px`;
    el.innerHTML = `<b>${occupant(homeUnit.id)}</b><span>1-bed · floor ${2 + Math.floor(hash(homeUnit.id) * 3)} · ${Math.round(firstHome.commuteMin)} min to site</span>`;
  }

  // Roll-out: arcs fly out of Madrid, each city rises and pulses; then Europe (year 5)
  const startOf = (i: number) => (i === 0 ? 78.2 : i < 3 ? 79.4 + (i - 1) * 0.35 : i < 5 ? 80.6 + (i - 3) * 0.35 : 82.6);
  const pts = [...CITY_POINTS, { city: EUROPE.label, lng: EUROPE.lng, lat: EUROPE.lat }];
  const endFade = 1 - seg(t, END + 0.6, END + 1.2);
  // when the camera rises to Europe, the Spanish labels (except Madrid) step back so they do not pile up
  const cityO = (i: number) => seg(t, startOf(i) + 0.5, startOf(i) + 0.9) * endFade * (i > 0 && i < 5 ? 1 - seg(t, EUROPE_T + 0.6, EUROPE_T + 1.4) : 1);
  const M = CITY_POINTS[0];
  const arcF: GeoJSON.Feature[] = [];
  const pinF: GeoJSON.Feature[] = [];
  const pk = mpp(cam.zoom);
  pts.forEach((c, i) => {
    const p = out(seg(t, startOf(i), startOf(i) + 0.9));
    if (i > 0 && p > 0) {
      const mid = { lng: (M.lng + c.lng) / 2, lat: (M.lat + c.lat) / 2 + Math.hypot(c.lng - M.lng, c.lat - M.lat) * 0.22 };
      const curve = Array.from({ length: 41 }, (_, k) => {
        const u = k / 40;
        return [(1 - u) ** 2 * M.lng + 2 * (1 - u) * u * mid.lng + u * u * c.lng, (1 - u) ** 2 * M.lat + 2 * (1 - u) * u * mid.lat + u * u * c.lat];
      });
      arcF.push(lineF(partial(curve, p), { o: 0.85 * endFade, c: i === 5 ? '#2A2320' : '#C4573D' }));
    }
    const rise = out(seg(t, startOf(i) + 0.6, startOf(i) + 1.4)) * endFade;
    if (rise > 0) {
      const pulse = 1 + 0.35 * Math.max(0, Math.sin((t - startOf(i)) * 4)) * (1 - seg(t, startOf(i) + 1.6, startOf(i) + 2.4));
      pinF.push(poly(circle(c.lng, c.lat, (i === 0 ? 9 : 7) * pk * pulse, 20), { c: i === 0 ? '#C4573D' : i === 5 ? '#2A2320' : '#C4573D', h: (i === 0 ? 120 : 80) * pk * rise, b: 0 }));
    }
  });
  set('arcs', fc(arcF));
  set('cpins', fc(pinF));
  set('cities', fc([]));
  pts.forEach((c, i) => {
    const p = map.project([c.lng, c.lat]);
    cityEls[i].style.left = `${p.x}px`;
    cityEls[i].style.top = `${p.y - 18 - 90 * out(seg(t, startOf(i) + 0.6, startOf(i) + 1.4))}px`;
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
  op('capbg', t < END ? capO : 0);

  // Step tracker
  const cur = STEPS.findIndex((x, i) => t >= x && t < STEPS[i + 1]);
  document.querySelectorAll('#steps li').forEach((li, i) => {
    li.classList.toggle('on', i === cur);
    li.classList.toggle('done', cur > i);
  });
  op('steps', fadeWin(t, STEPS[0], STEPS[STEPS.length - 1] + 0.4, 0.6));

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
  op('end', seg(t, END, END + 1));
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

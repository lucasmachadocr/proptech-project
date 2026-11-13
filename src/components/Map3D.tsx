// 3D map of a plan: every flat of the plan stands up in 3D, numbered, with a line to the work site.
// From the city view each flat is a terracotta block; zoomed in, the flat's real building (OpenStreetMap footprint
// and height) lights up in terracotta among the city's 3D buildings. "Tour the plan" flies from flat to flat.
// MapLibre + OpenFreeMap (OpenStreetMap data). Loaded lazily (see PlanExplorer) so the rest of the app stays light.
import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { brandStyle } from '../lib/mapStyle';

export interface Pin {
  id: string;
  lng: number;
  lat: number;
  chosen: boolean;
  /** Number shown above a flat of the plan (1, 2, 3…). */
  label?: number;
}

interface Props {
  site: { lng: number; lat: number };
  pins: Pin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  height?: number;
}

const BRAND = '#C4573D';
const BRAND_LIGHT = '#E07A5F';
const INK = '#2A2320';
const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features });
const pt = (lng: number, lat: number, props: Record<string, unknown>): GeoJSON.Feature => ({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [lng, lat] } });
function square(lng: number, lat: number, half: number): number[][] {
  const dy = half / 111_320;
  const dx = half / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [[lng - dx, lat - dy], [lng + dx, lat - dy], [lng + dx, lat + dy], [lng - dx, lat + dy], [lng - dx, lat - dy]];
}
/** A gentle arc from the flat to the site, as a line (drawn flat on the map). */
function arc(a: [number, number], b: [number, number], n = 40): number[][] {
  const [x0, y0] = a;
  const [x1, y1] = b;
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const bend = Math.sin(Math.PI * t) * 0.12;
    return [x0 + (x1 - x0) * t + nx * bend, y0 + (y1 - y0) * t + ny * bend];
  });
}

export default function Map3D({ site, pins, selectedId, onSelect, height = 460 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [touring, setTouring] = useState(false);
  const tour = useRef<{ stop: boolean }>({ stop: false });
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  // Real building footprints found under each flat of the plan, cached as the user explores.
  const footprints = useRef(new Map<string, GeoJSON.Feature>());
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  // Create the map once.
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const [ml, style, worker] = await Promise.all([import('maplibre-gl'), brandStyle(), import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')]);
        // Vite bundles MapLibre's worker into one file; tell MapLibre where it is.
        ml.setWorkerUrl(worker.default);
        if (disposed || !box.current) return;
        // More detail: 3D buildings from zoom 12, shaded walls, and road names only up close.
        const detailed = JSON.parse(JSON.stringify(style)) as typeof style;
        for (const l of detailed.layers as { id: string; minzoom?: number; paint?: Record<string, unknown> }[]) {
          if (l.id === 'bld3d') {
            l.minzoom = 12;
            l.paint = { ...l.paint, 'fill-extrusion-vertical-gradient': true, 'fill-extrusion-opacity': 0.92, 'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10], 0, '#E9DFD6', 40, '#DDD0C4', 120, '#CFC0B2'] };
          }
          if (l.id.startsWith('highway-name')) l.minzoom = 15;
        }
        const m = new ml.Map({ container: box.current, style: detailed, center: [site.lng, site.lat], zoom: 11, pitch: 58, bearing: -20, maxPitch: 75, attributionControl: { compact: true }, canvasContextAttributes: { antialias: true } });
        m.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-left');
        map.current = m;
        const pickAt = (p: { x: number; y: number }) => (m.getLayer('flat-blocks') ? m.queryRenderedFeatures([[p.x - 6, p.y - 6], [p.x + 6, p.y + 6]], { layers: ['flat-blocks', 'flat-buildings', 'others'] }) : []);
        m.on('click', (e) => {
          const id = pickAt(e.point)[0]?.properties?.id;
          if (id) onSelectRef.current(String(id));
        });
        m.on('mousemove', (e) => (m.getCanvas().style.cursor = pickAt(e.point).length ? 'pointer' : ''));
        m.once('style.load', () => {
          m.setLight({ anchor: 'viewport', position: [1.4, 210, 35], intensity: 0.45, color: '#FFF6EE' });
          for (const s of ['site', 'others', 'blocks', 'buildings', 'lines', 'labels']) m.addSource(s, { type: 'geojson', data: fc([]) });
          m.addLayer({ id: 'lines', type: 'line', source: 'lines', layout: { 'line-cap': 'round' }, paint: { 'line-color': BRAND, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 2.5], 'line-opacity': ['case', ['get', 'sel'], 0.9, 0.35], 'line-dasharray': [2, 2] } });
          // Other listings: small white blocks, so the plan stands out.
          m.addLayer({ id: 'others', type: 'fill-extrusion', source: 'others', paint: { 'fill-extrusion-color': '#FFFFFF', 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 10, 120, 14, 30, 17, 12], 'fill-extrusion-opacity': 0.85 } });
          // Flats of the plan, from afar: terracotta blocks that fade as their real building appears.
          m.addLayer({ id: 'flat-blocks', type: 'fill-extrusion', source: 'blocks', paint: { 'fill-extrusion-color': ['case', ['get', 'sel'], BRAND_LIGHT, BRAND], 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 10, 520, 13, 200, 14.5, 70, 15.5, ['case', ['get', 'found'], 0, 40]], 'fill-extrusion-opacity': 0.96, 'fill-extrusion-vertical-gradient': true } });
          // Flats of the plan, up close: the real building, in terracotta, a touch taller than its neighbours.
          m.addLayer({ id: 'flat-buildings', type: 'fill-extrusion', source: 'buildings', minzoom: 14, paint: { 'fill-extrusion-color': ['case', ['get', 'sel'], BRAND_LIGHT, BRAND], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.97], 'fill-extrusion-vertical-gradient': true } });
          // The work site: a dark tower.
          m.addLayer({ id: 'site', type: 'fill-extrusion', source: 'site', paint: { 'fill-extrusion-color': INK, 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 10, 650, 14, 220, 17, 90], 'fill-extrusion-opacity': 1 } });
          m.addLayer({
            id: 'labels',
            type: 'symbol',
            source: 'labels',
            layout: { 'text-field': ['get', 't'], 'text-font': ['Noto Sans Regular'], 'text-size': ['case', ['get', 'site'], 13, 12], 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-anchor': 'bottom', 'text-offset': [0, -0.6] },
            paint: { 'text-color': ['case', ['get', 'site'], INK, '#FFFFFF'], 'text-halo-color': ['case', ['get', 'site'], '#F7EEE7', BRAND], 'text-halo-width': ['case', ['get', 'site'], 1.6, 3] },
          });
          setReady(true);
        });
        // Whenever the view settles up close, find the real building under each flat of the plan in view.
        m.on('idle', () => {
          if (!m.getLayer('bld3d') || m.getZoom() < 14.5) return;
          let added = false;
          for (const p of pinsRef.current) {
            if (!p.chosen || footprints.current.has(p.id)) continue;
            const at = m.project([p.lng, p.lat]);
            const c = m.getCanvas();
            if (at.x < 0 || at.y < 0 || at.x > c.clientWidth || at.y > c.clientHeight) continue;
            const b = m.queryRenderedFeatures(at, { layers: ['bld3d'] })[0];
            if (b && (b.geometry.type === 'Polygon' || b.geometry.type === 'MultiPolygon')) {
              footprints.current.set(p.id, { type: 'Feature', properties: { id: p.id, h: Number(b.properties?.render_height ?? 18) + 2 }, geometry: b.geometry });
              added = true;
            }
          }
          if (added) window.dispatchEvent(new Event('settlein:footprints'));
        });
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      disposed = true;
      tour.current.stop = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the plan: blocks, real buildings found so far, lines to the site, numbers.
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener('settlein:footprints', bump);
    return () => window.removeEventListener('settlein:footprints', bump);
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const plan = pins.filter((p) => p.chosen);
    const sel = (id: string) => id === selectedId;
    (m.getSource('site') as GeoJSONSource).setData(fc([{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [square(site.lng, site.lat, 110)] } }]));
    (m.getSource('others') as GeoJSONSource).setData(fc(pins.filter((p) => !p.chosen).map((p) => ({ type: 'Feature', properties: { id: p.id }, geometry: { type: 'Polygon', coordinates: [square(p.lng, p.lat, 35)] } }))));
    (m.getSource('blocks') as GeoJSONSource).setData(fc(plan.map((p) => ({ type: 'Feature', properties: { id: p.id, sel: sel(p.id), found: footprints.current.has(p.id) }, geometry: { type: 'Polygon', coordinates: [square(p.lng, p.lat, 90)] } }))));
    (m.getSource('buildings') as GeoJSONSource).setData(fc(plan.filter((p) => footprints.current.has(p.id)).map((p) => ({ ...footprints.current.get(p.id)!, properties: { ...footprints.current.get(p.id)!.properties, sel: sel(p.id) } }))));
    (m.getSource('lines') as GeoJSONSource).setData(fc(plan.map((p) => ({ type: 'Feature', properties: { sel: sel(p.id) }, geometry: { type: 'LineString', coordinates: arc([p.lng, p.lat], [site.lng, site.lat]) } }))));
    (m.getSource('labels') as GeoJSONSource).setData(fc([pt(site.lng, site.lat, { t: 'Work site', site: true }), ...plan.map((p) => pt(p.lng, p.lat, { t: String(p.label ?? ''), site: false }))]));
  });

  // First view, and back to it when nothing is selected: the whole plan and the site.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || selectedId) return;
    const pts = pins.filter((p) => p.chosen).map((p) => [p.lng, p.lat] as [number, number]);
    pts.push([site.lng, site.lat]);
    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 70, pitch: 58, bearing: -20, duration: 900, maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, site, selectedId === null, ready]);

  // Selected flat: fly close, at an angle, so its building and its street read in 3D.
  useEffect(() => {
    const m = map.current;
    const p = pins.find((x) => x.id === selectedId);
    if (!m || !ready || !p) return;
    m.flyTo({ center: [p.lng, p.lat], zoom: 17, pitch: 64, bearing: m.getBearing() + 35, duration: 1500, essential: true });
  }, [selectedId, pins, ready]);

  async function runTour() {
    const m = map.current;
    if (!m) return;
    if (touring) {
      tour.current.stop = true;
      return;
    }
    tour.current = { stop: false };
    setTouring(true);
    const plan = pins.filter((p) => p.chosen).sort((a, b) => (a.label ?? 0) - (b.label ?? 0));
    for (const p of plan) {
      if (tour.current.stop) break;
      onSelectRef.current(p.id);
      await new Promise((r) => setTimeout(r, 3200));
    }
    setTouring(false);
    onSelectRef.current(null);
  }

  if (failed) return <div className="grid place-items-center rounded-2xl bg-white text-sm text-stone-500 ring-1 ring-stone-200" style={{ height }}>The 3D map could not load (no connection to the map tiles).</div>;
  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-stone-200" style={{ height }}>
      <div ref={box} className="h-full w-full" data-testid="map3d" aria-label="3D map of the flats in this plan and the project site" />
      <div className="pointer-events-none absolute top-2 right-2 flex flex-wrap justify-end gap-x-3 gap-y-1 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-stone-700 shadow">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-2 rounded-sm" style={{ background: INK }} /> Work site
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-2 rounded-sm" style={{ background: BRAND }} /> Flat in this plan
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2 rounded-sm bg-white ring-1 ring-stone-300" /> Other listing
        </span>
      </div>
      {ready && pins.some((p) => p.chosen) && (
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button type="button" onClick={runTour} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-stone-800" data-testid="map-tour">
            {touring ? 'Stop the tour' : '▶ Tour the plan in 3D'}
          </button>
          {selectedId && !touring && (
            <button type="button" onClick={() => onSelectRef.current(null)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-lg ring-1 ring-stone-300" data-testid="map-overview">
              Whole plan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

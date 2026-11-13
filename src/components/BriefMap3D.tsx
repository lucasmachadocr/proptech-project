// The brief map: Madrid as a whole in 3D, in the brand's minimal style. Each barrio is a block shaded by how
// many flats we found there, every available flat is a dark grey block, and the work site is a terracotta tower.
// MapLibre + OpenFreeMap (OpenStreetMap data). Loaded lazily by the brief page; falls back to the 2D map offline.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AVG_SPEED_KMH, ROAD_FACTOR, commuteMin } from '../ai/geo';
import { UNIT_TYPE_SHORT } from '../data/units';
import { barrioCounts, type BarrioFC } from '../lib/barrios';
import { eur } from '../lib/format';
import { brandStyle } from '../lib/mapStyle';
import type { Unit } from '../types';
import PhotoThumb from './PhotoThumb';
import { Explain } from './ui';

const CityMap = lazy(() => import('./CityMap'));

const BRAND = '#C4573D';
const INK = '#2A2320';
const FLAT = '#6F635B'; // the darker grey of an available flat
const ringKm = (min: number) => ((min / 60) * AVG_SPEED_KMH) / ROAD_FACTOR;

const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features });
/** A square footprint of `half` metres around a point, as a polygon ring. */
function square(lng: number, lat: number, half: number): number[][] {
  const dy = half / 111_320;
  const dx = half / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [[lng - dx, lat - dy], [lng + dx, lat - dy], [lng + dx, lat + dy], [lng - dx, lat + dy], [lng - dx, lat - dy]];
}
function circle(lng: number, lat: number, km: number, n = 72): number[][] {
  const c = Math.cos((lat * Math.PI) / 180);
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [lng + (km * 1000 * Math.cos(a)) / (111_320 * c), lat + (km * 1000 * Math.sin(a)) / 111_320];
  });
}
const bookable = (u: Unit) => u.status === 'verified' || u.status === 'public';

interface Props {
  city: string;
  site: { lat: number; lng: number; town: string };
  units: Unit[];
  /** Click on the map (not on a flat) to place the site. */
  onPick?: (lat: number, lng: number) => void;
  height?: number;
}

export default function BriefMap3D({ city, site, units, onPick, height = 460 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [barrios, setBarrios] = useState<BarrioFC | null>(null);
  const [selected, setSelected] = useState<Unit | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const live = units.some((u) => u.status === 'public');
  const cityUnits = useMemo(() => units.filter((u) => u.city === city && bookable(u)), [units, city]);
  const unitsRef = useRef(cityUnits);
  unitsRef.current = cityUnits;
  const counts = useMemo(() => (barrios ? barrioCounts(barrios, cityUnits) : new Map<string, number>()), [barrios, cityUnits]);
  const barriosWithFlats = [...counts.keys()].length;

  // Create the map once.
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const [ml, style, worker, data] = await Promise.all([import('maplibre-gl'), brandStyle(), import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'), import('../data/madridBarrios.json')]);
        ml.setWorkerUrl(worker.default);
        if (disposed || !box.current) return;
        setBarrios(data.default as BarrioFC);
        // Road names are noise at city scale: show them only when zoomed right in.
        const quiet = JSON.parse(JSON.stringify(style)) as typeof style;
        for (const l of quiet.layers) if (l.id.startsWith('highway-name')) l.minzoom = 15;
        const m = new ml.Map({ container: box.current, style: quiet, center: [site.lng, site.lat], zoom: 10.6, pitch: 55, bearing: -15, maxPitch: 70, attributionControl: { compact: true } });
        map.current = m;
        // a flat block is small at city scale, so a click within 7 px of one counts as a tap on it
        const flatsAt = (p: { x: number; y: number }) => (m.getLayer('flats') ? m.queryRenderedFeatures([[p.x - 7, p.y - 7], [p.x + 7, p.y + 7]], { layers: ['flats'] }) : []);
        m.on('click', (e) => {
          const hit = flatsAt(e.point)[0];
          if (hit) {
            const u = unitsRef.current.find((x) => x.id === hit.properties?.id);
            if (u) setSelected(u);
            return;
          }
          setSelected(null);
          onPickRef.current?.(+e.lngLat.lat.toFixed(5), +e.lngLat.lng.toFixed(5));
        });
        m.on('mousemove', (e) => {
          const over = flatsAt(e.point).length > 0;
          m.getCanvas().style.cursor = over ? 'pointer' : onPickRef.current ? 'crosshair' : '';
        });
        m.once('style.load', () => {
          m.addSource('barrios', { type: 'geojson', data: fc([]) });
          m.addSource('rings', { type: 'geojson', data: fc([]) });
          m.addSource('flats', { type: 'geojson', data: fc([]) });
          m.addSource('site', { type: 'geojson', data: fc([]) });
          m.addSource('labels', { type: 'geojson', data: fc([]) });
          const before = m.getLayer('bld3d') ? 'bld3d' : undefined;
          // Barrio blocks, shaded by the flats we found there.
          m.addLayer({ id: 'barrio-fill', type: 'fill', source: 'barrios', paint: { 'fill-color': BRAND, 'fill-opacity': ['step', ['get', 'n'], 0.04, 1, 0.13, 3, 0.24, 6, 0.36] } }, before);
          m.addLayer({ id: 'barrio-line', type: 'line', source: 'barrios', paint: { 'line-color': '#B9A99D', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 1.4], 'line-opacity': 0.9 } }, before);
          m.addLayer({ id: 'rings', type: 'line', source: 'rings', paint: { 'line-color': BRAND, 'line-width': 1.2, 'line-dasharray': [3, 3], 'line-opacity': ['get', 'o'] } }, before);
          // Available flats: dark grey blocks (approximate locations in live mode). The selected one turns terracotta.
          m.addLayer({ id: 'flats', type: 'fill-extrusion', source: 'flats', paint: { 'fill-extrusion-color': ['case', ['get', 'sel'], BRAND, FLAT], 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 10, 320, 12, 180, 14, 70, 17, 24], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.96 } });
          // The work site: a terracotta tower.
          m.addLayer({ id: 'site', type: 'fill-extrusion', source: 'site', paint: { 'fill-extrusion-color': BRAND, 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 10, 520, 14, 220, 17, 90], 'fill-extrusion-opacity': 1 } });
          m.addLayer({
            id: 'barrio-labels',
            type: 'symbol',
            source: 'labels',
            filter: ['!', ['get', 'site']],
            layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'center', 'text-optional': true, 'text-padding': 2, 'text-max-width': 7, 'text-line-height': 1.1 },
            paint: { 'text-color': '#5C514A', 'text-halo-color': '#F7EEE7', 'text-halo-width': 1.4 },
          });
          m.addLayer({
            id: 'site-label',
            type: 'symbol',
            source: 'labels',
            filter: ['get', 'site'],
            layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 13, 'text-anchor': 'bottom', 'text-offset': [0, -1.2], 'text-allow-overlap': true, 'text-ignore-placement': true },
            paint: { 'text-color': INK, 'text-halo-color': '#F7EEE7', 'text-halo-width': 1.6 },
          });
          setReady(true);
        });
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Barrio blocks and their labels.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !barrios) return;
    (m.getSource('barrios') as GeoJSONSource).setData(fc(barrios.features.map((f) => ({ ...f, properties: { name: f.properties.name, n: counts.get(f.properties.name) ?? 0 } }))));
  }, [barrios, counts, ready]);

  // Flats, site, rings and labels; fit the city once the flats are known.
  const fitted = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('flats') as GeoJSONSource).setData(fc(cityUnits.map((u) => ({ type: 'Feature', properties: { id: u.id, sel: u.id === selected?.id }, geometry: { type: 'Polygon', coordinates: [square(u.lng, u.lat, 65)] } }))));
    (m.getSource('site') as GeoJSONSource).setData(fc([{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [square(site.lng, site.lat, 95)] } }]));
    (m.getSource('rings') as GeoJSONSource).setData(fc([15, 30].map((min) => ({ type: 'Feature', properties: { o: min === 15 ? 0.6 : 0.35 }, geometry: { type: 'LineString', coordinates: circle(site.lng, site.lat, ringKm(min)) } }))));
    const labels: GeoJSON.Feature[] = [{ type: 'Feature', properties: { label: 'Work site', site: true }, geometry: { type: 'Point', coordinates: [site.lng, site.lat] } }];
    if (barrios)
      for (const f of barrios.features) {
        const n = counts.get(f.properties.name);
        if (!n) continue;
        // label at the centroid of the biggest ring
        const ring = f.geometry.coordinates.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
        const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
        const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        labels.push({ type: 'Feature', properties: { label: `${f.properties.name}\n${n} ${n === 1 ? 'flat' : 'flats'}`, site: false }, geometry: { type: 'Point', coordinates: [cx, cy] } });
      }
    (m.getSource('labels') as GeoJSONSource).setData(fc(labels));
    // First view: the barrios where we found flats, plus the work site (not every far-off listing).
    if (!fitted.current && barrios && cityUnits.length && counts.size) {
      fitted.current = true;
      const pts = barrios.features.filter((f) => counts.has(f.properties.name)).flatMap((f) => f.geometry.coordinates.flatMap((p) => p[0]));
      pts.push([site.lng, site.lat]);
      const lngs = pts.map((p) => p[0]);
      const lats = pts.map((p) => p[1]);
      // fitBounds is over-cautious on a pitched map, so centre on the box and pick the zoom from its width
      const span = Math.max(Math.max(...lngs) - Math.min(...lngs), (Math.max(...lats) - Math.min(...lats)) * 1.4);
      m.jumpTo({ center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2 - 0.01], zoom: Math.min(12.5, Math.max(10.5, Math.log2(360 / span) - 1.3)), pitch: 55, bearing: -15 });
    }
  }, [cityUnits, site, selected, counts, barrios, ready]);

  if (failed)
    return (
      <Suspense fallback={<div style={{ height }} />}>
        <CityMap city={city} height={height} site={site} units={units} onPick={onPick} />
      </Suspense>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white" data-testid="city-map">
      <div className="relative" style={{ height }}>
        <div ref={box} className="h-full w-full" data-testid="brief-map3d" aria-label="3D map of Madrid with the work site, the barrios and the available flats" />
        <div className="pointer-events-none absolute top-2 right-2 z-10 flex flex-wrap justify-end gap-x-3 gap-y-1 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-stone-700 shadow">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-2 rounded-sm" style={{ background: BRAND }} /> Work site
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2 rounded-sm" style={{ background: FLAT }} /> Available flat
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(196,87,61,.22)', boxShadow: 'inset 0 0 0 1px #B9A99D' }} /> Barrio · more flats, darker
          </span>
          <span>Rings: 15 · 30 min</span>
        </div>
      </div>
      {selected ? (
        <div className="flex items-center gap-4 border-t border-stone-100 p-4" data-testid="unit-card">
          {selected.photos.length > 0 && <PhotoThumb hash={selected.photos[0]} size={88} />}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink">
              {UNIT_TYPE_SHORT[selected.type]} · {selected.zone}
            </div>
            <div className="num mt-0.5 flex items-center gap-1.5 text-sm text-stone-600">
              {eur(selected.rent)}/mo · {Math.round(commuteMin(site, selected))} min to the site
              <Explain label="How is the commute estimated?">Straight-line distance × {ROAD_FACTOR} road factor at {AVG_SPEED_KMH} km/h. Phase 2 uses a routing API with traffic.</Explain>
            </div>
            <div className="mt-0.5 truncate text-xs text-stone-500">{selected.amenities.slice(0, 4).join(' · ')}</div>
            {selected.source && <div className="mt-0.5 text-xs text-stone-500">Listed on {selected.source} · public listing, availability not confirmed</div>}
          </div>
          <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100" aria-label="Close">
            ✕
          </button>
        </div>
      ) : (
        <div className="border-t border-stone-100 px-4 py-3 text-sm text-stone-600" data-testid="map-note">
          {live
            ? `${cityUnits.length} real flats listed publicly, in ${barriosWithFlats} barrios of Madrid (approximate locations). ${onPick ? 'Click the map to place your project site; tap' : 'Tap'} a block to see a flat. Drag to turn the city.`
            : `${cityUnits.length} verified apartments around ${site.town}. Tap a block to see one. Drag to turn the city.`}
        </div>
      )}
    </div>
  );
}

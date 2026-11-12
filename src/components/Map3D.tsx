// 3D map of the plan: the project site, every flat as a pin, and the building of the selected flat lit up in 3D.
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
}

interface Props {
  site: { lng: number; lat: number };
  pins: Pin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  height?: number;
}

const BRAND = '#C4573D';
const INK = '#2A2320';
const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features });
const pt = (lng: number, lat: number, props: Record<string, unknown>): GeoJSON.Feature => ({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [lng, lat] } });
function disc(lng: number, lat: number, r: number, n = 20): number[][] {
  const c = Math.cos((lat * Math.PI) / 180);
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [lng + (r * Math.cos(a)) / (111_320 * c), lat + (r * Math.sin(a)) / 111_320];
  });
}

export default function Map3D({ site, pins, selectedId, onSelect, height = 460 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const [ml, style, worker] = await Promise.all([import('maplibre-gl'), brandStyle(), import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')]);
        // Vite bundles MapLibre's worker into one file; tell MapLibre where it is.
        ml.setWorkerUrl(worker.default);
        const { Map } = ml;
        if (disposed || !box.current) return;
        const m = new Map({ container: box.current, style, center: [site.lng, site.lat], zoom: 11, pitch: 50, bearing: -15, attributionControl: { compact: true }, maxPitch: 70 });
        map.current = m;
        m.on('load', () => {
          m.addSource('site', { type: 'geojson', data: fc([]) });
          m.addSource('pins', { type: 'geojson', data: fc([]) });
          m.addSource('hl', { type: 'geojson', data: fc([]) });
          m.addLayer({ id: 'hl', type: 'fill-extrusion', source: 'hl', paint: { 'fill-extrusion-color': BRAND, 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-opacity': 0.95 } });
          m.addLayer({ id: 'site', type: 'fill-extrusion', source: 'site', paint: { 'fill-extrusion-color': INK, 'fill-extrusion-height': 140, 'fill-extrusion-opacity': 1 } });
          m.addLayer({
            id: 'pins',
            type: 'circle',
            source: 'pins',
            paint: {
              'circle-radius': ['case', ['get', 'sel'], 10, ['get', 'chosen'], 7, 4],
              'circle-color': ['case', ['get', 'chosen'], BRAND, '#FFFFFF'],
              'circle-stroke-color': ['case', ['get', 'sel'], INK, ['get', 'chosen'], '#FFFFFF', '#A8A29E'],
              'circle-stroke-width': ['case', ['get', 'sel'], 3, 1.5],
              'circle-pitch-alignment': 'map',
            },
          });
          m.on('click', 'pins', (e) => {
            const id = e.features?.[0]?.properties?.id;
            if (id) onSelectRef.current(String(id));
          });
          m.on('mouseenter', 'pins', () => (m.getCanvas().style.cursor = 'pointer'));
          m.on('mouseleave', 'pins', () => (m.getCanvas().style.cursor = ''));
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

  // Data: site and pins; fit the view to the chosen flats.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('site') as GeoJSONSource).setData(fc([{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [disc(site.lng, site.lat, 90)] } }]));
    (m.getSource('pins') as GeoJSONSource).setData(fc(pins.map((p) => pt(p.lng, p.lat, { id: p.id, chosen: p.chosen, sel: p.id === selectedId }))));
    if (!selectedId) {
      const pts = pins.filter((p) => p.chosen).map((p) => [p.lng, p.lat] as [number, number]);
      pts.push([site.lng, site.lat]);
      const lngs = pts.map((p) => p[0]);
      const lats = pts.map((p) => p[1]);
      m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, pitch: 50, bearing: -15, duration: 900, maxZoom: 14 });
      (m.getSource('hl') as GeoJSONSource).setData(fc([]));
    }
  }, [pins, site, selectedId, ready]);

  // Selected flat: fly to it and light up its building in 3D.
  useEffect(() => {
    const m = map.current;
    const p = pins.find((x) => x.id === selectedId);
    if (!m || !ready || !p) return;
    (m.getSource('hl') as GeoJSONSource).setData(fc([]));
    m.flyTo({ center: [p.lng, p.lat], zoom: 17.2, pitch: 62, bearing: 30, duration: 1400 });
    // After the flight, wait for the tiles, then find the building under the flat and light it up.
    m.once('moveend', () => m.once('idle', () => {
      const hits = m.queryRenderedFeatures(m.project([p.lng, p.lat]), { layers: ['bld3d'] });
      const b = hits[0];
      const feature: GeoJSON.Feature =
        b && (b.geometry.type === 'Polygon' || b.geometry.type === 'MultiPolygon')
          ? { type: 'Feature', properties: { h: Number(b.properties?.render_height ?? 18) + 1, b: 0 }, geometry: b.geometry }
          : { type: 'Feature', properties: { h: 24, b: 0 }, geometry: { type: 'Polygon', coordinates: [disc(p.lng, p.lat, 14)] } };
      (m.getSource('hl') as GeoJSONSource).setData(fc([feature]));
      m.triggerRepaint();
    }));
  }, [selectedId, pins, ready]);

  if (failed) return <div className="grid place-items-center rounded-2xl bg-white text-sm text-stone-500 ring-1 ring-stone-200" style={{ height }}>The 3D map could not load (no connection to the map tiles).</div>;
  return <div ref={box} className="overflow-hidden rounded-2xl ring-1 ring-stone-200" style={{ height }} data-testid="map3d" aria-label="3D map of the flats and the project site" />;
}

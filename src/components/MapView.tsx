import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { Site, Unit } from '../types';
import { eur } from '../lib/format';

export interface MapUnit {
  unit: Unit;
  state: 'assigned' | 'free' | 'moved' | 'new' | 'flagged';
  label?: string;
}

const STYLE: Record<MapUnit['state'], { color: string; fill: string; r: number; opacity: number }> = {
  assigned: { color: '#a8432e', fill: '#d4633f', r: 7, opacity: 0.9 },
  new: { color: '#a8432e', fill: '#f4c5b1', r: 8, opacity: 0.95 },
  moved: { color: '#1d4ed8', fill: '#60a5fa', r: 8, opacity: 0.95 },
  free: { color: '#a8a29e', fill: '#e7e5e4', r: 5, opacity: 0.8 },
  flagged: { color: '#b91c1c', fill: '#f87171', r: 8, opacity: 0.95 },
};

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
  }, [map, bounds]);
  return null;
}

export default function MapView({ site, units, lines = true, height = 440, focusAssigned = true }: { site: Site; units: MapUnit[]; lines?: boolean; height?: number; focusAssigned?: boolean }) {
  const bounds = useMemo<LatLngBoundsExpression>(() => {
    const pts = (focusAssigned ? units.filter((u) => u.state !== 'free') : units).map((u) => [u.unit.lat, u.unit.lng] as [number, number]);
    return [[site.lat, site.lng], ...pts] as LatLngBoundsExpression;
  }, [site, units, focusAssigned]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-200" style={{ height }} data-testid="plan-map">
      <MapContainer center={[site.lat, site.lng]} zoom={11} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />
        {lines &&
          units
            .filter((u) => u.state !== 'free' && u.state !== 'flagged')
            .map((u) => (
              <Polyline key={`l-${u.unit.id}`} positions={[[site.lat, site.lng], [u.unit.lat, u.unit.lng]]} pathOptions={{ color: u.state === 'moved' ? '#1d4ed8' : '#a8432e', weight: 1.5, opacity: 0.55, dashArray: '4 4' }} />
            ))}
        {units.map((u) => {
          const s = STYLE[u.state];
          return (
            <CircleMarker key={u.unit.id} center={[u.unit.lat, u.unit.lng]} radius={s.r} pathOptions={{ color: s.color, fillColor: s.fill, fillOpacity: s.opacity, weight: 2 }}>
              <Tooltip>
                <div className="text-xs">
                  <div className="font-semibold">{u.label ?? u.unit.title}</div>
                  <div>
                    {u.unit.id} · {u.unit.title} · {eur(u.unit.rent)}/mo
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
        <CircleMarker center={[site.lat, site.lng]} radius={11} pathOptions={{ color: '#1c1917', fillColor: '#1c1917', fillOpacity: 1, weight: 3 }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <span className="text-xs font-semibold">{site.operator}</span>
          </Tooltip>
        </CircleMarker>
      </MapContainer>
      <div className="pointer-events-none absolute top-2 right-2 z-[400] flex max-w-[70%] flex-wrap justify-end gap-x-3 gap-y-1 rounded-lg bg-white/95 px-3 py-1.5 text-[11px] text-stone-700 shadow">
        <Legend color="#1c1917" label="Project site" />
        <Legend color="#d4633f" label="Assigned" />
        {units.some((u) => u.state === 'moved') && <Legend color="#60a5fa" label="Moved" />}
        {units.some((u) => u.state === 'new') && <Legend color="#f4c5b1" label="New" />}
        <Legend color="#e7e5e4" label="Available" ring />
      </div>
    </div>
  );
}

function Legend({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: ring ? 'inset 0 0 0 1.5px #a8a29e' : undefined }} />
      {label}
    </span>
  );
}

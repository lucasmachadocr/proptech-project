import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { AVG_SPEED_KMH, ROAD_FACTOR, commuteMin } from '../ai/geo';
import { FACTS } from '../data/facts';
import { siteForCity, ZONES } from '../data/sites';
import { UNIT_TYPE_SHORT } from '../data/units';
import { eur } from '../lib/format';
import { useStore } from '../store';
import type { Unit } from '../types';
import PhotoThumb from './PhotoThumb';
import { Explain, cx } from './ui';

const ringKm = (min: number) => ((min / 60) * AVG_SPEED_KMH) / ROAD_FACTOR;
const BRAND = '#c4573d';
const INK = '#2a2320';

/** City chips with the roll-out stage: Madrid (launch city), then two cities a year. */
export function CityChips({ city, onChange }: { city: string; onChange: (c: string) => void }) {
  return (
    <div role="radiogroup" aria-label="City" className="flex flex-wrap gap-2">
      {FACTS.cities.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={city === c}
          onClick={() => onChange(c)}
          className={cx('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', city === c ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-stone-300 hover:ring-ink')}
        >
          {c}
          <span className={cx('ml-2 text-xs font-normal', city === c ? 'text-white/70' : 'text-stone-500')}>{FACTS.rollout[c]}</span>
        </button>
      ))}
    </div>
  );
}

function FitTo({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13, animate: false });
  }, [map, bounds]);
  return null;
}

interface Props {
  city: string;
  /** Units chosen in the plan (highlighted, with commute lines). Empty = explore mode. */
  chosen?: Map<string, string>; // unitId → occupant name
  height?: number;
  showZones?: boolean;
}

export default function CityMap({ city, chosen, height = 420, showZones = true }: Props) {
  const units = useStore((s) => s.units);
  const site = siteForCity(city);
  const [selected, setSelected] = useState<Unit | null>(null);
  useEffect(() => {
    setSelected(null);
  }, [city]);

  const cityUnits = useMemo(() => units.filter((u) => u.city === city && u.status === 'verified'), [units, city]);
  const hasPlan = !!chosen && chosen.size > 0;
  const bounds = useMemo<LatLngBoundsExpression>(() => {
    const pts = (hasPlan ? cityUnits.filter((u) => chosen!.has(u.id)) : cityUnits).map((u) => [u.lat, u.lng] as [number, number]);
    return [[site.lat, site.lng], ...pts] as LatLngBoundsExpression;
  }, [cityUnits, chosen, hasPlan, site]);

  const zones = Object.entries(ZONES).filter(([, z]) => z.city === city);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white" data-testid="city-map">
      <div className="relative" style={{ height }}>
        <MapContainer key={city} center={[site.lat, site.lng]} zoom={12} scrollWheelZoom={false} zoomAnimation={false} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitTo bounds={bounds} />
          {/* 15 and 30-minute commute rings (estimate) */}
          <Circle center={[site.lat, site.lng]} radius={ringKm(30) * 1000} pathOptions={{ color: BRAND, weight: 1, opacity: 0.35, fillOpacity: 0.04, dashArray: '4 6' }} />
          <Circle center={[site.lat, site.lng]} radius={ringKm(15) * 1000} pathOptions={{ color: BRAND, weight: 1, opacity: 0.5, fillOpacity: 0.06 }} />
          {showZones &&
            zones.map(([name, z]) => (
              <CircleMarker key={name} center={[z.lat, z.lng]} radius={0} pathOptions={{ opacity: 0 }}>
                <Tooltip permanent direction="center" className="zone-label">
                  {name}
                </Tooltip>
              </CircleMarker>
            ))}
          {hasPlan &&
            cityUnits
              .filter((u) => chosen!.has(u.id))
              .map((u) => <Polyline key={`l-${u.id}`} positions={[[site.lat, site.lng], [u.lat, u.lng]]} pathOptions={{ color: BRAND, weight: 1.2, opacity: 0.45 }} />)}
          {cityUnits.map((u) => {
            const isChosen = chosen?.has(u.id);
            return (
              <CircleMarker
                key={u.id}
                center={[u.lat, u.lng]}
                radius={isChosen ? 7 : 5}
                eventHandlers={{ click: () => setSelected(u) }}
                pathOptions={{ color: isChosen ? BRAND : '#a8a29e', fillColor: isChosen ? BRAND : '#ffffff', fillOpacity: 1, weight: 2 }}
              >
                <Tooltip>{isChosen ? chosen!.get(u.id) : `${UNIT_TYPE_SHORT[u.type]} · ${eur(u.rent)}/mo`}</Tooltip>
              </CircleMarker>
            );
          })}
          <CircleMarker center={[site.lat, site.lng]} radius={10} pathOptions={{ color: INK, fillColor: INK, fillOpacity: 1, weight: 3 }}>
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <span className="text-xs font-semibold">Work site</span>
            </Tooltip>
          </CircleMarker>
        </MapContainer>
        <div className="pointer-events-none absolute top-2 right-2 z-[400] flex flex-wrap justify-end gap-x-3 gap-y-1 rounded-lg bg-white/95 px-3 py-1.5 text-xs text-stone-700 shadow">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: INK }} /> Work site
          </span>
          {hasPlan && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: BRAND }} /> In the plan
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-white ring-2 ring-stone-400" /> Available
          </span>
          <span>Rings: 15 · 30 min</span>
        </div>
      </div>
      {selected ? (
        <div className="flex items-center gap-4 border-t border-stone-100 p-4" data-testid="unit-card">
          <PhotoThumb hash={selected.photos[0]} size={88} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink">
              {UNIT_TYPE_SHORT[selected.type]} · {selected.zone}
            </div>
            <div className="num mt-0.5 flex items-center gap-1.5 text-sm text-stone-600">
              {eur(selected.rent)}/mo · {Math.round(commuteMin(site, selected))} min to the site
              <Explain label="How is the commute estimated?">Straight-line distance × {ROAD_FACTOR} road factor at {AVG_SPEED_KMH} km/h. Phase 2 uses a routing API with traffic.</Explain>
            </div>
            <div className="mt-0.5 truncate text-xs text-stone-500">{selected.amenities.slice(0, 4).join(' · ')}</div>
          </div>
          <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100" aria-label="Close">
            ✕
          </button>
        </div>
      ) : (
        <div className="border-t border-stone-100 px-4 py-3 text-sm text-stone-600">
          {cityUnits.length} verified apartments around {site.town}. Tap a dot to see one.
        </div>
      )}
    </div>
  );
}

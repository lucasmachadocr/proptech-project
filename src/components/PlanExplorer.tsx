// Live mode: the flats of a plan as plain descriptions, each one matched to its building on a 3D map.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { UNIT_TYPE_SHORT } from '../data/units';
import { eur } from '../lib/format';
import type { Assignment, Brief, Unit } from '../types';
import { cx } from './ui';

const Map3D = lazy(() => import('./Map3D'));

interface Props {
  brief: Brief;
  site: { lng: number; lat: number; name: string };
  assignments: Assignment[];
  units: Unit[];
  height?: number;
}

const where = (u: Unit) => (u.source === 'Booking.com' ? 'exact address' : u.source === 'Airbnb' ? 'location ±150 m' : 'neighbourhood');

export default function PlanExplorer({ brief, site, assignments, units, height = 520 }: Props) {
  const [sel, setSel] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const chosen = useMemo(() => new Set(assignments.map((a) => a.unitId)), [assignments]);
  const pins = useMemo(() => units.map((u) => ({ id: u.id, lng: u.lng, lat: u.lat, chosen: chosen.has(u.id) })), [units, chosen]);
  useEffect(() => setSel(null), [assignments]);
  useEffect(() => {
    if (sel) list.current?.querySelector(`[data-unit="${sel}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sel]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]" data-testid="plan-explorer">
      <ol ref={list} className="space-y-2 overflow-y-auto pr-1 lg:max-h-[520px]" style={{ maxHeight: height }} aria-label="Flats in this plan">
        {assignments.map((a, i) => {
          const u = units.find((x) => x.id === a.unitId)!;
          const who = brief.employees.find((e) => e.id === a.employeeId);
          return (
            <li key={a.unitId} data-unit={u.id}>
              <button
                type="button"
                onClick={() => setSel(u.id === sel ? null : u.id)}
                aria-pressed={u.id === sel}
                className={cx('w-full rounded-xl border bg-white p-3 text-left transition-colors', u.id === sel ? 'border-brand-600 ring-2 ring-brand-200' : 'border-stone-200 hover:border-stone-400')}
                data-testid="listing-card"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">
                    <span className="num mr-1.5 text-brand-700">{i + 1}</span>
                    {u.title}
                  </span>
                  <span className="num shrink-0 text-sm font-semibold text-ink">{eur(u.rent)}/mo</span>
                </div>
                <div className="mt-0.5 text-xs text-stone-600">
                  {who?.name ?? '—'} · {Math.round(a.commuteMin)} min to the site · {UNIT_TYPE_SHORT[u.type]}
                </div>
                <div className="mt-0.5 text-xs text-stone-500">
                  Listed on {u.source} · {where(u)} · {u.amenities.slice(0, 2).join(' · ')}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="space-y-2">
        <Suspense fallback={<div className="grid place-items-center rounded-2xl bg-white text-sm text-stone-500 ring-1 ring-stone-200" style={{ height }}>Loading the 3D map…</div>}>
          <Map3D site={site} pins={pins} selectedId={sel} onSelect={setSel} height={height} />
        </Suspense>
        <p className="text-xs text-stone-500">
          Tap a flat to fly to its building. Dark tower: {site.name}. Terracotta: flats in this plan; white: other listings. Real public listings, availability not confirmed. Map © OpenStreetMap contributors, OpenFreeMap.
        </p>
      </div>
    </div>
  );
}

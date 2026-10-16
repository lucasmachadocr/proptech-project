import { useState } from 'react';
import { areaMedian } from '../../ai/verify';
import { AiBadge, Badge, Button, Card, LinkButton, PageHeader, cx, inputCls, labelCls } from '../../components/ui';
import { ZONE_CENTROIDS } from '../../data/sites';
import { eur } from '../../lib/format';
import { useStore } from '../../store';
import type { Unit, UnitType } from '../../types';

const STEPS = ['Company', 'Documents', 'First unit', 'Payouts', 'Submitted'];
const DOCS = ['Company deed (escritura) and CIF', 'Title deed or management mandate for each unit', 'Energy performance certificate', 'Civil liability insurance', 'Tourist/rental registration number (if any)'];

export default function OnboardingPage() {
  const units = useStore((s) => s.units);
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState({ name: 'Moncayo Living S.L.', cif: 'B50000000', contact: 'ops@moncayoliving.example', units: '8' });
  const [docs, setDocs] = useState<boolean[]>(DOCS.map((_, i) => i < 2));
  const [unit, setUnit] = useState<{ type: UnitType; zone: string; rent: number; sqm: number }>({ type: '1bed', zone: 'Actur', rent: 1750, sqm: 48 });

  const probe = { ...units[0], id: 'NEW', type: unit.type, zone: unit.zone, town: unit.zone, rent: unit.rent, ...ZONE_CENTROIDS[unit.zone] } as Unit;
  const med = areaMedian(probe, units);
  const dev = (unit.rent - med) / med;

  return (
    <>
      <PageHeader
        eyebrow="Provider portal · onboarding"
        title="List your units in four steps"
        subtitle="Professional operators and multi-unit owners only. AI agents pre-fill your profile from public sources; you confirm, upload documents and add your first unit."
      />
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s}>
            <span
              aria-current={i === step ? 'step' : undefined}
              className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm', i === step ? 'bg-teal-700 text-white' : i < step ? 'bg-teal-50 text-teal-800' : 'bg-stone-100 text-stone-500')}
            >
              <span className="num font-semibold">{i < step ? '✓' : i + 1}</span> {s}
            </span>
          </li>
        ))}
      </ol>

      <Card className="max-w-3xl">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm text-stone-600 sm:col-span-2">
              <AiBadge label="AI pre-filled" /> We found this company in the mercantile registry. Please confirm.
            </p>
            <label className={labelCls}>
              Legal name
              <input className={inputCls} value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
            </label>
            <label className={labelCls}>
              CIF
              <input className={inputCls} value={company.cif} onChange={(e) => setCompany({ ...company, cif: e.target.value })} />
            </label>
            <label className={labelCls}>
              Operations contact
              <input className={inputCls} value={company.contact} onChange={(e) => setCompany({ ...company, contact: e.target.value })} />
            </label>
            <label className={labelCls}>
              Furnished units you manage
              <input className={inputCls} value={company.units} onChange={(e) => setCompany({ ...company, units: e.target.value })} />
            </label>
          </div>
        )}
        {step === 1 && (
          <ul className="space-y-2">
            {DOCS.map((d, i) => (
              <li key={d} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2.5 text-sm">
                <span>{d}</span>
                {docs[i] ? (
                  <Badge tone="green">Uploaded · checked</Badge>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setDocs(docs.map((x, j) => (j === i ? true : x)))}>
                    Upload (mock)
                  </Button>
                )}
              </li>
            ))}
            <li className="pt-2 text-xs text-stone-500">Identity documents are deleted after checks (GDPR). Document AI compares names and CIF across all files.</li>
          </ul>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Type
              <select className={inputCls} value={unit.type} onChange={(e) => setUnit({ ...unit, type: e.target.value as UnitType })}>
                <option value="studio">Studio</option>
                <option value="1bed">1-bed</option>
                <option value="2bed">2-bed</option>
                <option value="3bed">3-bed (family)</option>
              </select>
            </label>
            <label className={labelCls}>
              Area
              <select className={inputCls} value={unit.zone} onChange={(e) => setUnit({ ...unit, zone: e.target.value })}>
                {Object.keys(ZONE_CENTROIDS).map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Monthly rent, furnished, bills included (€)
              <input type="number" className={inputCls} value={unit.rent} onChange={(e) => setUnit({ ...unit, rent: Number(e.target.value) })} />
            </label>
            <label className={labelCls}>
              Size (m²)
              <input type="number" className={inputCls} value={unit.sqm} onChange={(e) => setUnit({ ...unit, sqm: Number(e.target.value) })} />
            </label>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm sm:col-span-2">
              <div className="flex items-center gap-2 font-medium text-stone-900">
                Price check <AiBadge />
              </div>
              <p className="mt-1 text-stone-600">
                Area median for this type: <strong className="num">{eur(med)}</strong>. Your price is{' '}
                <strong className={cx('num', dev < -0.3 ? 'text-red-700' : '')}>
                  {dev >= 0 ? '+' : '−'}
                  {Math.abs(Math.round(dev * 100))}%
                </strong>
                . {dev < -0.3 ? 'More than 30% below the median is flagged for manual review.' : 'Within the normal range.'}
              </p>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm sm:col-span-2">
              <p className="text-stone-600">Payouts are made by our licensed payment provider on the 5th of each month: rent minus a 10% commission. No fees to list.</p>
            </div>
            <div className={labelCls}>
              Bank account
              <div className={`${inputCls} font-mono text-stone-500`}>ES•• •••• •••• •••• •••• 4821 (demo)</div>
            </div>
            <div className={labelCls}>
              KYC at payment provider
              <div className="mt-2">
                <Badge tone="green">Verified (mock)</Badge>
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="text-sm">
            <p className="text-base font-semibold text-stone-900">Submitted for verification</p>
            <p className="mt-2 text-stone-600">
              {company.name} and its first unit are in the verification queue. Target: decision within 3 days, including a video visit and an inspection of the first unit.
            </p>
            <div className="mt-4 flex gap-2">
              <LinkButton to="/ops/verification">See the verification queue</LinkButton>
              <Button variant="secondary" onClick={() => setStep(0)}>
                Start again
              </Button>
            </div>
          </div>
        )}
        {step < 4 && (
          <div className="mt-6 flex justify-between border-t border-stone-100 pt-4">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(step + 1)}>{step === 3 ? 'Submit for verification' : 'Continue'}</Button>
          </div>
        )}
      </Card>
    </>
  );
}

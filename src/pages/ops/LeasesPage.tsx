import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { checkLease } from '../../ai/compliance';
import { generateLease, mockSign } from '../../ai/lease';
import { AiBadge, Badge, Button, Card, Empty, Light, PageHeader, cx, tableCls, tableWrap, td, th } from '../../components/ui';
import { companyById } from '../../data/companies';
import { providerById } from '../../data/providers';
import { formatDate } from '../../lib/dates';
import { draftForAssignment } from '../../lib/leaseDrafts';
import { eur } from '../../lib/format';
import { ensureDemoPlan, useStore } from '../../store';

export default function LeasesPage() {
  const [params] = useSearchParams();
  const { brief, plan, units, signed, signLease } = useStore();
  const [selected, setSelected] = useState<string | null>(params.get('unit'));

  const rows = useMemo(
    () =>
      (plan?.assignments ?? []).map((a) => {
        const draft = draftForAssignment(brief, a);
        return { a, draft, check: checkLease(draft), unit: units.find((u) => u.id === a.unitId)! };
      }),
    [plan, brief, units],
  );

  if (!plan) {
    return (
      <Empty title="No plan yet">
        <Button onClick={() => ensureDemoPlan()}>Generate demo plan</Button>
      </Empty>
    );
  }

  const company = companyById(brief.companyId);
  const current = rows.find((r) => r.unit.id === (selected ?? rows[0]?.unit.id)) ?? rows[0];
  const doc = current && generateLease(current.draft, current.unit, company, providerById(current.unit.providerId));
  const sig = current && signed.find((s) => s.unitId === current.unit.id);

  const sign = (r: (typeof rows)[number]) => {
    const d = generateLease(r.draft, r.unit, company, providerById(r.unit.providerId));
    const s = mockSign(d);
    signLease({ unitId: r.unit.id, employeeId: r.a.employeeId, hash: s.hash, signedAt: s.signedAt });
  };

  return (
    <>
      <PageHeader
        eyebrow="Operations · lease generator"
        title={`${rows.length} seasonal leases, one per unit`}
        subtitle={`Tenant: ${company.legalName}. Each lease names its occupants and carries the work-displacement cause from the brief. E-signature is mocked in this demo.`}
        actions={
          <Button
            variant="secondary"
            onClick={() => rows.filter((r) => r.check.canSign && !signed.some((s) => s.unitId === r.unit.id)).forEach(sign)}
          >
            Sign all compliant ({rows.filter((r) => r.check.canSign).length})
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className={tableWrap}>
          <table className={tableCls}>
            <thead className="bg-stone-50">
              <tr>
                <th className={th}>Unit</th>
                <th className={th}>Occupant</th>
                <th className={th}>Check</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => {
                const s = signed.find((x) => x.unitId === r.unit.id);
                return (
                  <tr key={r.unit.id} className={cx('cursor-pointer hover:bg-stone-50', current?.unit.id === r.unit.id && 'bg-brand-50/60')} onClick={() => setSelected(r.unit.id)}>
                    <td className={td}>
                      <button type="button" className="text-left font-medium text-stone-900 hover:underline">
                        {r.unit.id}
                      </button>
                      <div className="text-xs text-stone-500">{r.unit.title}</div>
                    </td>
                    <td className={td}>{r.draft.occupants.join(', ')}</td>
                    <td className={td}>
                      <Light light={r.check.overall} />
                    </td>
                    <td className={td}>{s ? <Badge tone="green">Signed · {s.hash}</Badge> : <Badge>Draft</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {current && doc && (
          <Card
            title={
              <span className="flex items-center gap-2">
                {doc.title} <AiBadge label="Generated" />
              </span>
            }
            actions={<Light light={current.check.overall} />}
          >
            <article className="max-h-[560px] space-y-4 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/50 p-5 font-serif text-[13.5px] leading-relaxed text-stone-800">
              {doc.sections.map((s) => (
                <section key={s.heading}>
                  <h3 className="font-sans text-xs font-semibold tracking-wide text-stone-500 uppercase">{s.heading}</h3>
                  <p className="mt-1 whitespace-pre-line">{s.body}</p>
                </section>
              ))}
            </article>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {sig ? (
                <div className="text-sm text-emerald-800" data-testid="signed">
                  ✓ Signed {new Date(sig.signedAt).toLocaleString('en-GB')} · document hash <span className="font-mono">{sig.hash}</span>
                </div>
              ) : (
                <>
                  <Button disabled={!current.check.canSign} onClick={() => sign(current)}>
                    Send for e-signature (mock)
                  </Button>
                  <span className="text-xs text-stone-500">
                    {formatDate(current.draft.start)} → {formatDate(current.draft.end)} · {eur(current.unit.rent)}/mo
                  </span>
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

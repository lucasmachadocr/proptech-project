import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyUnit, type VerificationResult } from '../../ai/verify';
import PhotoThumb from '../../components/PhotoThumb';
import { AiBadge, Badge, Button, Card, Kpi, PageHeader, cx, tableCls, tableWrap, td, th } from '../../components/ui';
import { PROVIDERS } from '../../data/providers';
import { UNITS } from '../../data/units';
import { eur } from '../../lib/format';
import { useStore } from '../../store';

const DECISION = {
  approve: { tone: 'green', label: 'Approve' },
  review: { tone: 'amber', label: 'Manual review' },
  reject: { tone: 'red', label: 'Reject' },
} as const;

export default function VerificationPage() {
  const [params] = useSearchParams();
  const focus = params.get('focus');
  const { units, setUnitStatus } = useStore();
  const [results, setResults] = useState<Record<string, VerificationResult>>({});
  const [selected, setSelected] = useState<string | null>(focus);
  const [decided, setDecided] = useState<Record<string, 'verified' | 'rejected'>>({});
  const detailRef = useRef<HTMLDivElement>(null);

  // Queue = everything submitted that is not yet verified (plus items decided in this session).
  const queue = useMemo(() => UNITS.filter((u) => u.status !== 'verified').map((u) => units.find((x) => x.id === u.id) ?? u), [units]);

  const runAll = () => {
    const r: Record<string, VerificationResult> = {};
    for (const u of queue) r[u.id] = verifyUnit(u, units);
    setResults(r);
  };

  useEffect(() => {
    if (focus) {
      runAll();
      setSelected(focus);
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const sel = queue.find((u) => u.id === selected);
  const selRes = sel ? results[sel.id] : undefined;
  const dupSource = sel && selRes && !selRes.checks.find((c) => c.id === 'photos')!.pass ? units.find((u) => u.id !== sel.id && u.photos.some((p) => sel.photos.includes(p))) : undefined;
  const verifiedCount = units.filter((u) => u.status === 'verified').length;

  const decide = (unitId: string, status: 'verified' | 'rejected') => {
    setUnitStatus(unitId, status);
    setDecided((d) => ({ ...d, [unitId]: status }));
  };

  return (
    <>
      <PageHeader
        eyebrow="Operations · verification"
        title="Verification queue"
        subtitle="Every new listing goes through four automated checks before a human video visit. The checks produce a trust score; the ops manager approves or rejects."
        actions={
          <Button onClick={runAll} data-testid="run-checks">
            Run AI checks on queue <AiBadge />
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="In queue" value={queue.length - Object.keys(decided).length} hint="listings awaiting a decision" />
        <Kpi label="Verified supply" value={verifiedCount} hint={`units from ${PROVIDERS.filter((p) => p.status === 'verified').length} verified providers`} />
        <Kpi label="Automated checks" value="< 1 s" hint="per listing; video visit next" ai />
        <Kpi label="Target" value="< 3 days" hint="from submission to decision (year 1)" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className={tableWrap}>
          <table className={tableCls}>
            <thead className="bg-stone-50">
              <tr>
                <th className={th}>Listing</th>
                <th className={th}>Provider</th>
                <th className={`${th} text-right`}>Rent</th>
                <th className={`${th} text-right`}>Trust</th>
                <th className={th}>Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {queue.map((u) => {
                const r = results[u.id];
                const d = decided[u.id];
                return (
                  <tr
                    key={u.id}
                    data-testid={`queue-${u.id}`}
                    className={cx('cursor-pointer hover:bg-stone-50', selected === u.id && 'bg-brand-50/60', r?.decision === 'reject' && 'bg-red-50/50')}
                    onClick={() => setSelected(u.id)}
                  >
                    <td className={td}>
                      <button type="button" className="text-left font-medium text-stone-900 hover:underline" onClick={() => setSelected(u.id)}>
                        {u.id} · {u.type === 'studio' ? 'Studio' : u.type.replace('bed', '-bed')} {u.zone}
                      </button>
                      <div className="text-xs text-stone-500">{u.address}</div>
                    </td>
                    <td className={`${td} text-stone-600`}>{PROVIDERS.find((p) => p.id === u.providerId)?.name}</td>
                    <td className={`${td} num text-right`}>{eur(u.rent)}</td>
                    <td className={`${td} num text-right font-semibold`}>{r ? r.trustScore : '—'}</td>
                    <td className={td}>
                      {d ? (
                        <Badge tone={d === 'verified' ? 'green' : 'red'}>{d === 'verified' ? 'Approved' : 'Rejected'}</Badge>
                      ) : r ? (
                        <Badge tone={DECISION[r.decision].tone}>{DECISION[r.decision].label}</Badge>
                      ) : (
                        <Badge>Pending</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div ref={detailRef} className="scroll-mt-28">
          {!sel ? (
            <Card title="Listing detail">
              <p className="text-sm text-stone-600">Select a listing to see its checks.</p>
            </Card>
          ) : (
            <Card
              title={
                <span className="flex items-center gap-2">
                  {sel.id} · {sel.title} {selRes && <AiBadge />}
                </span>
              }
              id="verification-detail"
            >
              <div className="text-sm text-stone-600">
                {PROVIDERS.find((p) => p.id === sel.providerId)?.legalName} · {sel.address} · {eur(sel.rent)}/mo
              </div>
              <div className="mt-4">
                <div className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Listing photos</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sel.photos.map((p) => (
                    <PhotoThumb key={p} hash={p} highlight={!!dupSource} />
                  ))}
                </div>
                {dupSource && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold tracking-wide text-red-700 uppercase">
                      Same photos found on {dupSource.id} ({PROVIDERS.find((p) => p.id === dupSource.providerId)?.name})
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {dupSource.photos.map((p) => (
                        <PhotoThumb key={p} hash={p} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!selRes ? (
                <div className="mt-5">
                  <Button onClick={() => setResults((r) => ({ ...r, [sel.id]: verifyUnit(sel, units) }))}>
                    Run checks <AiBadge />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mt-5 flex items-center gap-4" data-testid="trust-score">
                    <ScoreRing score={selRes.trustScore} />
                    <div>
                      <div className="text-sm text-stone-500">Trust score</div>
                      <div className="mt-1">
                        <Badge tone={DECISION[selRes.decision].tone}>Recommendation: {DECISION[selRes.decision].label}</Badge>
                      </div>
                      {selRes.flags.length > 0 && <div className="mt-1 text-xs text-red-700">{selRes.flags.length} red flags</div>}
                    </div>
                  </div>
                  <ul className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200">
                    {selRes.checks.map((c) => (
                      <li key={c.id} className="flex gap-3 px-3 py-2.5 text-sm">
                        <span aria-hidden className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white', c.pass ? 'bg-emerald-600' : 'bg-red-600')}>
                          {c.pass ? '✓' : '!'}
                        </span>
                        <span className="flex-1">
                          <span className="font-medium text-stone-900">{c.label}</span> <span className="text-xs text-stone-400">({c.weight} pts)</span>
                          <span className="block text-stone-600">{c.detail}</span>
                        </span>
                        <span className="sr-only">{c.pass ? 'passed' : 'failed'}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="danger" onClick={() => decide(sel.id, 'rejected')} disabled={!!decided[sel.id]}>
                      Reject listing
                    </Button>
                    <Button variant="secondary" onClick={() => decide(sel.id, 'verified')} disabled={!!decided[sel.id] || selRes.decision === 'reject'}>
                      Approve after video visit
                    </Button>
                    {decided[sel.id] && <Badge tone={decided[sel.id] === 'verified' ? 'green' : 'red'}>Decision recorded</Badge>}
                  </div>
                  <p className="mt-3 text-xs text-stone-500">Human in the loop: the engine recommends, the ops manager decides. Rejected providers are blocked from re-listing the same photos.</p>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function ScoreRing({ score }: { score: number }) {
  const c = 2 * Math.PI * 26;
  const color = score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" role="img" aria-label={`Trust score ${score} of 100`}>
      <circle cx="32" cy="32" r="26" fill="none" stroke="#e7e5e4" strokeWidth="7" />
      <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1c1917">
        {score}
      </text>
    </svg>
  );
}

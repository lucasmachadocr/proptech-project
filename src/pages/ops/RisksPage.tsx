import { Badge, Card, PageHeader, cx, tableCls, tableWrap, td, th } from '../../components/ui';
import { RISKS } from '../../data/risks';

const score = (l: number, s: number) => l * s;
const tone = (n: number) => (n >= 15 ? 'red' : n >= 8 ? 'amber' : 'green');

export default function RisksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations · risk register"
        title="Key operational risks"
        subtitle="Section 5.9 of the operations plan, scored likelihood × impact (1–5). Reviewed monthly by the founders; owners update mitigations."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className={tableWrap}>
          <table className={tableCls}>
            <thead className="bg-stone-50">
              <tr>
                <th className={th}>Risk</th>
                <th className={th}>Impact</th>
                <th className={th}>Mitigation</th>
                <th className={`${th} text-right`}>Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {[...RISKS]
                .sort((a, b) => score(b.likelihood, b.severity) - score(a.likelihood, a.severity))
                .map((r) => {
                  const s = score(r.likelihood, r.severity);
                  return (
                    <tr key={r.id}>
                      <td className={td}>
                        <div className="font-medium text-stone-900">
                          {r.id} · {r.title}
                        </div>
                        <div className="mt-0.5 text-xs text-stone-500">
                          Owner: {r.owner} · Trigger: {r.trigger}
                        </div>
                      </td>
                      <td className={`${td} text-stone-600`}>{r.impact}</td>
                      <td className={`${td} text-stone-600`}>{r.mitigation}</td>
                      <td className={`${td} text-right`}>
                        <Badge tone={tone(s)}>
                          {r.likelihood}×{r.severity} = {s}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <Card title="Heat map">
          <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1 text-[11px]">
            {[5, 4, 3, 2, 1].map((sev) => (
              <div key={sev} className="contents">
                <div className="flex items-center pr-1 text-stone-500">{sev}</div>
                {[1, 2, 3, 4, 5].map((lik) => {
                  const here = RISKS.filter((r) => r.severity === sev && r.likelihood === lik);
                  const t = tone(lik * sev);
                  return (
                    <div
                      key={lik}
                      className={cx('flex aspect-square items-center justify-center rounded-md font-semibold', t === 'red' ? 'bg-red-100 text-red-900' : t === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-900')}
                    >
                      {here.map((r) => r.id).join(' ')}
                    </div>
                  );
                })}
              </div>
            ))}
            <div />
            {[1, 2, 3, 4, 5].map((l) => (
              <div key={l} className="text-center text-stone-500">
                {l}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-stone-500">
            <span>↑ Impact</span>
            <span>Likelihood →</span>
          </div>
        </Card>
      </div>
    </>
  );
}

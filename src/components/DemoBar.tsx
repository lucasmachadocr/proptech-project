import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEMO_STEPS, startStep } from '../demo/steps';
import { useStore } from '../store';
import { cx } from './ui';

/** Guided demo stepper: Brief → Plan → Approve → Re-plan → Invoice, with progress, Back / Next and talking points. */
export default function DemoBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const n = useStore((s) => s.demoStep);
  const setDemoStep = useStore((s) => s.setDemoStep);
  const [notes, setNotes] = useState(false);
  if (!n || pathname === '/') return null;
  const step = DEMO_STEPS[n - 1];
  const go = (k: number) => navigate(startStep(k));
  const finish = () => {
    setDemoStep(null);
    navigate('/');
  };

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-[600] border-t border-stone-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur" data-testid="demo-bar">
      <div className="h-1 bg-stone-100" aria-hidden>
        <div className="h-1 bg-brand-600 transition-all" style={{ width: `${(n / DEMO_STEPS.length) * 100}%` }} />
      </div>
      {notes && (
        <div className="mx-auto max-w-6xl px-4 pt-3 text-base leading-relaxed text-stone-700 sm:px-6" data-testid="demo-notes">
          <span className="font-semibold text-brand-700">Say: </span>
          {step.say}
        </div>
      )}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <ol className="hidden items-center gap-1 md:flex" aria-label="Demo progress">
          {DEMO_STEPS.map((s, i) => (
            <li key={s.n} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => go(s.n)}
                aria-current={s.n === n ? 'step' : undefined}
                className={cx('rounded-full px-3 py-1 text-sm font-medium', s.n === n ? 'bg-ink text-white' : s.n < n ? 'text-ink' : 'text-stone-400 hover:text-ink')}
              >
                <span className="num mr-1">{s.n}</span>
                {s.title}
              </button>
              {i < DEMO_STEPS.length - 1 && <span className="text-stone-300">→</span>}
            </li>
          ))}
        </ol>
        <div className="min-w-0 flex-1 md:hidden">
          <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
            Step {n} of {DEMO_STEPS.length}
          </div>
          <div className="truncate font-semibold text-ink">{step.title}</div>
        </div>
        <div className="hidden flex-1 md:block" />
        <button type="button" onClick={() => setNotes(!notes)} aria-pressed={notes} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 lg:inline-flex">
          {notes ? 'Hide notes' : 'Speaker notes'}
        </button>
        <button type="button" onClick={() => (n > 1 ? go(n - 1) : finish())} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-stone-50" data-testid="demo-prev">
          ← Back
        </button>
        {n < DEMO_STEPS.length ? (
          <button type="button" onClick={() => go(n + 1)} className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800" data-testid="demo-next">
            Next →
          </button>
        ) : (
          <button type="button" onClick={finish} className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800" data-testid="demo-finish">
            Finish ✓
          </button>
        )}
      </div>
    </div>
  );
}

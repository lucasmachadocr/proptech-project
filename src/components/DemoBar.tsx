import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEMO_STEPS, startStep } from '../demo/steps';
import { useStore } from '../store';
import { cx } from './ui';

/** Guided investor demo: fixed bottom bar with progress, talking points and Back / Next. */
export default function DemoBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const n = useStore((s) => s.demoStep);
  const setDemoStep = useStore((s) => s.setDemoStep);
  const [notes, setNotes] = useState(false);
  if (!n || pathname === '/demo') return null;
  const step = DEMO_STEPS[n - 1];
  const go = (k: number) => navigate(startStep(k));
  const finish = () => {
    setDemoStep(null);
    navigate('/demo');
  };

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-[600] border-t border-brand-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur" data-testid="demo-bar">
      {notes && (
        <div className="mx-auto max-w-7xl px-4 pt-3 text-sm leading-relaxed text-stone-700 sm:px-6" data-testid="demo-notes">
          <span className="font-semibold text-brand-800">Say: </span>
          {step.say}
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <ol className="hidden items-center gap-1.5 sm:flex" aria-label="Demo progress">
          {DEMO_STEPS.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => go(s.n)}
                aria-current={s.n === n ? 'step' : undefined}
                aria-label={`Step ${s.n}: ${s.title}`}
                className={cx('num grid h-7 w-7 place-items-center rounded-full text-xs font-semibold', s.n === n ? 'bg-brand-700 text-white' : s.n < n ? 'bg-brand-100 text-brand-800' : 'bg-stone-100 text-stone-500')}
              >
                {s.n}
              </button>
            </li>
          ))}
        </ol>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-wide text-brand-700 uppercase">
            Investor demo · step {n} of {DEMO_STEPS.length}
          </div>
          <div className="truncate text-sm font-semibold text-stone-900">{step.title}</div>
        </div>
        <button type="button" onClick={() => setNotes(!notes)} aria-pressed={notes} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 md:inline-flex">
          {notes ? 'Hide notes' : 'Talking points'}
        </button>
        <button type="button" onClick={() => (n > 1 ? go(n - 1) : finish())} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50" data-testid="demo-prev">
          ←<span className="hidden sm:inline"> Back</span>
        </button>
        {n < DEMO_STEPS.length ? (
          <button type="button" onClick={() => go(n + 1)} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800" data-testid="demo-next">
            Next →
          </button>
        ) : (
          <button type="button" onClick={finish} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800" data-testid="demo-finish">
            Finish ✓
          </button>
        )}
      </div>
    </div>
  );
}

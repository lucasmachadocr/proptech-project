import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE } from '../config';
import { FACTS } from '../data/facts';
import { LIVE_LISTINGS_COLLECTED } from '../data/liveListings';
import { formatDate } from '../lib/dates';
import { useStore } from '../store';
import DemoBar from './DemoBar';
import AiStatus from './AiStatus';
import { Logo } from './Logo';
import { cx } from './ui';

type RoleKey = 'client' | 'provider' | 'employee' | 'ops';

// Role switch. Route prefixes stay stable (client/provider/...) so links in docs keep working.
const ROLES: { key: RoleKey; label: string; home: string }[] = [
  { key: 'client', label: 'Company', home: '/client/brief' },
  { key: 'provider', label: 'Operator', home: '/provider' },
  { key: 'employee', label: 'Employee', home: '/employee' },
  { key: 'ops', label: 'Ops', home: '/ops/review' },
];

const SUBNAV: Record<RoleKey, { to: string; label: string }[]> = {
  client: [
    { to: '/client/brief', label: 'Brief' },
    { to: '/client/plan', label: 'Plan' },
    { to: '/client/change', label: 'Re-plan' },
    { to: '/client/invoice', label: 'Invoice' },
    { to: '/client/summary', label: 'Summary' },
  ],
  provider: [],
  employee: [],
  ops: [
    { to: '/ops/review', label: 'Plan review' },
    { to: '/ops/verification', label: 'Verification' },
    { to: '/ops/compliance', label: 'Lease compliance' },
    { to: '/ops/ledger', label: 'Payouts' },
    { to: '/ops/kpis', label: 'KPIs' },
  ],
};

// Live mode: the company journey only (Deliverable 3: brief → plan → sign → re-plan → pay).
const LIVE_NAV = [
  { to: '/client/brief', label: '1 Brief' },
  { to: '/ops/review', label: '2 Options' },
  { to: '/client/plan', label: '3 Approve & sign' },
  { to: '/client/change', label: '4 Re-plan' },
  { to: '/client/invoice', label: '5 Invoice' },
];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reset = useStore((s) => s.reset);
  const live = useStore((s) => s.mode === 'live');
  const demoActive = useStore((s) => s.demoStep !== null) && pathname !== '/';
  const role = ROLES.find((r) => pathname.startsWith(`/${r.key}`))?.key;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const resetDemo = () => {
    reset();
    navigate('/');
  };

  return (
    <div className={cx('flex min-h-screen flex-col', demoActive && 'pb-24')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[1000] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="safe-top relative top-0 z-[500] border-b border-stone-200 bg-cream/95 backdrop-blur sm:sticky">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <NavLink to="/" className="rounded-md" aria-label={`${APP_NAME} home`}>
            <Logo tagline={APP_TAGLINE} />
          </NavLink>

          {live ? (
            <span className="order-3 w-full text-sm font-semibold text-stone-600 sm:order-none sm:w-auto" data-testid="live-badge">
              Your mission · {FACTS.cities[0]}
            </span>
          ) : (
          <nav aria-label="Role" className="order-3 w-full sm:order-none sm:w-auto">
            <div className="flex w-full rounded-full bg-white p-1 ring-1 ring-stone-200 sm:inline-flex sm:w-auto" role="tablist">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  role="tab"
                  aria-selected={role === r.key}
                  onClick={() => navigate(r.home)}
                  className={cx('flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none sm:px-4', role === r.key ? 'bg-ink text-white' : 'text-stone-600 hover:text-ink')}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </nav>
          )}

          <div className="ml-auto flex items-center gap-2 text-sm">
            <AiStatus />
            <NavLink to="/share" className="rounded-full px-3 py-1.5 font-medium text-stone-600 ring-1 ring-stone-300 hover:text-ink hover:ring-ink" data-testid="share-link">
              Share
            </NavLink>
            <button type="button" onClick={resetDemo} className="rounded-full bg-ink px-3 py-1.5 font-medium whitespace-nowrap text-white hover:bg-stone-700" data-testid="reset-demo" title="Clear every change and go back to the start">
              ↺ Start over
            </button>
          </div>
        </div>
        {(live ? pathname.startsWith('/client') || pathname.startsWith('/ops/review') : role && SUBNAV[role].length > 0) && (
          <div className="border-t border-stone-200/70">
            <nav aria-label="Section" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
              {(live ? LIVE_NAV : SUBNAV[role!]).map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  end
                  className={({ isActive }) => cx('border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap', isActive ? 'border-brand-600 text-ink' : 'border-transparent text-stone-500 hover:text-ink')}
                >
                  {s.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <DemoBar />
      <footer className="safe-bottom border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-stone-600 sm:px-6">
          {live ? (
            <span data-testid="footer-live">
              <strong className="font-semibold text-ink">Real listings, simulated service.</strong> Flats from Spotahome (public listings), collected {formatDate(LIVE_LISTINGS_COLLECTED)}; availability not confirmed, locations by neighbourhood. Commute times are estimates.
            </span>
          ) : (
            <span>
              <strong className="font-semibold text-ink">Demo data — fictional.</strong> Companies, operators, apartments and people are invented. Commute times are estimates.
            </span>
          )}
          <NavLink to="/about-tech" className="font-medium text-ink underline underline-offset-4 hover:text-brand-700" data-testid="about-mvp">
            About this MVP · built with {FACTS.mvpTool}
          </NavLink>
        </div>
      </footer>
    </div>
  );
}

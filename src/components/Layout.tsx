import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE } from '../config';
import { useStore } from '../store';
import { cx } from './ui';

type RoleKey = 'client' | 'provider' | 'employee' | 'ops';

const ROLES: { key: RoleKey; label: string; home: string }[] = [
  { key: 'client', label: 'Client', home: '/client/brief' },
  { key: 'provider', label: 'Provider', home: '/provider' },
  { key: 'employee', label: 'Employee', home: '/employee' },
  { key: 'ops', label: 'Operations', home: '/ops/verification' },
];

const SUBNAV: Record<RoleKey, { to: string; label: string }[]> = {
  client: [
    { to: '/client/brief', label: '1 · Brief' },
    { to: '/client/plan', label: '2 · Plan' },
    { to: '/client/change', label: '3 · Changes' },
    { to: '/client/invoice', label: '4 · Invoice' },
  ],
  provider: [
    { to: '/provider', label: 'Overview' },
    { to: '/provider/onboarding', label: 'Onboarding' },
  ],
  employee: [],
  ops: [
    { to: '/ops/verification', label: 'Verification' },
    { to: '/ops/compliance', label: 'Compliance' },
    { to: '/ops/leases', label: 'Leases' },
    { to: '/ops/ledger', label: 'Payments ledger' },
    { to: '/ops/kpis', label: 'KPIs' },
    { to: '/ops/risks', label: 'Risk register' },
  ],
};

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reset = useStore((s) => s.reset);
  const role = ROLES.find((r) => pathname.startsWith(`/${r.key}`))?.key;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[1000] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-[500] border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <NavLink to="/demo" className="flex items-center gap-2.5 rounded-md">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current">
                <path d="M4 12.5 12 5l8 7.5V20a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold text-stone-900">{APP_NAME}</span>
              <span className="hidden text-[11px] text-stone-500 sm:block">{APP_TAGLINE}</span>
            </span>
          </NavLink>

          <nav aria-label="Role" className="order-3 w-full sm:order-none sm:w-auto">
            <div className="inline-flex rounded-lg bg-stone-100 p-1" role="tablist">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  role="tab"
                  aria-selected={role === r.key}
                  onClick={() => navigate(r.home)}
                  className={cx('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', role === r.key ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-900')}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <NavLink to="/demo" className={({ isActive }) => cx('rounded-md px-2.5 py-1.5 font-medium', isActive ? 'text-teal-800' : 'text-stone-600 hover:text-stone-900')}>
              Investor demo
            </NavLink>
            <NavLink to="/about-tech" className={({ isActive }) => cx('hidden rounded-md px-2.5 py-1.5 font-medium sm:inline', isActive ? 'text-teal-800' : 'text-stone-600 hover:text-stone-900')}>
              Tech
            </NavLink>
            <span className="hidden rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-300 md:inline">Demo data</span>
          </div>
        </div>
        {role && SUBNAV[role].length > 0 && (
          <div className="border-t border-stone-100">
            <nav aria-label="Section" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
              {SUBNAV[role].map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  end
                  className={({ isActive }) => cx('border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap', isActive ? 'border-teal-700 text-teal-800' : 'border-transparent text-stone-600 hover:text-stone-900')}
                >
                  {s.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500 sm:px-6">
          <span>
            <strong className="font-semibold text-stone-700">Demo data — fictional.</strong> Companies, providers, units and people are invented for an ESCP PropTech venture project. Commute times are estimates.
          </span>
          <span className="flex items-center gap-3">
            <NavLink to="/about-tech" className="underline-offset-2 hover:underline">
              Tools & disclosure
            </NavLink>
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => {
                reset();
                navigate('/demo');
              }}
            >
              Reset demo
            </button>
          </span>
        </div>
      </footer>
    </div>
  );
}

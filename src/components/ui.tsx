import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function AiBadge({ label = 'AI', title }: { label?: string; title?: string }) {
  return (
    <span
      title={title ?? 'Produced by the local, explainable AI engine (phase 1: optimisation + rules)'}
      className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-teal-800 ring-1 ring-teal-200 ring-inset"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 fill-current">
        <path d="M8 0l1.8 4.6L14.4 6 9.8 7.8 8 12.4 6.2 7.8 1.6 6l4.6-1.4zM13 10l.9 2.1L16 13l-2.1.9L13 16l-.9-2.1L10 13l2.1-.9z" />
      </svg>
      {label}
    </span>
  );
}

type Tone = 'neutral' | 'accent' | 'green' | 'amber' | 'red' | 'blue';
const TONES: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-stone-700 ring-stone-200',
  accent: 'bg-teal-50 text-teal-800 ring-teal-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-900 ring-amber-300',
  red: 'bg-red-50 text-red-800 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', TONES[tone], className)}>{children}</span>;
}

export function Light({ light }: { light: 'green' | 'amber' | 'red' }) {
  const label = { green: 'Compliant', amber: 'Check', red: 'Blocked' }[light];
  const dot = { green: 'bg-emerald-600', amber: 'bg-amber-500', red: 'bg-red-600' }[light];
  return (
    <Badge tone={light}>
      <span aria-hidden className={cx('h-2 w-2 rounded-full', dot)} />
      {label}
    </Badge>
  );
}

export function Card({ children, className, title, actions, id }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cx('rounded-xl border border-stone-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint, ai }: { label: string; value: ReactNode; hint?: ReactNode; ai?: boolean }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-stone-500">
        <span>{label}</span>
        {ai && <AiBadge />}
      </div>
      <div className="num mt-1 text-2xl font-semibold tracking-tight text-stone-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-stone-500">{hint}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <div className="text-xs font-semibold tracking-wider text-teal-700 uppercase">{eyebrow}</div>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-stone-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 disabled:bg-stone-300 disabled:text-stone-500',
  secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 disabled:text-stone-400',
  ghost: 'text-stone-700 hover:bg-stone-100',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
};
export const btn = (v: Variant = 'primary', size: 'sm' | 'md' = 'md') =>
  cx('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed', size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm', VARIANTS[v]);

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return <button type="button" className={cx(btn(variant, size), className)} {...rest} />;
}

export function LinkButton({ to, variant = 'primary', size = 'md', children }: { to: string; variant?: Variant; size?: 'sm' | 'md'; children: ReactNode }) {
  return (
    <Link to={to} className={btn(variant, size)}>
      {children}
    </Link>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      {children && <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-stone-600">{children}</div>}
    </div>
  );
}

export const th = 'px-3 py-2 text-left text-xs font-semibold tracking-wide text-stone-500 uppercase';
export const td = 'px-3 py-2.5 align-top';
export const tableWrap = 'overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm';
export const tableCls = 'w-full min-w-[640px] border-collapse text-sm';
export const inputCls = 'mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 shadow-sm sm:text-sm focus:border-teal-700 focus:ring-1 focus:ring-teal-700 focus:outline-none';
export const labelCls = 'block text-sm font-medium text-stone-700';

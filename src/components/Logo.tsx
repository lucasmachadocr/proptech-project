import { APP_NAME } from '../config';

/** Brand mark: terracotta arch with a doorway and knob ("settle in" logo, option 04). */
export function LogoMark({ className = 'h-8 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden>
      <path d="M0 24a24 24 0 0 1 48 0v32H0z" fill="#c9573a" />
      <path d="M15 31a9 9 0 0 1 18 0v25H15z" fill="#faf4ee" />
      <circle cx="24" cy="42" r="2.6" fill="#c9573a" />
    </svg>
  );
}

export function Logo({ tagline }: { tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[19px] font-bold tracking-tight text-brand-600">{APP_NAME.toLowerCase()}</span>
        {tagline && <span className="hidden text-[11px] text-stone-500 sm:block">{tagline}</span>}
      </span>
    </span>
  );
}

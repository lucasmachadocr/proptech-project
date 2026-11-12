import { MODEL_LABEL } from '../ai/briefReader';
import { useModelStatus } from '../ai/modelStatus';
import { pct } from '../lib/format';
import { cx } from './ui';

/** Header pill: state of the in-browser language model that reads briefs. */
export default function AiStatus() {
  const { state, ratio } = useModelStatus();
  if (state === 'idle') return null;
  const text = state === 'ready' ? 'AI ready' : state === 'loading' ? `AI loading ${pct(ratio)}` : 'Rules fallback';
  const title =
    state === 'ready'
      ? `${MODEL_LABEL} is loaded in this browser.`
      : state === 'loading'
        ? 'Downloading the language model in the background (about 65 MB, once; then cached).'
        : 'The language model could not load, so a rule-based parser reads requests.';
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1', state === 'ready' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : state === 'loading' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-stone-100 text-stone-700 ring-stone-300')}
      title={title}
      role="status"
      data-testid="ai-status"
      data-state={state}
    >
      <span aria-hidden className={cx('h-1.5 w-1.5 rounded-full', state === 'ready' ? 'bg-emerald-600' : state === 'loading' ? 'animate-pulse bg-amber-500' : 'bg-stone-500')} />
      {text}
    </span>
  );
}

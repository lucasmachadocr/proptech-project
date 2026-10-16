// Deterministic placeholder "photo" for a perceptual-hash id (no external images).
// Two listings that share a hash render the exact same picture — which is the point.
function hashNum(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const WALLS = ['#e7e5e4', '#f5f5f4', '#fef3c7', '#e0f2fe', '#ecfccb', '#fae8ff', '#ffedd5'];
const FLOORS = ['#a8a29e', '#d6d3d1', '#b45309', '#78716c', '#ca8a04'];
const ACCENTS = ['#0f766e', '#334155', '#9f1239', '#1d4ed8', '#4d7c0f', '#7c2d12'];

export default function PhotoThumb({ hash, size = 88, highlight }: { hash: string; size?: number; highlight?: boolean }) {
  const n = hashNum(hash);
  const wall = WALLS[n % WALLS.length];
  const floor = FLOORS[(n >> 3) % FLOORS.length];
  const accent = ACCENTS[(n >> 6) % ACCENTS.length];
  const winX = 8 + ((n >> 9) % 40);
  const sofaX = 6 + ((n >> 13) % 30);
  const kind = (n >> 17) % 3;
  return (
    <svg
      role="img"
      aria-label={`Listing photo ${hash}`}
      viewBox="0 0 80 60"
      width={size}
      height={(size * 3) / 4}
      className={highlight ? 'rounded-md ring-2 ring-red-500 ring-offset-1' : 'rounded-md ring-1 ring-stone-200'}
    >
      <rect width="80" height="60" fill={wall} />
      <rect y="42" width="80" height="18" fill={floor} />
      <rect x={winX} y="8" width="22" height="18" fill="#bae6fd" stroke="#fff" strokeWidth="2" />
      <line x1={winX + 11} y1="8" x2={winX + 11} y2="26" stroke="#fff" strokeWidth="1.5" />
      {kind === 0 && (
        <>
          <rect x={sofaX} y="32" width="30" height="12" rx="3" fill={accent} />
          <rect x={sofaX + 2} y="28" width="26" height="6" rx="2" fill={accent} opacity="0.8" />
        </>
      )}
      {kind === 1 && (
        <>
          <rect x={sofaX} y="30" width="34" height="14" rx="2" fill="#fff" stroke={accent} strokeWidth="2" />
          <rect x={sofaX} y="27" width="10" height="5" rx="1" fill={accent} />
        </>
      )}
      {kind === 2 && (
        <>
          <rect x={sofaX} y="30" width="28" height="3" fill={accent} />
          <rect x={sofaX + 2} y="33" width="2" height="10" fill={accent} />
          <rect x={sofaX + 24} y="33" width="2" height="10" fill={accent} />
          <rect x={sofaX + 8} y="20" width="12" height="9" fill="#1c1917" />
        </>
      )}
      <circle cx="68" cy="14" r="5" fill={accent} opacity="0.35" />
    </svg>
  );
}

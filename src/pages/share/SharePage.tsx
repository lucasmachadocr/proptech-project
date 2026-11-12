import { useMemo, useState } from 'react';
import { APP_NAME, APP_ONE_LINER } from '../../config';
import { appUrl, qrPath, shortUrl } from '../../lib/share';

/** One screen to put on the projector: scan the QR or type the short address. */
export default function SharePage() {
  const url = appUrl();
  const qr = useMemo(() => qrPath(url), [url]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the address is on screen anyway */
    }
  };
  const q = 4; // quiet zone, in modules

  return (
    <div className="mx-auto max-w-md text-center" data-testid="share-page">
      <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Try it on your phone</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Scan to open {APP_NAME}</h1>
      <p className="mt-2 text-stone-600">{APP_ONE_LINER}</p>
      <div className="mx-auto mt-6 w-full max-w-[320px] rounded-3xl bg-white p-4 ring-1 ring-stone-200">
        <svg viewBox={`${-q} ${-q} ${qr.size + 2 * q} ${qr.size + 2 * q}`} role="img" aria-label={`QR code for ${url}`} className="block h-auto w-full" shapeRendering="crispEdges" data-testid="share-qr">
          <rect x={-q} y={-q} width={qr.size + 2 * q} height={qr.size + 2 * q} fill="#fff" />
          <path d={qr.d} fill="#2A2320" />
        </svg>
      </div>
      <p className="num mt-6 text-2xl font-semibold break-all text-ink" data-testid="share-url">
        {shortUrl(url)}
      </p>
      <button type="button" onClick={copy} className="mt-4 rounded-full bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-800">
        {copied ? 'Link copied ✓' : 'Copy link'}
      </button>
      <p className="mt-4 text-xs text-stone-500">QR code generated in this browser. Works on any phone; no app to install.</p>
    </div>
  );
}

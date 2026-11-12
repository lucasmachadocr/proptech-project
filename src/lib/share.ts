import qrcode from 'qrcode-generator';

/** The address of this app without the in-app route: https://host/path/ (the QR opens the home page). */
export function appUrl(loc: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  return `${loc.origin}${loc.pathname}`;
}

/** Shortest readable form: no protocol, no "www.", no trailing slash. */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

/** QR code as one SVG path (dark modules), generated locally: no external service. */
export function qrPath(text: string): { size: number; d: string } {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { size: n, d };
}

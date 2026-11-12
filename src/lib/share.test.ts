import { describe, expect, it } from 'vitest';
import { appUrl, qrPath, shortUrl } from './share';

describe('share page helpers', () => {
  it('app URL drops the in-app route; short URL drops protocol and slash', () => {
    expect(appUrl({ origin: 'https://lucasmachadocr.github.io', pathname: '/proptech-project/' })).toBe('https://lucasmachadocr.github.io/proptech-project/');
    expect(shortUrl('https://settle-in-app.netlify.app/')).toBe('settle-in-app.netlify.app');
  });
  it('builds a QR code locally', () => {
    const a = qrPath('https://settle-in-app.netlify.app/');
    expect(a.size).toBeGreaterThanOrEqual(21);
    expect(a.d.length).toBeGreaterThan(100);
    expect(qrPath('https://settle-in-app.netlify.app/')).toEqual(a); // deterministic
  });
});

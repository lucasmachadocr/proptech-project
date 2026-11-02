// Regenerates the home-screen PNG icons from public/icon.svg (run: node scripts/make-icons.mjs).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icon.svg', 'utf8');
const browser = await chromium.launch();
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: `public/${size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`}` });
  await page.close();
}
await browser.close();

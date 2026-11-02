// Deck screenshots: npm run shots → docs/deck-shots/*.png (1440×900 @2x, map tiles loaded).
// Serves the production build with `vite preview` on port 4175.
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 4175;
const BASE = `http://localhost:${PORT}/`;
const OUT = 'docs/deck-shots';
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();

async function settle() {
  await page.waitForLoadState('networkidle');
  if (await page.locator('.leaflet-container').count()) {
    await page.waitForFunction(
      () => {
        const tiles = document.querySelectorAll('.leaflet-tile');
        return tiles.length > 0 && document.querySelectorAll('.leaflet-tile-loaded').length === tiles.length;
      },
      null,
      { timeout: 30000 },
    );
    await page.waitForLoadState('networkidle');
  }
  await page.waitForTimeout(600);
}
async function shot(name) {
  await settle();
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('saved', `${OUT}/${name}.png`);
}

try {
  // Guided demo
  await page.goto(BASE);
  await page.getByTestId('start-demo').click();
  await shot('01-brief');
  await page.getByTestId('generate-plan').click();
  await page.getByTestId('review-queue').waitFor();
  await page.getByTestId('release-plan').click();
  await page.getByTestId('plan-kpis').waitFor();
  await shot('03-step');
  await page.getByTestId('approve-plan').click();
  await page.getByTestId('demo-next').click(); // re-plan
  await page.getByTestId('demo-next').click(); // invoice
  await page.getByTestId('invoice-total').waitFor();
  await shot('05-step');

  // Ops screens: reload so the guided-demo bar is not shown (plan state persists in localStorage).
  await page.goto(`${BASE}#/ops/ledger`);
  await page.reload();
  await page.getByTestId('ledger-flow').waitFor();
  await shot('ops-ledger');

  // Ops: verification → run AI checks → MAD99
  await page.goto(`${BASE}#/ops/verification`);
  await page.reload();
  await page.getByTestId('run-checks').click();
  await page.getByTestId('queue-MAD99').click();
  await page.getByTestId('trust-score').waitFor();
  await page.evaluate(() => window.scrollTo(0, 330));
  await shot('v-fraud');

  // Ops: lease compliance → non-compliant example (fresh state, uses the empty-state button)
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}#/ops/compliance?scenario=noncompliant`);
  await page.reload();
  const gen = page.getByRole('button', { name: 'Generate demo plan' });
  if (await gen.count()) await gen.click();
  await page.getByRole('button', { name: 'Non-compliant example' }).click();
  await page.getByTestId('sign-blocked').waitFor();
  await shot('c-block');
} finally {
  await browser.close();
  server.kill();
}

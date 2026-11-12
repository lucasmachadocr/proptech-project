// Demo video: npm run video → docs/demo-video/settle-in-demo.webm (1280×720, about 100 seconds).
// Records the real app in a real browser, step by step, with a caption for each step.
// Run it on a machine with internet so the map tiles and the language model load.
// Convert to MP4 for PowerPoint/Keynote:  ffmpeg -i settle-in-demo.webm -c:v libx264 -pix_fmt yuv420p settle-in-demo.mp4
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 4176;
const BASE = `http://localhost:${PORT}/`;
const OUT = 'docs/demo-video';
const SIZE = { width: 1280, height: 720 };
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.webm')) rmSync(`${OUT}/${f}`);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: OUT, size: SIZE } });
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);

/** Caption bar at the top of the screen (the guided-demo bar sits at the bottom). */
async function caption(step, text) {
  await page.evaluate(
    ([s, t]) => {
      let el = document.getElementById('video-caption');
      if (!el) {
        el = document.createElement('div');
        el.id = 'video-caption';
        el.style.cssText =
          'position:fixed;left:0;right:0;top:0;z-index:99999;pointer-events:none;background:#2A2320;color:#F7EEE7;padding:14px 28px;font:600 19px/1.35 Inter,system-ui,sans-serif;display:flex;gap:16px;align-items:baseline;box-shadow:0 6px 24px rgba(0,0,0,.25)';
        document.body.appendChild(el);
      }
      el.innerHTML = `<span style="color:#E9A08E;letter-spacing:2px;text-transform:uppercase;font-size:13px;white-space:nowrap">${s}</span><span>${t}</span>`;
    },
    [step, text],
  );
}
async function smoothScroll(y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y);
  await wait(900);
}
async function tiles() {
  // Wait for the map, but never block the recording if tiles are unavailable.
  await page
    .waitForFunction(() => document.querySelectorAll('.leaflet-tile-loaded').length >= 4, null, { timeout: 6000 })
    .catch(() => {});
}

try {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await caption('Settle In', 'One brief, one plan, one monthly invoice for a whole project team.');
  await wait(3500);

  // 1 · Brief, read by the language model
  await page.getByTestId('start-demo').click();
  await page.getByTestId('brief-summary').waitFor();
  await caption('1 · Brief', 'HR pastes the request exactly as written.');
  await tiles();
  await wait(1800);
  await page.getByTestId('brief-sample').click();
  await wait(2800);
  await page.getByTestId('brief-read').click();
  await caption('1 · Brief', 'Reading the request…');
  await page.getByTestId('brief-reading').waitFor({ timeout: 180000 });
  // Say which engine really answered: the language model, or the rule parser when the model could not load.
  const byModel = (await page.getByTestId('brief-engine').innerText()).startsWith('Read by');
  await caption('1 · Brief', byModel ? 'A language model in the browser reads who, where, when, how long and the budget.' : 'The request becomes a brief: who, where, when, how long, budget (rule parser; the language model was offline).');
  await page.getByTestId('brief-reader').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await wait(6500);
  await smoothScroll(0);

  // 2 · Plan, reviewed by Ops
  await page.getByTestId('generate-plan').scrollIntoViewIfNeeded();
  await wait(600);
  await page.getByTestId('generate-plan').click();
  await caption('2 · Plan', 'Building the plan…');
  await page.getByTestId('review-queue').waitFor();
  await caption('2 · Plan', 'The engine matches 20 people to verified apartments: three options, cost against commute.');
  await tiles();
  await wait(4500);
  await page.getByTestId('option-B').scrollIntoViewIfNeeded();
  await caption('2 · Plan', 'Our operations team reviews the plan before the client sees it.');
  await wait(4000);
  await page.getByTestId('release-plan').scrollIntoViewIfNeeded();
  await wait(700);
  await page.getByTestId('release-plan').click();

  // 3 · Approve
  await page.getByTestId('plan-kpis').waitFor();
  await caption('3 · Approve', 'The client sees one plan on a map: every apartment, every commute, one price.');
  await tiles();
  await wait(5000);
  await smoothScroll(420);
  await wait(2500);
  await smoothScroll(0);
  await page.getByTestId('approve-plan').scrollIntoViewIfNeeded();
  await page.getByTestId('approve-plan').click();
  await caption('3 · Approve', 'One click approves housing for the whole team.');
  await wait(3000);
  await page.getByTestId('demo-next').click();

  // 4 · Re-plan
  await page.getByTestId('realloc-diff').waitFor();
  await caption('4 · Re-plan', 'Three more engineers join in month 3. Nobody already housed moves, and the cost is shown first.');
  await wait(3500);
  await page.getByTestId('kpi-replan-cost').scrollIntoViewIfNeeded();
  await wait(4500);
  await page.getByTestId('demo-next').click();

  // 5 · Invoice
  await page.getByTestId('invoice-total').waitFor();
  await caption('5 · Invoice', 'One monthly invoice. Our fees are separate lines: 4% markup and 2% Flex.');
  await wait(3500);
  await page.getByTestId('line-flex').scrollIntoViewIfNeeded();
  await wait(4000);

  // Employee on WhatsApp
  await page.goto(`${BASE}#/employee`);
  await page.getByTestId('chat').waitFor();
  await caption('Employee', 'Engineers need no app: welcome pack, check-in and help arrive on WhatsApp.');
  await wait(4500);
  await page.getByLabel('Message').pressSequentially('There is a smell of gas in the kitchen', { delay: 45 });
  await wait(600);
  await page.getByTestId('report-issue').click();
  await page.getByTestId('triage-result').waitFor();
  await page.getByTestId('triage-result').scrollIntoViewIfNeeded();
  await caption('Employee', 'An urgent issue is triaged at once: two-hour response time, operator alerted.');
  await wait(5000);

  // Ops: fake listing caught
  await page.goto(`${BASE}#/ops/verification`);
  await page.getByTestId('run-checks').click();
  await page.getByTestId('queue-MAD99').click();
  await page.getByTestId('trust-score').waitFor();
  await page.getByTestId('trust-score').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await caption('Operations', 'Every listing is checked before it can be booked. This fake one is rejected.');
  await wait(5500);

  // Ops: money
  await page.goto(`${BASE}#/ops/ledger`);
  await page.getByTestId('ledger-flow').waitFor();
  await caption('Operations', 'Rent passes through. Our revenue is the commission, the markup and half of Flex.');
  await wait(5500);

  // How the AI works
  await page.goto(`${BASE}#/about-tech`);
  await page.locator('#ai').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' }));
  await caption('Technology', 'What is a language model, what is an optimiser and what is a rule: stated in the app.');
  await wait(5500);
} finally {
  await context.close();
  await browser.close();
  server.kill();
}
const made = readdirSync(OUT).find((f) => f.endsWith('.webm') && f !== 'settle-in-demo.webm');
if (made) renameSync(`${OUT}/${made}`, `${OUT}/settle-in-demo.webm`);
console.log('saved', `${OUT}/settle-in-demo.webm`);

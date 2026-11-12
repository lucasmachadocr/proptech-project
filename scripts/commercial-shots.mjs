// Commercial clips: npm run commercial:shots → docs/commercial/1-brief.webm … 4-ops.webm
// Headed Chromium at 1920×1080, real app, slow visible cursor, no captions (editing is done later).
// The first run downloads the language model once into a local browser profile.
// With ffmpeg available (FFMPEG=/path/to/ffmpeg or in PATH) the page-loading frames at the start
// of each clip are trimmed; otherwise the raw recordings are kept as they are.
import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { findFfmpeg, recordClip, startServer, tilesLoaded, warmUp } from './lib/film.mjs';

const OUT = 'docs/commercial';
let SAMPLE = ''; // the app's sample email, read in the prep page
mkdirSync(OUT, { recursive: true });

/** Guided-demo shortcuts used to prepare the state of a clip (not recorded). */
const demo = {
  start: async (p) => {
    await p.getByTestId('start-demo').click();
    await p.getByTestId('brief-summary').waitFor();
  },
  next: async (p, n = 1) => {
    for (let i = 0; i < n; i++) await p.getByTestId('demo-next').click();
  },
};

export const CLIPS = {
  // 1 · HR pastes the email, the language model fills the brief (~9 s)
  '1-brief': {
    prep: async (p) => {
      await demo.start(p);
      SAMPLE = await sample(p);
    },
    route: '/client/brief',
    ready: async (p) => {
      await p.getByTestId('brief-request').waitFor();
      await p.waitForFunction(() => document.querySelector('[data-testid=ai-status]')?.textContent === 'AI ready', null, { timeout: 60_000 }).catch(() => {});
    },
    scene: async (p, d) => {
      await d.park(1000, 200);
      await d.wait(300);
      await d.click(p.getByTestId('brief-request'), 700);
      await p.getByTestId('brief-request').fill(SAMPLE); // pasted in one go
      await d.wait(700);
      await d.click(p.getByTestId('brief-read'), 600);
      await p.getByTestId('brief-reading').waitFor({ timeout: 120_000 });
      await p.getByTestId('brief-reading').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      await d.wait(700);
      const b = await box(p, 'brief-reading');
      await d.moveTo(b.x + b.width * 0.35, b.y + 60, 600);
      await d.moveTo(b.x + b.width * 0.35, b.y + b.height - 50, 1500);
      await d.wait(1200);
    },
  },
  // 2 · Map and options A / B / C (~10 s)
  '2-options': {
    prep: async (p) => {
      await demo.start(p);
      await p.getByTestId('generate-plan').click();
      await p.getByTestId('review-queue').waitFor();
    },
    route: '/ops/review',
    ready: async (p) => {
      await p.getByTestId('plan-options').waitFor();
      await tilesLoaded(p);
    },
    scene: async (p, d) => {
      // Options on top, map underneath: both in the frame.
      await p.getByTestId('plan-options').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - document.querySelector('header').offsetHeight - 14 }));
      await tilesLoaded(p);
      await d.park(640, 650);
      await d.wait(900);
      await d.click(p.getByTestId('option-A'), 900);
      await tilesLoaded(p);
      await d.wait(1700);
      await d.click(p.getByTestId('option-C'), 900);
      await d.wait(1700);
      await d.click(p.getByTestId('option-B'), 900);
      await d.wait(1600);
    },
  },
  // 3 · Re-plan: the team drops to 15 from month 4, flats released with Flex (~8 s)
  '3-replan': {
    prep: async (p) => {
      await demo.start(p);
      await demo.next(p, 2); // plan built and released by Ops
      await p.getByTestId('approve-plan').click();
    },
    route: '/client/change',
    ready: async (p) => p.getByTestId('preset-change').waitFor(),
    // (the change appears in place of the button, so the frame fills up when it is clicked)
    scene: async (p, d) => {
      await d.park(1400, 700);
      await d.wait(700);
      await d.click(p.getByTestId('preset-change'), 900);
      await p.getByTestId('realloc-diff').waitFor();
      await d.wait(500);
      await d.pointAt(p.getByTestId('kpi-moved'), 800);
      await d.wait(1300);
      await d.pointAt(p.getByTestId('kpi-replan-cost'), 800);
      await d.wait(2200);
    },
  },
  // 4 · Operations: a listing verified, an engineer checks in, one invoice (~8 s)
  '4-ops': {
    prep: async (p) => {
      await demo.start(p);
      await demo.next(p, 2);
      await p.getByTestId('approve-plan').click();
    },
    route: '/ops/verification',
    ready: async (p) => p.getByTestId('run-checks').waitFor(),
    scene: async (p, d) => {
      await d.park(1300, 250);
      await d.click(p.getByTestId('run-checks'), 700);
      await d.wait(500);
      await d.click(p.getByTestId('queue-BCN10'), 700);
      await p.getByTestId('trust-score').waitFor();
      await d.click(p.getByRole('button', { name: 'Approve after video visit' }), 700);
      await d.wait(900);
      await p.evaluate(() => (location.hash = '#/employee'));
      await p.getByTestId('chat').waitFor();
      await p.getByTestId('send-photo').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await d.wait(400);
      await d.click(p.getByTestId('send-photo'), 700);
      await d.wait(1000);
      await p.evaluate(() => (location.hash = '#/client/invoice'));
      await p.getByTestId('invoice-total').waitFor();
      await d.pointAt(p.getByTestId('invoice-total'), 800);
      await d.wait(1300);
    },
  },
};

async function box(p, id) {
  return (await p.getByTestId(id).boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
}
async function sample(p) {
  await p.getByTestId('brief-sample').click();
  return p.getByTestId('brief-request').inputValue();
}

/** Re-encode without the loading frames at the start. */
export function trim(ffmpeg, file, lead) {
  const tmp = file.replace(/\.webm$/, '.raw.webm');
  renameSync(file, tmp);
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', lead.toFixed(2), '-i', tmp, '-an', '-c:v', 'libvpx-vp9', '-b:v', '8M', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', file]);
  if (r.status === 0) rmSync(tmp);
  else renameSync(tmp, file);
  return r.status === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = await startServer();
  try {
    console.log('model:', await warmUp());
    const ffmpeg = findFfmpeg();
    const only = process.argv.slice(2);
    for (const [name, clip] of Object.entries(CLIPS)) {
      if (only.length && !only.includes(name)) continue;
      const file = `${OUT}/${name}.webm`;
      const { seconds, lead } = await recordClip(file, clip);
      const trimmed = ffmpeg ? trim(ffmpeg, file, lead) : false;
      console.log(`${file}  ${seconds.toFixed(1)} s${trimmed ? '' : ` (+${lead.toFixed(1)} s of page loading at the start)`}`);
    }
  } finally {
    server.kill();
  }
}

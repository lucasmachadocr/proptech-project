// Experience film (90 s): npm run film → docs/commercial/settle-in-experience.mp4
//   node scripts/experience-film.mjs --stills      one frame per scene → docs/commercial/storyboard/*.jpg
//   node scripts/experience-film.mjs --from=40     render from t=40 s (frames already rendered are kept)
// 1. records the real-app clips shown in the small rectangle (reuses scripts/commercial-shots.mjs),
// 2. cuts each clip to the region that matters and stores its frames in film/.frames/,
// 3. opens film/index.html (MapLibre 3D map + Three.js office) and screenshots window.seek(t) 30×/s,
// 4. encodes with ffmpeg (FFMPEG=/path/to/ffmpeg or ffmpeg in PATH).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { CLIPS, trim } from './commercial-shots.mjs';
import { findFfmpeg, recordClip, startServer, warmUp } from './lib/film.mjs';

const args = new Map(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const FPS = 30;
const DURATION = 90;
const OUT = 'docs/commercial';
const FRAMES = resolve('film/.frames');
const RENDER = resolve('node_modules/.cache/film-render');
const FILM_URL = 'http://localhost:5179/film/index.html';
const ffmpeg = findFfmpeg();
if (!ffmpeg) throw new Error('ffmpeg not found: set FFMPEG=/path/to/ffmpeg');

const demo = async (p, next = 0, approve = false) => {
  await p.getByTestId('start-demo').click();
  await p.getByTestId('brief-summary').waitFor();
  for (let i = 0; i < next; i++) await p.getByTestId('demo-next').click();
  if (approve) await p.getByTestId('approve-plan').click();
};

// Extra app clips for the film (the others come from commercial-shots.mjs).
const EXTRA = {
  '5-approve': {
    prep: async (p) => {
      await demo(p);
      await p.getByTestId('generate-plan').click();
      await p.getByTestId('review-queue').waitFor();
    },
    route: '/ops/review',
    ready: async (p) => p.getByTestId('release-plan').waitFor(),
    scene: async (p, d) => {
      await d.park(900, 500);
      await d.wait(500);
      await p.getByTestId('review-queue').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      await d.wait(900);
      await d.click(p.getByTestId('release-plan'), 800);
      await p.getByTestId('plan-kpis').waitFor();
      await d.wait(900);
      await d.click(p.getByTestId('approve-plan'), 900);
      await d.wait(600);
      await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await d.pointAt(p.getByTestId('plan-kpis'), 700);
      await d.wait(2200);
    },
  },
  '6-checkin': {
    prep: async (p) => demo(p, 2, true),
    route: '/employee',
    ready: async (p) => p.getByTestId('chat').waitFor(),
    scene: async (p, d) => {
      await p.getByTestId('send-photo').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await d.park(700, 300);
      await d.wait(900);
      for (let i = 0; i < 3; i++) {
        await d.click(p.getByTestId('send-photo'), i ? 400 : 800);
        await d.wait(1100);
      }
      await d.wait(2500);
    },
  },
};

// Rectangle sources: app clip + crop in app CSS pixels (the clips are 1280×720 CSS at 1.5×). 16:9 crops.
const RECT = {
  brief: { file: '1-brief', crop: { x: 10, y: 96, w: 690, h: 388 } },
  options: { file: '2-options', crop: { x: 0, y: 40, w: 1280, h: 720 - 40 } },
  approve: { file: '5-approve', crop: { x: 0, y: 0, w: 1280, h: 720 } },
  checkin: { file: '6-checkin', crop: { x: 16, y: 40, w: 600, h: 338 } },
  replan: { file: '3-replan', crop: { x: 10, y: 60, w: 880, h: 495 } },
};

async function appClips() {
  const all = { ...CLIPS, ...EXTRA };
  const need = Object.values(RECT).map((r) => r.file).filter((f) => args.has('reclip') || !existsSync(`${OUT}/${f}.webm`));
  if (!need.length) return;
  const server = await startServer();
  try {
    console.log('model:', await warmUp());
    for (const f of need) {
      const { lead } = await recordClip(`${OUT}/${f}.webm`, all[f]);
      trim(ffmpeg, `${OUT}/${f}.webm`, lead);
      console.log('clip', f);
    }
  } finally {
    server.kill();
  }
}

function rectFrames() {
  const manifest = {};
  for (const [name, { file, crop }] of Object.entries(RECT)) {
    const dir = `${FRAMES}/${name}`;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const k = 1.5;
    const vf = `fps=${FPS},crop=${Math.round(crop.w * k)}:${Math.round(crop.h * k)}:${Math.round(crop.x * k)}:${Math.round(crop.y * k)},scale=1472:828:flags=lanczos`;
    const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', `${OUT}/${file}.webm`, '-vf', vf, '-q:v', '3', `${dir}/f%05d.jpg`]);
    if (r.status !== 0) throw new Error(String(r.stderr));
    manifest[name] = readdirSync(dir).length;
  }
  writeFileSync(`${FRAMES}/manifest.json`, JSON.stringify(manifest));
  console.log('rectangle frames', manifest);
}

async function filmServer() {
  try {
    if ((await fetch(FILM_URL)).ok) return null;
  } catch {
    /* start it */
  }
  const s = spawn('npx', ['vite', '--config', 'film/vite.config.ts'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(FILM_URL)).ok) return s;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('film server did not start');
}

async function render(times, dir, name = (i) => `f${String(i).padStart(5, '0')}.jpg`) {
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '1', args: ['--window-size=1920,1180', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(FILM_URL);
  await page.waitForFunction(() => window.filmReady === true, null, { timeout: 120_000 });
  const t0 = Date.now();
  for (const [i, t] of times) {
    await page.evaluate((x) => window.seek(x), t);
    await page.screenshot({ path: `${dir}/${name(i, t)}`, type: 'jpeg', quality: 93 });
    if (i % 150 === 0) console.log(`t=${t.toFixed(1)} s  (${((Date.now() - t0) / 1000).toFixed(0)} s elapsed)`);
  }
  await browser.close();
}

await appClips();
rectFrames();
const server = await filmServer();
try {
  if (args.has('stills')) {
    const KEY = [4, 15, 27, 34, 45, 52, 70, 82, 88];
    await render(KEY.map((t, i) => [i + 1, t]), `${OUT}/storyboard`, (i, t) => `${i}-t${String(t).padStart(2, '0')}.jpg`);
    console.log(`storyboard → ${OUT}/storyboard/`);
  } else {
    const from = Number(args.get('from') ?? 0);
    const total = DURATION * FPS;
    const times = [];
    for (let i = Math.round(from * FPS); i < total; i++) times.push([i + 1, i / FPS]);
    await render(times, RENDER);
    const film = `${OUT}/settle-in-experience.mp4`;
    const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${RENDER}/f%05d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', film]);
    if (r.status !== 0) throw new Error(String(r.stderr));
    console.log(`saved ${film}`);
  }
} finally {
  server?.kill();
}

// One-minute commercial: npm run commercial → docs/commercial/settle-in-commercial.mp4 (1920×1080, H.264, no sound)
// Title cards in the brand colours + the four app clips (npm run commercial:shots) + the mission summary,
// joined with short cross-fades. Needs ffmpeg with libx264: FFMPEG=/path/to/ffmpeg or ffmpeg in PATH.
// Numbers on the cards come from src/data/facts.ts.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { FACTS } from '../src/data/facts.ts';
import { CLIPS, trim } from './commercial-shots.mjs';
import { SIZE, findFfmpeg, recordClip, startServer, warmUp } from './lib/film.mjs';

const OUT = 'docs/commercial';
const WORK = resolve('node_modules/.cache/commercial-build');
const TARGET = 60; // seconds
const FADE = 0.45;
const ffmpeg = findFfmpeg();
if (!ffmpeg) throw new Error('ffmpeg not found: set FFMPEG=/path/to/ffmpeg');
mkdirSync(WORK, { recursive: true });
mkdirSync(OUT, { recursive: true });

const eur = (n) => `€${n.toLocaleString('en-IE')}`;
const R = FACTS.replan;
const D = FACTS.demo;
const K = FACTS.kpi;

const LOGO = `<svg viewBox="0 0 48 56" width="96" height="112"><path d="M0 24a24 24 0 0 1 48 0v32H0z" fill="#C4573D"/><path d="M15 31a9 9 0 0 1 18 0v25H15z" fill="#F7EEE7"/><circle cx="24" cy="42" r="2.6" fill="#C4573D"/></svg>`;

/** Title cards: [file, seconds, html]. Dark for the story, cream for the step titles. */
const CARDS = {
  open: [
    3.6,
    'dark',
    `<p class="eye">Settle In</p><h1>A project in ${D.city}.<br><span>${D.people} engineers. ${D.months} months.</span></h1><p class="sub">Where do they all live?</p>`,
  ],
  c1: [2.4, 'cream', `<p class="eye">1 · One brief</p><h1>HR pastes the email.<br><span>The AI reads it.</span></h1>`],
  c2: [2.4, 'cream', `<p class="eye">2 · Three plans</p><h1>Cost against commute.<br><span>A person approves.</span></h1>`],
  c3: [2.4, 'cream', `<p class="eye">3 · The project changes</p><h1>+${R.people} engineers from month ${R.fromMonth}.<br><span>Nobody moves.</span></h1>`],
  c4: [2.4, 'cream', `<p class="eye">4 · We run it</p><h1>Verified flats.<br>WhatsApp check-in.<br><span>One invoice.</span></h1>`],
  end: [
    4.2,
    'terra',
    `<div class="logo">${LOGO}<b>settle in</b></div><h1 class="tag">${FACTS.brand.tagline}</h1><p class="url">settle-in-app.netlify.app</p>`,
  ],
};

const CSS = `
*{margin:0;box-sizing:border-box}
body{width:${SIZE.width}px;height:${SIZE.height}px;display:flex;flex-direction:column;justify-content:center;padding:0 110px;font-family:'Avenir Next','Avenir','Helvetica Neue',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.dark{background:#2A2320;color:#F7EEE7}.cream{background:#F7EEE7;color:#2A2320}.terra{background:#C4573D;color:#F7EEE7;align-items:center;text-align:center}
.eye{font-weight:800;font-size:18px;letter-spacing:6px;text-transform:uppercase;color:#C4573D;margin-bottom:22px}
.dark .eye{color:#E9A08E}
h1{font-weight:800;font-size:66px;line-height:1.08;letter-spacing:-1.5px}
h1 span{color:#C4573D}.dark h1 span{color:#E9A08E}
.sub{margin-top:26px;font-size:30px;color:#BFB2AA}
.logo{display:flex;align-items:center;gap:22px}.logo svg path:first-child{fill:#F7EEE7}.logo svg path:nth-child(2){fill:#C4573D}.logo svg circle{fill:#F7EEE7}
.logo b{font-size:84px;font-weight:800;letter-spacing:-2px}
.tag{font-size:40px;font-weight:600;margin-top:26px;letter-spacing:-.5px}
.url{margin-top:40px;font-size:26px;font-weight:700;letter-spacing:1px;padding:12px 26px;border:2px solid rgba(247,238,231,.6);border-radius:40px}
`;

async function renderCards() {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1.5 });
  for (const [name, [, theme, html]] of Object.entries(CARDS)) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body class="${theme}">${html}</body></html>`);
    await page.screenshot({ path: `${WORK}/${name}.png` });
  }
  await browser.close();
}

const SUMMARY = {
  prep: async (p) => {
    await p.getByTestId('start-demo').click();
    await p.getByTestId('brief-summary').waitFor();
    for (let i = 0; i < 2; i++) await p.getByTestId('demo-next').click();
    await p.getByTestId('approve-plan').click();
  },
  route: '/client/summary',
  ready: async (p) => p.getByTestId('summary-revenue').waitFor(),
  scene: async (p, d) => {
    await d.park(1100, 600);
    await d.wait(500);
    await d.pointAt(p.getByTestId('summary-revenue'), 700);
    await d.wait(900);
    await d.pointAt(p.getByTestId('summary-ops'), 700);
    await d.wait(900);
    await d.pointAt(p.getByTestId('summary-invoices'), 700);
    await d.wait(900);
  },
};

function run(args) {
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
}
function duration(file) {
  const r = spawnSync(ffmpeg, ['-i', file], { encoding: 'utf8' });
  const m = r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

const server = await startServer();
try {
  console.log('model:', await warmUp());
  for (const name of Object.keys(CLIPS)) {
    if (!existsSync(`${OUT}/${name}.webm`)) {
      const { lead } = await recordClip(`${OUT}/${name}.webm`, CLIPS[name]);
      trim(ffmpeg, `${OUT}/${name}.webm`, lead);
    }
  }
  const { lead } = await recordClip(`${WORK}/5-summary.webm`, SUMMARY);
  trim(ffmpeg, `${WORK}/5-summary.webm`, lead);
  await renderCards();
} finally {
  server.kill();
}

// Timeline. Clips longer than their slot are cut at the end.
const clip = (f, max) => ({ file: f, len: Math.min(duration(f), max) });
const seq = [
  { card: 'open' },
  { card: 'c1' },
  clip(`${OUT}/1-brief.webm`, 10),
  { card: 'c2' },
  clip(`${OUT}/2-options.webm`, 10.5),
  { card: 'c3' },
  clip(`${OUT}/3-replan.webm`, 8.5),
  { card: 'c4' },
  clip(`${OUT}/4-ops.webm`, 10.5),
  clip(`${WORK}/5-summary.webm`, 5.5),
  { card: 'end' },
].map((s) => (s.card ? { file: `${WORK}/${s.card}.png`, len: CARDS[s.card][0], still: true } : s));

// Stretch or shrink the end card so the film lands on the target length.
const total = () => seq.reduce((t, s) => t + s.len, 0) - FADE * (seq.length - 1);
seq[seq.length - 1].len = Math.max(3, seq[seq.length - 1].len + (TARGET - total()));

// Normalise every segment to 1920×1080, 30 fps, H.264, then cross-fade them in one pass.
const parts = seq.map((s, i) => {
  const out = `${WORK}/seg${i}.mp4`;
  const input = s.still ? ['-loop', '1', '-t', s.len.toFixed(2), '-i', s.file] : ['-t', s.len.toFixed(2), '-i', s.file];
  run([...input, '-vf', 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p,setsar=1', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-an', out]);
  return { out, len: s.len };
});
let filter = '';
let last = '[0:v]';
let offset = 0;
parts.slice(1).forEach((p, i) => {
  offset += parts[i].len - FADE;
  const label = `[x${i}]`;
  filter += `${last}[${i + 1}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${label};`;
  last = label;
});
filter += `${last}fade=t=in:st=0:d=0.5,format=yuv420p[v]`;
const film = `${OUT}/settle-in-commercial.mp4`;
run([...parts.flatMap((p) => ['-i', p.out]), '-filter_complex', filter, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', '-an', film]);
console.log(`saved ${film}  ${duration(film).toFixed(1)} s`);
rmSync(WORK, { recursive: true, force: true });

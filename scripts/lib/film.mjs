// Shared helpers for the commercial recordings: a local server, a browser profile that keeps the
// language model cached, a visible cursor that moves slowly, and one video file per clip.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

// The page is laid out at 1280×720 and drawn at 1.5× so the video is a sharp 1920×1080 with readable text.
export const SIZE = { width: 1280, height: 720 };
export const VIDEO = { width: 1920, height: 1080 };
export const PORT = 4177;
export const BASE = `http://localhost:${PORT}/`;
/** Browser profile kept between runs so the 65 MB model is downloaded only once. */
const PROFILE = resolve('node_modules/.cache/settle-in-film-profile');

export async function startServer() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(BASE)).ok) return server;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  server.kill();
  throw new Error('preview server did not start');
}

// A large arrow that follows the real mouse events, plus a ring on every click.
const CURSOR = `
(() => {
  const add = () => {
    if (document.getElementById('film-cursor')) return;
    const c = document.createElement('div');
    c.id = 'film-cursor';
    c.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l15 11.5-6.6.9 3.9 7.4-2.9 1.4-3.8-7.5L4.6 20z" fill="#2A2320" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));transition:none';
    document.documentElement.appendChild(c);
    const st = document.createElement('style');
    st.textContent = '.film-ring{position:fixed;z-index:2147483646;pointer-events:none;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #C4573D;animation:filmring .55s ease-out forwards}@keyframes filmring{from{transform:scale(.3);opacity:.9}to{transform:scale(1.4);opacity:0}}*{cursor:none!important}';
    document.documentElement.appendChild(st);
    addEventListener('mousemove', (e) => (c.style.transform = 'translate(' + (e.clientX - 5) + 'px,' + (e.clientY - 3) + 'px)'), true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.className = 'film-ring';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 700);
    }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', add); else add();
})();`;

export async function openProfile({ record } = {}) {
  mkdirSync(PROFILE, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: process.env.HEADLESS === '1',
    viewport: SIZE,
    deviceScaleFactor: 1.5,
    ...(record ? { recordVideo: { dir: record, size: VIDEO } } : {}),
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [`--window-size=${SIZE.width},${SIZE.height + 90}`],
  });
  await ctx.addInitScript(CURSOR);
  return ctx;
}

/** Downloads the brief-reader model into the profile once (not recorded). */
export async function warmUp() {
  const ctx = await openProfile();
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(BASE);
  await page.waitForFunction(() => ['AI ready', 'Rules fallback'].includes(document.querySelector('[data-testid=ai-status]')?.textContent ?? ''), null, { timeout: 300_000 });
  const state = await page.getByTestId('ai-status').innerText();
  await ctx.close();
  return state;
}

/** Slow, eased mouse moves and clicks that the viewer can follow. */
export function director(page) {
  let at = { x: SIZE.width / 2, y: SIZE.height / 2 };
  const wait = (ms) => page.waitForTimeout(ms);
  async function moveTo(x, y, ms = 750) {
    const steps = Math.max(12, Math.round(ms / 16));
    const from = at;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await wait(ms / steps);
    }
    at = { x, y };
  }
  async function pointAt(locator, ms) {
    await locator.scrollIntoViewIfNeeded();
    const b = await locator.boundingBox();
    if (!b) throw new Error('element not visible');
    await moveTo(b.x + b.width / 2, b.y + b.height / 2, ms);
  }
  async function click(locator, ms) {
    await pointAt(locator, ms);
    await wait(160);
    await page.mouse.down();
    await wait(90);
    await page.mouse.up();
  }
  async function scrollTo(y, ms = 900) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y);
    await wait(ms);
  }
  async function park(x, y) {
    at = { x, y };
    await page.mouse.move(x, y);
  }
  return { wait, moveTo, pointAt, click, scrollTo, park };
}

export async function tilesLoaded(page) {
  await page
    .waitForFunction(() => {
      const t = [...document.querySelectorAll('.leaflet-tile')];
      return t.length > 0 && t.every((i) => i.classList.contains('leaflet-tile-loaded'));
    }, null, { timeout: 15_000 })
    .catch(() => {});
}

/**
 * Records one clip: `prep` runs in a page whose video is thrown away (it sets up the app state,
 * which persists in localStorage); `scene` runs in a fresh page whose video is kept as `out`.
 */
export async function recordClip(out, { prep, route, ready, scene }) {
  const tmp = resolve(`node_modules/.cache/film-tmp-${Date.now()}`);
  const ctx = await openProfile({ record: tmp });
  const prepPage = ctx.pages()[0] ?? (await ctx.newPage());
  await prepPage.goto(BASE);
  await prepPage.evaluate(() => localStorage.removeItem('settle-in-v12'));
  await prepPage.reload();
  if (prep) await prep(prepPage);
  const tCreate = Date.now();
  const page = await ctx.newPage();
  await page.goto(`${BASE}#${route}`);
  if (ready) await ready(page);
  await page.waitForTimeout(300);
  const t0 = Date.now();
  await scene(page, director(page));
  const seconds = (Date.now() - t0) / 1000;
  const lead = (t0 - tCreate) / 1000; // loading time at the start of the video, trimmed later
  const video = page.video();
  await prepPage.close();
  await page.close();
  await ctx.close();
  const path = await video.path();
  if (existsSync(out)) rmSync(out);
  renameSync(path, out);
  rmSync(tmp, { recursive: true, force: true });
  return { seconds, lead };
}

/** ffmpeg from FFMPEG=/path, or from PATH. null when missing (the raw clips are still saved). */
export function findFfmpeg() {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  for (const dir of (process.env.PATH ?? '').split(':')) if (existsSync(`${dir}/ffmpeg`)) return `${dir}/ffmpeg`;
  return null;
}

// Scene 1: HR at her desk, low-poly and minimal. The request arrives on her screen, line by line.
import * as THREE from 'three';
import { FACTS } from './data';

const CREAM = 0xf7eee7;
const INK = 0x2a2320;
const TERRA = 0xc4573d;
const SAND = 0xead9cc;

const EMAIL = [
  'From: Marta · Head of Mobility, Iberia Grid',
  'Subject: Housing for the Madrid data-centre team',
  '',
  `We won the fit-out. ${FACTS.demo.people} commissioning engineers`,
  `arrive in ${FACTS.demo.city} on 1 December, for ${FACTS.demo.months} months.`,
  'One apartment each, close to the site.',
  'Can we have a plan by Monday?',
];

export function createOffice(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1920, 1080, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CREAM);

  const camera = new THREE.PerspectiveCamera(30, 1920 / 1080, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dcd2, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  scene.add(sun);

  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 });
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(CREAM));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // Desk
  box(3.2, 0.08, 1.4, 0xfffdfb, 0, 1.0, 0);
  for (const [x, z] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) box(0.06, 1.0, 0.06, INK, x, 0.5, z);
  // Monitor with the email on it
  const screen = document.createElement('canvas');
  screen.width = 1024;
  screen.height = 600;
  const ctx = screen.getContext('2d')!;
  const tex = new THREE.CanvasTexture(screen);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  box(1.9, 1.15, 0.06, INK, 0, 1.75, -0.35);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.05), new THREE.MeshBasicMaterial({ map: tex }));
  panel.position.set(0, 1.75, -0.315);
  scene.add(panel);
  box(0.1, 0.4, 0.1, INK, 0, 1.22, -0.35);
  box(0.6, 0.03, 0.3, INK, 0, 1.05, -0.35);
  // Keyboard, mug, plant
  box(0.9, 0.03, 0.3, SAND, 0, 1.055, 0.2);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.2, 20), mat(TERRA));
  mug.position.set(1.0, 1.14, 0.1);
  mug.castShadow = true;
  scene.add(mug);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 16), mat(SAND));
  pot.position.set(-1.25, 1.19, -0.3);
  scene.add(pot);
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), mat(0x9fae8c));
  leaf.position.set(-1.25, 1.6, -0.3);
  leaf.castShadow = true;
  scene.add(leaf);
  // HR manager (seen from behind), simple shapes
  box(0.75, 0.08, 0.7, INK, -0.95, 0.62, 1.05); // seat
  box(0.75, 0.9, 0.08, INK, -0.95, 1.1, 1.4); // backrest
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 6, 16), mat(TERRA));
  body.position.set(-0.95, 1.2, 1.05);
  body.castShadow = true;
  scene.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), mat(0x5a4038));
  head.position.set(-0.95, 1.78, 1.02);
  head.castShadow = true;
  scene.add(head);

  // The monitor tells "before vs after": the request arrives (0–1.6 s), then what it used to mean —
  // 20 searches, 20 landlords, 20 contracts, 20 invoices piling up (1.6–4.4 s) — then everything
  // collapses into one Settle In brief (4.4–6.2 s).
  const TAGS = ['Search', 'Landlord', 'Contract', 'Invoice'];
  const font = (w: number, px: number) => `${w} ${px}px Avenir Next, Helvetica, sans-serif`;
  function drawScreen(t: number) {
    ctx.fillStyle = '#FFFDFB';
    ctx.fillRect(0, 0, 1024, 600);
    ctx.fillStyle = '#F2E9E1';
    ctx.fillRect(0, 0, 1024, 54);
    ctx.fillStyle = '#6E6059';
    ctx.font = font(700, 24);
    ctx.fillText(`New request · ${FACTS.demo.people} engineers · ${FACTS.demo.city} · ${FACTS.demo.months} months`, 26, 35);
    if (t > 0.4 && t < 1.8) {
      ctx.globalAlpha = Math.min(1, (t - 0.4) * 3);
      ctx.fillStyle = '#2A2320';
      ctx.font = font(500, 30);
      EMAIL.slice(3).forEach((line, i) => ctx.fillText(line, 40, 140 + i * 52));
      ctx.globalAlpha = 1;
    }
    const pile = Math.max(0, Math.min(1, (t - 1.6) / 2.4)); // cards appearing
    const merge = Math.max(0, Math.min(1, (t - 4.4) / 1.4)); // cards collapsing
    const me = merge < 0.5 ? 4 * merge ** 3 : 1 - (-2 * merge + 2) ** 3 / 2;
    const n = Math.floor(pile * 80);
    for (let i = 0; i < n && merge < 1; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10) % 4;
      const layer = Math.floor(i / 40);
      const x0 = 26 + col * 98 + layer * 14;
      const y0 = 78 + row * 118 + layer * 14;
      const x = x0 + (462 - x0) * me;
      const y = y0 + (300 - y0) * me;
      const sc = 1 - 0.9 * me;
      ctx.globalAlpha = 1 - me;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E2D6CC';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, 88 * sc, 104 * sc);
      ctx.strokeRect(x, y, 88 * sc, 104 * sc);
      ctx.fillStyle = '#E8DED5';
      ctx.fillRect(x + 6 * sc, y + 6 * sc, 76 * sc, 44 * sc);
      ctx.fillStyle = i % 4 === 1 ? '#C4573D' : '#9C8E87';
      ctx.font = font(700, Math.max(6, 14 * sc));
      ctx.fillText(`${TAGS[i % 4]} ${Math.floor(i / 4) + 1}`, x + 6 * sc, y + 72 * sc);
      ctx.fillStyle = '#E2D6CC';
      ctx.fillRect(x + 6 * sc, y + 82 * sc, 60 * sc, 6 * sc);
    }
    ctx.globalAlpha = 1;
    if (pile > 0.15 && merge < 0.4) {
      // the tally, in red
      ctx.globalAlpha = 1 - merge * 2.5;
      ctx.fillStyle = '#C4573D';
      ctx.fillRect(560, 6, 450, 42);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = font(800, 21);
      const k = Math.min(FACTS.demo.people, Math.ceil(pile * FACTS.demo.people));
      ctx.fillText(`${k} searches · ${k} landlords · ${k} contracts`, 574, 34);
      ctx.globalAlpha = 1;
    }
    if (merge > 0.35) {
      // one brief
      const a = Math.min(1, (merge - 0.35) / 0.4);
      ctx.globalAlpha = a;
      const w = 560 * (0.7 + 0.3 * a);
      const h = 300 * (0.7 + 0.3 * a);
      const x = 512 - w / 2;
      const y = 330 - h / 2;
      ctx.fillStyle = '#C4573D';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 22);
      ctx.fill();
      ctx.fillStyle = '#F7EEE7';
      ctx.font = font(800, 26 * a + 6);
      ctx.fillText('SETTLE IN', x + 36, y + 62);
      ctx.font = font(800, 52 * a + 8);
      ctx.fillText('One brief.', x + 36, y + 140);
      ctx.font = font(600, 26 * a + 6);
      ctx.fillText(`${FACTS.demo.people} engineers · ${FACTS.demo.city} · ${FACTS.demo.months} months`, x + 36, y + 200);
      ctx.globalAlpha = 1;
    }
    tex.needsUpdate = true;
  }

  /** t in seconds from the start of the scene (0–8.6). */
  function render(t: number) {
    const e = Math.min(1, t / 6.2);
    const ease = 1 - (1 - e) ** 3;
    // Dolly in over the shoulder; then (6.2–8.6 s) push straight into the screen — the transition to the map.
    const p = Math.max(0, Math.min(1, (t - 6.2) / 2.4));
    const pe = p * p * (3 - 2 * p);
    const cx = 3.0 - 1.4 * ease;
    const cy = 3.4 - 1.0 * ease;
    const cz = 5.6 - 2.4 * ease;
    camera.position.set(cx + (0 - cx) * pe, cy + (1.75 - cy) * pe, cz + (0.55 - cz) * pe);
    const lx = -0.55 + 0.25 * ease;
    const ly = 1.2 - 0.05 * ease;
    camera.lookAt(lx + (0 - lx) * pe, ly + (1.75 - ly) * pe, -0.2 + (-0.32 + 0.2) * pe);
    drawScreen(t);
    renderer.render(scene, camera);
  }
  return { render };
}

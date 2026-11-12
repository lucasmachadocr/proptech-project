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

  function drawScreen(chars: number, notify: number) {
    ctx.fillStyle = '#FFFDFB';
    ctx.fillRect(0, 0, 1024, 600);
    ctx.fillStyle = '#F2E9E1';
    ctx.fillRect(0, 0, 1024, 54);
    ctx.fillStyle = '#C4573D';
    ctx.font = '700 26px Avenir Next, Helvetica, sans-serif';
    ctx.fillText('Inbox', 28, 36);
    ctx.fillStyle = '#2A2320';
    let left = chars;
    EMAIL.forEach((line, i) => {
      const n = Math.max(0, Math.min(line.length, left));
      left -= line.length;
      ctx.font = i < 2 ? '600 25px Avenir Next, Helvetica, sans-serif' : '500 30px Avenir Next, Helvetica, sans-serif';
      ctx.fillStyle = i < 2 ? '#6E6059' : '#2A2320';
      ctx.fillText(line.slice(0, n), 40, 104 + i * (i < 2 ? 40 : 52) + (i >= 2 ? 30 : 0));
    });
    if (notify > 0) {
      ctx.globalAlpha = Math.min(1, notify);
      ctx.fillStyle = '#C4573D';
      ctx.beginPath();
      ctx.arc(980, 27, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    tex.needsUpdate = true;
  }

  const total = EMAIL.reduce((n, l) => n + l.length, 0);
  /** t in seconds from the start of the scene (0–8). */
  function render(t: number) {
    const e = Math.min(1, t / 8);
    const ease = 1 - (1 - e) ** 3;
    // Dolly in over the shoulder; the scene sits in the upper right, the caption in the lower left.
    camera.position.set(3.0 - 1.4 * ease, 3.4 - 1.0 * ease, 5.6 - 2.4 * ease);
    camera.lookAt(-0.55 + 0.25 * ease, 1.2 - 0.05 * ease, -0.2);
    drawScreen(Math.floor(Math.max(0, (t - 1.2) / 4.6) * total), t > 0.6 ? (t - 0.6) * 3 : 0);
    renderer.render(scene, camera);
  }
  return { render };
}

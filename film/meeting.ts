// Scene 1: where the demand is born. Iberia Grid's project meeting: the contract is won, and the team
// decides to send engineers to the site. Low-poly, minimal, same palette as the rest of the film.
import * as THREE from 'three';
import { FACTS } from './data';

const CREAM = 0xf7eee7;
const INK = 0x2a2320;
const TERRA = 0xc4573d;
const SAND = 0xead9cc;
const SKIN = [0x8a5a44, 0xc99576, 0x5a4038, 0xd8ab8c, 0x7a4b36, 0xb98263];

export function createMeeting(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1920, 1080, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CREAM);
  const camera = new THREE.PerspectiveCamera(32, 1920 / 1080, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dcd2, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(5, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  scene.add(sun);

  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  const add = (m: THREE.Mesh, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)), x, y, z);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(CREAM));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  box(14, 5, 0.2, 0xf2e8df, 0, 2.5, -3.2); // back wall
  // Table
  box(4.6, 0.1, 1.7, 0xfffdfb, 0, 1.0, 0);
  box(0.25, 1.0, 1.0, SAND, -1.6, 0.5, 0);
  box(0.25, 1.0, 1.0, SAND, 1.6, 0.5, 0);
  // Laptops and cups on the table
  for (const [x, z, r] of [[-1.3, -0.45, 0.2], [0.0, -0.45, 0], [1.3, -0.45, -0.2], [-0.7, 0.45, Math.PI], [0.7, 0.45, Math.PI]] as const) {
    const lid = box(0.42, 0.28, 0.02, INK, x, 1.2, z + (z < 0 ? -0.08 : 0.08));
    lid.rotation.y = r;
    box(0.42, 0.02, 0.3, 0x3a302b, x, 1.06, z);
  }
  // Wall screen with the project
  const screen = document.createElement('canvas');
  screen.width = 1280;
  screen.height = 720;
  const ctx = screen.getContext('2d')!;
  const tex = new THREE.CanvasTexture(screen);
  tex.colorSpace = THREE.SRGBColorSpace;
  box(3.3, 1.95, 0.08, INK, 0, 2.75, -3.05);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 1.8), new THREE.MeshBasicMaterial({ map: tex }));
  panel.position.set(0, 2.75, -3.0);
  scene.add(panel);

  // People: three each side, plus the project director standing by the screen
  const people: { head: THREE.Mesh; base: number; phase: number }[] = [];
  const person = (x: number, z: number, faceZ: number, shirt: number, skin: number, standing = false) => {
    const y = standing ? 1.15 : 0.95;
    if (!standing) box(0.55, 0.06, 0.55, INK, x, 0.55, z); // chair seat
    const body = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.24, standing ? 0.9 : 0.5, 6, 14), mat(shirt)), x, y, z);
    body.rotation.y = faceZ > 0 ? 0 : Math.PI;
    const headY = standing ? 2.02 : 1.55;
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), mat(skin)), x, headY, z);
    people.push({ head, base: headY, phase: x * 1.7 + z });
  };
  const shirts = [TERRA, 0x6e6059, 0xead9cc, 0x9fae8c, 0x2a2320, 0xe9a08e];
  [-1.4, 0, 1.4].forEach((x, i) => person(x, -1.05, 1, shirts[i], SKIN[i]));
  [-1.4, 0, 1.4].forEach((x, i) => person(x, 1.05, -1, shirts[i + 3], SKIN[i + 3]));
  person(2.25, -2.3, 1, TERRA, SKIN[0], true);

  const font = (w: number, px: number) => `${w} ${px}px Avenir Next, Helvetica, sans-serif`;
  function drawScreen(t: number) {
    ctx.fillStyle = '#FFFDFB';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#C4573D';
    ctx.fillRect(0, 0, 1280, 14);
    ctx.fillStyle = '#6E6059';
    ctx.font = font(700, 30);
    ctx.fillText('IBERIA GRID ENGINEERING · PROJECT KICK-OFF', 64, 84);
    const won = Math.min(1, Math.max(0, (t - 0.6) * 2));
    ctx.globalAlpha = won;
    ctx.fillStyle = '#2A2320';
    ctx.font = font(800, 76);
    ctx.fillText('Contract won ✓', 64, 200);
    ctx.font = font(600, 40);
    ctx.fillStyle = '#6E6059';
    ctx.fillText(`Data-centre fit-out · ${FACTS.demo.city}`, 64, 262);
    ctx.globalAlpha = 1;
    // Decision panel: the team to send
    const d = Math.min(1, Math.max(0, (t - 4.2) * 1.6));
    if (d > 0) {
      ctx.globalAlpha = d;
      ctx.fillStyle = '#C4573D';
      ctx.beginPath();
      ctx.roundRect(64, 330, 1152, 320, 24);
      ctx.fill();
      ctx.fillStyle = '#F7EEE7';
      ctx.font = font(800, 34);
      ctx.fillText('DECISION', 104, 400);
      ctx.font = font(800, 72);
      ctx.fillText(`Send ${FACTS.demo.people} engineers to the site`, 104, 494);
      ctx.font = font(600, 40);
      ctx.fillText(`From 1 December · ${FACTS.demo.months} months · San Fernando de Henares`, 104, 572);
      // a row of 20 small figures
      for (let i = 0; i < FACTS.demo.people; i++) {
        const show = Math.min(1, Math.max(0, (t - 4.6 - i * 0.06) * 4));
        ctx.globalAlpha = d * show;
        ctx.beginPath();
        ctx.arc(110 + i * 54, 618 - 2, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    tex.needsUpdate = true;
  }

  /** t in seconds from the start of the scene (0–9.6). */
  function render(t: number) {
    const e = Math.min(1, t / 9.6);
    const ease = 1 - (1 - e) ** 2;
    camera.position.set(-5.2 + 3.4 * ease, 4.6 - 1.2 * ease, 6.4 - 1.6 * ease);
    camera.lookAt(0.2, 1.7 + 0.3 * ease, -1.2);
    for (const p of people) p.head.position.y = p.base + Math.sin(t * 2.2 + p.phase) * 0.012 + (t > 4.4 && t < 5.4 ? Math.sin((t - 4.4) * Math.PI) * 0.04 : 0);
    drawScreen(t);
    renderer.render(scene, camera);
  }
  return { render };
}

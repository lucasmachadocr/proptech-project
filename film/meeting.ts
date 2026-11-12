// Scene 1: where the demand is born. Iberia Grid's project meeting: the contract is won, and the team
// decides to send engineers to the site. Low-poly, minimal, same palette as the rest of the film.
import * as THREE from 'three';
import { FACTS } from './data';
import { HAIRS, SKINS, createPerson, type Person } from './people';

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

  // People: three each side of the table, plus the project director standing by the screen
  const seated: { p: Person; x: number; z: number }[] = [];
  const shirts = [TERRA, 0x6e6059, 0xead9cc, 0x9fae8c, 0x2a2320, 0xe9a08e];
  [-1.4, 0, 1.4].forEach((x, i) => {
    box(0.55, 0.06, 0.55, INK, x, 0.55, -1.05);
    const p = createPerson({ shirt: shirts[i], skin: SKINS[i], hair: HAIRS[i], phase: i * 1.3 });
    p.group.position.set(x, 0, -1.05 - 0.05);
    scene.add(p.group);
    seated.push({ p, x, z: -1.05 });
  });
  [-1.4, 0, 1.4].forEach((x, i) => {
    box(0.55, 0.06, 0.55, INK, x, 0.55, 1.05);
    const p = createPerson({ shirt: shirts[i + 3], skin: SKINS[i + 3], hair: HAIRS[i + 3], phase: i * 0.9 + 2 });
    p.group.position.set(x, 0, 1.05 + 0.05);
    p.group.rotation.y = Math.PI;
    scene.add(p.group);
    seated.push({ p, x, z: 1.05 });
  });
  const director = createPerson({ shirt: TERRA, skin: SKINS[0], hair: HAIRS[4], seated: false, phase: 0.4 });
  director.group.position.set(2.15, 0, -2.25);
  director.group.rotation.y = -0.5;
  scene.add(director.group);

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
    const k = (a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
    const win = (a: number, b: number, f = 0.4) => Math.min(k(a, a + f), 1 - k(b - f, b));
    // The director points at the screen while the decision appears, then turns to the team.
    director.update(t, 'point', win(0.8, 6.2, 0.6), -0.6 + 0.9 * k(6, 7));
    seated.forEach(({ p, x, z }, i) => {
      // everyone looks at the screen, then at each other once the decision is on it
      // head yaw towards the screen (0, -3), in the person's own frame, limited to a natural turn
      const rot = z > 0 ? Math.PI : 0;
      let yaw = Math.atan2(0 - x, -3 - z) - rot;
      yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      const toScreen = Math.max(-0.95, Math.min(0.95, yaw));
      const toPeers = x === 0 ? 0.45 : -Math.sign(x) * 0.5 * (z > 0 ? -1 : 1);
      const look = toScreen + (toPeers - toScreen) * k(6.4 + i * 0.15, 7.2 + i * 0.15);
      // one engineer raises a hand ("I'll go"), another one nods, the rest type a note
      const gesture = i === 4 ? 'raise' : i === 1 ? 'type' : 'idle';
      const amount = i === 4 ? win(6.6, 8.8, 0.5) : 1;
      p.update(t, gesture, amount, look);
    });
    drawScreen(t);
    renderer.render(scene, camera);
  }
  return { render };
}

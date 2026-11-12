// Low-poly people for the film: a face (eyes, brows, hair), arms with hands, and small human motions
// (breathing, blinking, nodding, looking around) plus gestures keyed on the timeline (point, type, phone).
import * as THREE from 'three';

export type Gesture = 'idle' | 'point' | 'type' | 'phone' | 'raise' | 'shrug';

export interface Person {
  group: THREE.Group;
  /** t = seconds; gesture blends in with `amount` 0–1; look = yaw of the head in radians. */
  update: (t: number, gesture?: Gesture, amount?: number, look?: number) => void;
}

const mat = (c: number, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });

export function createPerson(opts: { shirt: number; skin: number; hair: number; seated?: boolean; scale?: number; phase?: number; trousers?: number }): Person {
  const { shirt, skin, hair, seated = true, scale = 1, phase = 0, trousers = 0x3a302b } = opts;
  const g = new THREE.Group();
  const shadow = <T extends THREE.Object3D>(o: T) => {
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) {
        (m as THREE.Mesh).castShadow = true;
        (m as THREE.Mesh).receiveShadow = true;
      }
    });
    return o;
  };
  const hipY = seated ? 0.62 : 0.95;
  // Legs
  if (seated) {
    for (const s of [-1, 1]) {
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 4, 10), mat(trousers));
      thigh.rotation.x = Math.PI / 2;
      thigh.position.set(s * 0.1, hipY, 0.2);
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.42, 4, 10), mat(trousers));
      shin.position.set(s * 0.1, hipY - 0.28, 0.42);
      g.add(thigh, shin);
    }
  } else {
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.8, 4, 10), mat(trousers));
      leg.position.set(s * 0.1, 0.5, 0);
      g.add(leg);
    }
  }
  // Torso (breathes)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), mat(shirt));
  torso.position.set(0, hipY + 0.33, 0);
  g.add(torso);
  // Neck + head pivot
  const headPivot = new THREE.Group();
  headPivot.position.set(0, hipY + 0.72, 0);
  g.add(headPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 10), mat(skin));
  neck.position.y = -0.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 22, 16), mat(skin, 0.7));
  head.scale.set(1, 1.12, 1);
  head.position.y = 0.12;
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.168, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hair));
  hairCap.position.y = 0.14;
  hairCap.rotation.x = -0.35;
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mat(0x1e1714, 0.4));
    eye.position.set(s * 0.058, 0.15, 0.142);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), mat(hair));
    brow.position.set(s * 0.058, 0.195, 0.145);
    brow.rotation.z = s * -0.12;
    eyes.push(eye);
    headPivot.add(eye, brow);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 8), mat(skin, 0.7));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.11, 0.165);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), mat(0x7a3b2e));
  mouth.position.set(0, 0.055, 0.15);
  headPivot.add(neck, head, hairCap, nose, mouth);
  // Arms: shoulder pivot → upper arm → elbow pivot → forearm → hand
  const arms = [-1, 1].map((s) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.25, hipY + 0.58, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 4, 10), mat(shirt));
    upper.position.y = -0.15;
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.22, 4, 10), mat(shirt));
    fore.position.y = -0.14;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(skin, 0.7));
    hand.position.y = -0.3;
    elbow.add(fore, hand);
    shoulder.add(upper, elbow);
    g.add(shoulder);
    return { s, shoulder, elbow };
  });
  g.scale.setScalar(scale);
  shadow(g);

  const pose = (a: (typeof arms)[number], sx: number, sz: number, ex: number) => {
    a.shoulder.rotation.set(sx, 0, sz);
    a.elbow.rotation.set(ex, 0, 0);
  };
  const lerp = (x: number, y: number, k: number) => x + (y - x) * k;

  function update(t: number, gesture: Gesture = 'idle', amount = 1, look = 0) {
    const tt = t + phase;
    // breathing and a light sway
    torso.scale.y = 1 + Math.sin(tt * 1.6) * 0.015;
    g.rotation.z = Math.sin(tt * 0.7) * 0.01;
    // head: look + small nods, blink every ~3 s
    headPivot.rotation.y = look + Math.sin(tt * 0.45) * 0.12;
    headPivot.rotation.x = Math.sin(tt * 1.3) * 0.04 + (gesture === 'shrug' ? -0.12 * amount : 0);
    const blink = (tt % 3.1) < 0.12 ? 0.15 : 1;
    eyes.forEach((e) => (e.scale.y = blink));
    // arms: resting pose (hands on the table / by the sides) blended with the gesture
    const rest = seated ? { sx: -0.9, sz: 0.12, ex: -0.9 } : { sx: 0.05, sz: 0.1, ex: -0.15 };
    for (const a of arms) {
      let sx = rest.sx;
      let sz = rest.sz * a.s;
      let ex = rest.ex;
      const k = amount;
      if (gesture === 'type') {
        sx = rest.sx;
        ex = rest.ex + Math.sin(tt * 18 + a.s) * 0.08;
      }
      if (gesture === 'point' && a.s === 1) {
        sx = lerp(rest.sx, -1.55, k);
        sz = lerp(rest.sz, 0.35, k);
        ex = lerp(rest.ex, -0.1, k);
      }
      if (gesture === 'raise' && a.s === 1) {
        sx = lerp(rest.sx, -2.6, k);
        ex = lerp(rest.ex, -0.3, k);
      }
      if (gesture === 'phone' && a.s === 1) {
        sx = lerp(rest.sx, -0.55, k);
        sz = lerp(rest.sz, -0.25, k);
        ex = lerp(rest.ex, -2.3, k);
      }
      if (gesture === 'shrug') {
        sx = lerp(rest.sx, -0.6, k);
        sz = lerp(rest.sz * a.s, 0.55 * a.s, k);
        ex = lerp(rest.ex, -1.6, k);
      }
      pose(a, sx, sz, ex);
    }
  }
  update(0);
  return { group: g, update };
}

export const SKINS = [0x8a5a44, 0xc99576, 0x5a4038, 0xd8ab8c, 0x7a4b36, 0xb98263];
export const HAIRS = [0x2a1d17, 0x4a3326, 0x1a1412, 0x8a6a4a, 0x2a2320, 0x6a4a32];

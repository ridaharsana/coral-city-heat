// CORAL CITY HEAT — vehicles.js: bezier-extruded cars, arcade physics and lane traffic.
// Bodies are side profiles drawn with THREE.Shape curves (wedge nose, sloped windshield,
// fastback roof, diffuser tail) and extruded with a bevel — never stacked boxes — then painted
// in clearcoat MeshPhysicalMaterial. Wheels are 5-spoke alloys in real tyres, sheriff
// Interceptors are white with strobing lightbars, and traffic follows the avenue/street grid.
import * as THREE from 'three';
import { TUNING } from './config.js';

export const VEHICLE_CATALOG = {
  vesper: { name: 'Vesper GT', topSpeed: 52, accel: 31, width: 1.86, length: 4.7, color: 0xff2e88 },
  sedan: { name: 'Marlin Sedan', topSpeed: 39, accel: 23, width: 1.82, length: 4.5, color: 0xb8bcc4 },
  taxi: { name: 'Coral Cab', topSpeed: 39, accel: 23, width: 1.82, length: 4.5, color: 0xf2b821 },
  marlin: { name: 'Marlin Pickup', topSpeed: 37, accel: 22, width: 1.9, length: 5.0, color: 0x37507a },
  interceptor: { name: 'Marisol Sheriff Interceptor', topSpeed: 50, accel: 29, width: 1.88, length: 4.8, color: 0xf2f4f6 },
};

const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0f16, metalness: 0.9, roughness: 0.1, envMapIntensity: 1.05 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.6, metalness: 0.4 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.25, metalness: 1 });
const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.92, metalness: 0 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.32, metalness: 0.95 });
const archMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0c });
const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff6da });

function glowSprite(color, scale, opacity) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(scale, scale, 1);
  return s;
}
function sheriffDoorTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = '#ffb800'; g.beginPath(); g.arc(28, 32, 15, 0, 7); g.fill();
  g.fillStyle = '#16233c'; g.font = '900 30px Arial'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('SHERIFF', 52, 33);
  return new THREE.CanvasTexture(c);
}

// side-profile silhouette per type: [body outline, glasshouse outline] in (length, height)
function profiles(type) {
  const S = (pts) => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); return s; };
  const QC = (s, cx, cy, x, y) => { s.quadraticCurveTo(cx, cy, x, y); return s; };
  let body, glass, roofPanel = false;
  if (type === 'vesper') {
    body = S([[-2.35, 0.30], [-2.38, 0.72]]); QC(body, -2.32, 0.88, -1.9, 0.89); body.lineTo(-1.1, 0.87);
    QC(body, 0.3, 0.84, 1.5, 0.70); QC(body, 2.28, 0.62, 2.36, 0.42); body.lineTo(2.3, 0.24); body.lineTo(-2.28, 0.22); body.closePath();
    glass = S([[1.08, 0.82]]); QC(glass, 0.55, 1.13, -0.28, 1.14); QC(glass, -1.2, 1.10, -1.78, 0.87); glass.lineTo(-1.78, 0.80); glass.lineTo(1.08, 0.80); glass.closePath();
  } else if (type === 'marlin') {
    body = S([[-2.5, 0.34], [-2.52, 0.94], [-0.1, 0.94], [0.1, 0.88], [1.2, 0.86]]);
    QC(body, 2.1, 0.82, 2.48, 0.55); body.lineTo(2.44, 0.3); body.lineTo(-2.44, 0.26); body.closePath();
    glass = S([[1.18, 0.86]]); QC(glass, 0.95, 1.24, 0.42, 1.28); glass.lineTo(0.08, 1.28); glass.lineTo(0.02, 0.86); glass.closePath();
    roofPanel = true;
  } else { // sedan / taxi / interceptor
    const L = type === 'interceptor' ? 2.42 : 2.26, nose = type === 'interceptor' ? 0.86 : 0.80;
    body = S([[-L, 0.3], [-L - 0.02, 0.78], [-1.6, 0.84], [-0.6, 0.84]]);
    QC(body, 0.6, 0.84, 1.6, nose - 0.1); QC(body, L + 0.06, nose - 0.2, L + 0.04, 0.44);
    body.lineTo(L - 0.04, 0.24); body.lineTo(-L + 0.04, 0.22); body.closePath();
    glass = S([[1.0, 0.82]]); QC(glass, 0.62, 1.1, -0.18, 1.12); QC(glass, -0.95, 1.1, -1.5, 0.85);
    glass.lineTo(-1.5, 0.80); glass.lineTo(1.0, 0.80); glass.closePath();
    roofPanel = true;
  }
  return { body, glass, roofPanel };
}
function extrudeProfile(shape, width) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.07, bevelSegments: 3, steps: 1, curveSegments: 14 });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2); // profile +x (nose) -> +z forward, width -> x
  return geo;
}

const tyreGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.27, 22); tyreGeo.rotateZ(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.215, 0.215, 0.285, 14); rimGeo.rotateZ(Math.PI / 2);
const spokeGeo = new THREE.BoxGeometry(0.29, 0.36, 0.07);
function buildWheel() {
  const yaw = new THREE.Group(), spin = new THREE.Group();
  yaw.add(spin);
  const tyre = new THREE.Mesh(tyreGeo, tyreMat); tyre.castShadow = true; spin.add(tyre);
  const rim = new THREE.Mesh(rimGeo, rimMat); spin.add(rim);
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(spokeGeo, rimMat);
    sp.rotation.x = (i / 5) * Math.PI * 2; spin.add(sp);
  }
  return { yaw, spin };
}

export function createDetailedVehicleMesh(type, color) {
  const spec = VEHICLE_CATALOG[type] || VEHICLE_CATALOG.sedan;
  const grp = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: color ?? spec.color, metalness: 0.85, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.45 });
  const { body, glass, roofPanel } = profiles(type);
  const W = spec.width - 0.18, L = spec.length;
  const bodyMesh = new THREE.Mesh(extrudeProfile(body, W), paint);
  bodyMesh.castShadow = true; bodyMesh.receiveShadow = true; grp.add(bodyMesh);
  const glassMesh = new THREE.Mesh(extrudeProfile(glass, W - 0.34), glassMat);
  glassMesh.castShadow = true; grp.add(glassMesh);
  if (roofPanel) {
    const rp = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.055, 1.55), paint);
    rp.position.set(0, type === 'marlin' ? 1.29 : 1.13, type === 'marlin' ? 0.72 : 0.18); rp.castShadow = true; grp.add(rp);
  }
  // wheel arches + wheels
  const archGeo = new THREE.CircleGeometry(0.47, 18);
  const wheels = [];
  for (const [sx, sz, front] of [[-1, 1, true], [1, 1, true], [-1, -1, false], [1, -1, false]]) {
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(sx * (W / 2 + 0.085), 0.37, sz * L * 0.315);
    arch.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    grp.add(arch);
    const w = buildWheel();
    w.yaw.position.set(sx * (W / 2 + 0.02), 0.37, sz * L * 0.315);
    grp.add(w.yaw);
    wheels.push({ yaw: w.yaw, spin: w.spin, front: !!front });
  }
  // face: grille, bumper, headlight lenses + beams + ground glow
  const grille = new THREE.Mesh(new THREE.BoxGeometry(W * 0.55, 0.15, 0.05), trimMat);
  grille.position.set(0, 0.46, L / 2 + 0.05); grp.add(grille);
  for (const e of [-1, 1]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.17, 0.13), trimMat);
    bumper.position.set(0, 0.3, e * (L / 2 + 0.03)); grp.add(bumper);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lensMat);
    lens.scale.set(1.5, 0.8, 0.5); lens.position.set(e * W * 0.32, 0.63, L / 2 + 0.05); grp.add(lens);
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8), chromeMat);
    exh.rotation.x = Math.PI / 2; exh.position.set(e * W * 0.28, 0.3, -L / 2 - 0.08); grp.add(exh);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.17), paint);
    mirror.position.set(e * (W / 2 + 0.13), 0.98, L * 0.16); grp.add(mirror);
  }
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.085, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beamGeo = new THREE.ConeGeometry(0.95, 8, 14, 1, true); beamGeo.translate(0, -4, 0); beamGeo.rotateX(-Math.PI / 2);
  for (const e of [-1, 1]) {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(e * W * 0.32, 0.62, L / 2 + 0.08); beam.rotation.x = 0.05; grp.add(beam);
  }
  const groundGlow = new THREE.Mesh(new THREE.CircleGeometry(1.7, 16), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }));
  groundGlow.rotation.x = -Math.PI / 2; groundGlow.position.set(0, 0.05, L / 2 + 3.1); grp.add(groundGlow);
  // tail: LED strip + brake glow
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2233 });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(W * 0.74, 0.09, 0.05), tailMat);
  tail.position.set(0, 0.76, -L / 2 - 0.05); grp.add(tail);
  const brakeGlow = glowSprite(0xff2a3a, 2.4, 0.22); brakeGlow.position.set(0, 0.72, -L / 2 - 0.35); grp.add(brakeGlow);
  const ud = { wheels, tailMat, brakeGlow };
  if (type === 'vesper') {
    for (const e of [-1, 1]) {
      const sup = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.3), trimMat);
      sup.position.set(e * 0.55, 0.94, -L / 2 + 0.32); sup.rotation.x = 0.25; grp.add(sup);
    }
    const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.055, 0.44), paint);
    wing.position.set(0, 1.06, -L / 2 + 0.3); wing.rotation.x = -0.1; wing.castShadow = true; grp.add(wing);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.9), new THREE.MeshBasicMaterial({ map: brakeGlow.material.map, color: 0xff2e88, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
    under.rotation.x = -Math.PI / 2; under.position.y = 0.04; grp.add(under);
  }
  if (type === 'marlin') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(W - 0.24, 0.09, 2.1), trimMat);
    bed.position.set(0, 0.93, -1.32); grp.add(bed);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.32), new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    sign.position.set(0, 1.26, 0.18); grp.add(sign);
  }
  if (type === 'interceptor') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.36), trimMat);
    bar.position.set(0, 1.17, 0.18); grp.add(bar);
    const mkDome = (emissive, x) => {
      const m = new THREE.MeshStandardMaterial({ color: 0x1a0505, emissive, emissiveIntensity: 0.15, roughness: 0.3 });
      const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 4, 8), m);
      d.rotation.z = Math.PI / 2; d.position.set(x, 1.26, 0.18); grp.add(d); return m;
    };
    const red = mkDome(0xff1a2e, -0.3), blue = mkDome(0x1a4dff, 0.3);
    const redGlow = glowSprite(0xff1a2e, 3.0, 0); redGlow.position.set(-0.3, 1.3, 0.18); grp.add(redGlow);
    const blueGlow = glowSprite(0x2a6bff, 3.0, 0); blueGlow.position.set(0.3, 1.3, 0.18); grp.add(blueGlow);
    const push = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.4, 0.1), trimMat);
    push.position.set(0, 0.42, L / 2 + 0.14); grp.add(push);
    const doorT = sheriffDoorTex();
    for (const e of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 1.9), trimMat);
      stripe.position.set(e * (W / 2 + 0.095), 0.6, -0.15); grp.add(stripe);
      const dt2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: doorT, transparent: true }));
      dt2.position.set(e * (W / 2 + 0.115), 0.68, 0.62); dt2.rotation.y = e * Math.PI / 2; grp.add(dt2);
    }
    ud.strobe = { red, blue, redGlow: redGlow.material, blueGlow: blueGlow.material, phase: Math.random() * 6 };
  }
  grp.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  grp.userData = ud;
  return grp;
}

export function createVehicle(scene, type, x, z, heading, color) {
  const spec = VEHICLE_CATALOG[type] || VEHICLE_CATALOG.sedan;
  const mesh = createDetailedVehicleMesh(type, color);
  mesh.position.set(x, 0, z);
  mesh.rotation.order = 'YXZ';
  mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, type, spec, heading, speed: 0, steerVis: 0, crashed: 0, drifting: false, nitro: 1, nitroOn: false, isCop: type === 'interceptor', stolen: false };
}

export function updateVehicleArcadePhysics(v, input, dt, world) {
  const spec = v.spec;
  v.nitroOn = !!(input.nitro && v.nitro > 0.02 && input.throttle > 0);
  v.nitro = THREE.MathUtils.clamp(v.nitro + (v.nitroOn ? -dt / TUNING.nitroSeconds : dt * 0.045), 0, 1);
  if (input.throttle > 0) v.speed += spec.accel * (v.nitroOn ? TUNING.nitroBoost : 1) * input.throttle * dt;
  else if (input.throttle < 0) v.speed += (v.speed > 1 ? -TUNING.carBrake : -11) * dt;
  else v.speed -= v.speed * Math.min(1, TUNING.carDrag * dt);
  if (input.handbrake) v.speed -= v.speed * 1.5 * dt;
  const top = spec.topSpeed * (v.nitroOn ? 1.22 : 1);
  v.speed = THREE.MathUtils.clamp(v.speed, -14, top);
  if (Math.abs(v.speed) < 0.04 && input.throttle === 0) v.speed = 0;
  const spd = Math.abs(v.speed);
  const steerTarget = (input.steer || 0) * (0.62 / (1 + spd * 0.05));
  v.steerVis += (steerTarget - v.steerVis) * Math.min(1, dt * 8);
  v.drifting = !!input.handbrake && spd > 12;
  const turnAuthority = (spd / (spd + 7)) * (v.drifting ? 2.5 : 1.85);
  v.heading += v.steerVis * turnAuthority * dt * Math.sign(v.speed || 1) * (v.drifting ? 0.8 : 1);
  let nx = v.mesh.position.x + Math.sin(v.heading) * v.speed * dt;
  let nz = v.mesh.position.z + Math.cos(v.heading) * v.speed * dt;
  const res = world.resolve(nx, nz, 1.55);
  nx = res[0]; nz = res[1];
  const moved = Math.hypot(nx - v.mesh.position.x, nz - v.mesh.position.z);
  if (Math.abs(v.speed * dt) - moved > 0.32 && spd > 7) { v.crashed = spd; v.speed *= 0.16; }
  else v.crashed = Math.max(0, v.crashed - dt * 30);
  v.mesh.position.x = nx; v.mesh.position.z = nz;
  v.mesh.rotation.set(
    THREE.MathUtils.clamp(-(input.throttle || 0) * 0.012, -0.02, 0.02),
    v.heading,
    THREE.MathUtils.clamp(-v.steerVis * spd * 0.0035, -0.06, 0.06));
  const ud = v.mesh.userData;
  if (ud.wheels) for (const w of ud.wheels) { w.spin.rotation.x += v.speed * dt / 0.37; if (w.front) w.yaw.rotation.y = v.steerVis * 0.55; }
  if (ud.brakeGlow) ud.brakeGlow.material.opacity = (input.throttle < 0 || input.handbrake) ? 0.85 : 0.22;
}

/* ---------------- traffic: lane-following on the grid ---------------- */
const AVENUES_T = [-490, -355, -220, -85, 50, 185, 320, 455];
const STREETS_T = [-490, -355, -220, -85, 50, 185, 320, 400];
export function createTraffic(scene, world, rng, count = 15) {
  const cars = [];
  const types = ['sedan', 'sedan', 'taxi', 'marlin', 'sedan', 'vesper', 'sedan', 'taxi'];
  const colors = [0xb8bcc4, 0x37507a, 0x74303a, 0x2e5e46, 0xc7a23a, 0x22262e, 0x7a4a8a, 0xd8d5cc];
  function spawn(v, nearPos) {
    const onAvenue = rng.chance(0.55);
    v.ai = {
      axis: onAvenue ? 'x' : 'z',
      line: onAvenue ? rng.pick(AVENUES_T) : rng.pick(STREETS_T),
      dir: rng.sign(), cruise: rng.range(9.5, 15), speed: 0,
    };
    v.ai.speed = v.ai.cruise;
    const along = nearPos ? (onAvenue ? nearPos.x : nearPos.z) + rng.range(150, 420) * rng.sign() : rng.range(-480, 480);
    place(v, along);
  }
  function place(v, along) {
    const a = v.ai, off = 4.3;
    if (a.axis === 'x') {
      const max = a.line === 50 ? 1115 : 448, t = THREE.MathUtils.clamp(along, -548, max);
      v.mesh.position.set(t, 0, a.line + (a.dir > 0 ? -off : off));
      v.heading = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const t = THREE.MathUtils.clamp(along, -548, 548);
      v.mesh.position.set(a.line + (a.dir > 0 ? off : -off), 0, t);
      v.heading = a.dir > 0 ? 0 : Math.PI;
    }
    v.mesh.rotation.y = v.heading;
  }
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const v = createVehicle(scene, type, 0, 0, 0, type === 'taxi' ? 0xf2b821 : colors[i % colors.length]);
    spawn(v, null);
    cars.push(v);
  }
  function update(dt, playerPos) {
    for (const v of cars) {
      if (v.stolen) continue;
      const a = v.ai, p = v.mesh.position;
      if (playerPos && p.distanceTo(playerPos) > 780) { spawn(v, playerPos); continue; }
      // follow the car ahead in the same lane
      let target = a.cruise;
      for (const o of cars) {
        if (o === v || o.stolen || !o.ai || o.ai.axis !== a.axis || o.ai.line !== a.line || o.ai.dir !== a.dir) continue;
        const gap = a.axis === 'x' ? (o.mesh.position.x - p.x) * a.dir : (o.mesh.position.z - p.z) * a.dir;
        if (gap > 0 && gap < 11) target = Math.min(target, o.ai.speed * (gap < 6 ? 0.4 : 0.9));
      }
      if (playerPos) {
        const gap = a.axis === 'x' ? (playerPos.x - p.x) * a.dir : (playerPos.z - p.z) * a.dir;
        const lat = a.axis === 'x' ? Math.abs(playerPos.z - p.z) : Math.abs(playerPos.x - p.x);
        if (gap > 0 && gap < 10 && lat < 3.4) target = Math.min(target, 2);
      }
      a.speed += THREE.MathUtils.clamp(target - a.speed, -22 * dt, 9 * dt);
      const stepLen = a.speed * dt;
      if (a.axis === 'x') p.x += stepLen * a.dir; else p.z += stepLen * a.dir;
      // turning at intersections + forced turns at the shore / world edge
      const cross = a.axis === 'x' ? STREETS_T : AVENUES_T;
      const coord = a.axis === 'x' ? p.x : p.z;
      for (const c of cross) {
        if (Math.abs(coord - c) < Math.max(1.2, stepLen) && rng.chance(0.30)) {
          const from = a.line;
          a.axis = a.axis === 'x' ? 'z' : 'x'; a.line = c; a.dir = rng.sign();
          if (a.axis === 'z') { p.z = from + (a.dir > 0 ? 0 : 0); p.x = c + (a.dir > 0 ? 4.3 : -4.3); p.z = from; }
          else { p.x = from; p.z = c + (a.dir > 0 ? -4.3 : 4.3); }
          v.heading = a.axis === 'x' ? (a.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (a.dir > 0 ? 0 : Math.PI);
          break;
        }
      }
      const lim = a.axis === 'x' ? (a.line === 50 ? [ -552, 1118 ] : [-552, 452]) : [-552, 552];
      const cc = a.axis === 'x' ? p.x : p.z;
      if (cc < lim[0] + 4 || cc > lim[1] - 4) { a.dir *= -1; v.heading += Math.PI; place(v, cc); a.dir = v.ai.dir; }
      const res = world.resolve(p.x, p.z, 1.55);
      p.x = res[0]; p.z = res[1];
      v.mesh.rotation.y = v.heading;
      v.speed = a.speed;
      const ud = v.mesh.userData;
      if (ud.wheels) for (const w of ud.wheels) w.spin.rotation.x += a.speed * dt / 0.37;
      if (ud.brakeGlow) ud.brakeGlow.material.opacity = a.speed < a.cruise - 1 ? 0.8 : 0.22;
    }
  }
  return { cars, update };
}

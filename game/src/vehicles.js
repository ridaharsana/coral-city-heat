// Vehicles: the catalog, procedural meshes built from EXTRUDED side silhouettes (sloped
// hood, curved roofline, tapered tail — no stacked boxes), a separate glasshouse extrusion,
// hubcapped wheels, mirrors, grille/bumpers, emissive headlight lenses with light cones and
// a full-width taillight bar, GT spoiler and sheriff lightbar, arcade physics with drift and
// building collision, and the lane-following traffic system that shares the road graph with
// the minimap. Traffic cars brake for each other and for the player; the player's car is the
// same state object driven by input instead of a lane.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { AVENUES, STREETS, ROAD_HALF } from './world.js';

export const VEHICLE_CATALOG = {
  vesper: { name: 'Vesper GT', topSpeed: 52, accel: 30, grip: 8.2, colors: [0xff2e88, 0x37e0ff, 0xffb347, 0xe8e8f0], len: 4.6, wid: 2.0 },
  interceptor: { name: 'Interceptor', topSpeed: 47, accel: 27, grip: 7.6, colors: [0xf0f2f5], len: 4.9, wid: 2.1 },
  marlin: { name: 'Marlin Pickup', topSpeed: 38, accel: 22, grip: 6.8, colors: [0x7a4a2f, 0x4a6741, 0x5a5f6e], len: 5.2, wid: 2.2 },
  sedan: { name: 'City Sedan', topSpeed: 34, accel: 19, grip: 7.0, colors: [0xb83a2f, 0x2f7fb8, 0xc7c9ce, 0x3f9e4d, 0x7158a8, 0xc7a23a], len: 4.5, wid: 1.95 },
  taxi: { name: 'Coral Cab', topSpeed: 34, accel: 19, grip: 7.0, colors: [0xffc21f], len: 4.5, wid: 1.95 },
};

// --- silhouette profiles: [x along length (front +), y up], drawn as smooth shapes
function profileShape(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], prev = pts[i - 1];
    if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]); // [cx, cy, x, y]
    else s.lineTo(p[0], p[1]);
    void prev;
  }
  s.closePath();
  return s;
}
const PROFILES = {
  vesper: {
    body: [[-2.3, 0.3], [-2.34, 0.72], [-2.05, 0.9, -1.55, 0.94], [-1.1, 0.96], [-0.45, 1.24, 0.15, 1.2], [0.72, 1.02, 1.2, 0.8], [2.02, 0.7], [2.3, 0.52, 2.32, 0.42], [2.3, 0.3]],
    glass: [[-1.02, 0.95], [-0.42, 1.17, 0.08, 1.16], [0.52, 1.0, 0.92, 0.84], [0.62, 0.83], [-0.72, 0.9]],
  },
  sedan: {
    body: [[-2.25, 0.3], [-2.28, 0.85], [-1.95, 0.98, -1.5, 1.0], [-0.95, 1.02], [-0.5, 1.34, 0.28, 1.33], [0.85, 1.1, 1.25, 0.86], [2.0, 0.8], [2.26, 0.6, 2.27, 0.44], [2.25, 0.3]],
    glass: [[-0.88, 1.0], [-0.42, 1.28, 0.22, 1.27], [0.62, 1.08, 1.05, 0.88], [0.8, 0.87], [-0.6, 0.95]],
  },
  interceptor: {
    body: [[-2.45, 0.3], [-2.48, 0.9], [-2.1, 1.04, -1.6, 1.06], [-1.0, 1.08], [-0.52, 1.4, 0.3, 1.39], [0.9, 1.14, 1.35, 0.9], [2.15, 0.84], [2.46, 0.62, 2.47, 0.44], [2.45, 0.3]],
    glass: [[-0.92, 1.06], [-0.44, 1.34, 0.24, 1.33], [0.66, 1.12, 1.12, 0.92], [0.86, 0.91], [-0.62, 1.0]],
  },
  marlin: {
    body: [[-2.6, 0.32], [-2.62, 1.0], [-0.35, 1.04], [-0.28, 1.5], [0.72, 1.52], [1.15, 1.06, 1.7, 0.92], [2.42, 0.86], [2.6, 0.6, 2.6, 0.44], [2.58, 0.32]],
    glass: [[-0.18, 1.08], [-0.14, 1.46], [0.66, 1.46], [1.02, 1.1, 1.3, 0.98], [0.4, 0.98]],
  },
};
PROFILES.taxi = PROFILES.sedan;

const geoCache = new Map();
function extrude(shape, depth) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.05, bevelSegments: 2, curveSegments: 10,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}
function bodyGeo(type, kind) {
  const k = `${type}|${kind}`;
  if (!geoCache.has(k)) {
    const spec = VEHICLE_CATALOG[type];
    const depth = kind === 'glass' ? spec.wid * 0.8 : spec.wid - 0.14;
    geoCache.set(k, extrude(profileShape(PROFILES[type][kind]), depth));
  }
  return geoCache.get(k);
}
function part(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m;
}
function boxGeo(w, h, d) {
  const k = `b${w}|${h}|${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}
function coneGeo() { // headlight beam: apex at the lamp, opening forward (+x)
  if (!geoCache.has('beam')) {
    const geo = new THREE.ConeGeometry(0.72, 5.2, 12, 1, true); geo.rotateZ(Math.PI / 2); geo.translate(2.6, 0, 0);
    geoCache.set('beam', geo);
  }
  return geoCache.get('beam');
}
function beamFadeTexture() { // alpha gradient along the beam: solid at the lamp, gone at the tip
  if (!geoCache.has('beamFade')) {
    const c = document.createElement('canvas'); c.width = 1; c.height = 64;
    const g = c.getContext('2d'); const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#5a5a5a'); grad.addColorStop(1, '#000000');
    g.fillStyle = grad; g.fillRect(0, 0, 1, 64);
    geoCache.set('beamFade', new THREE.CanvasTexture(c));
  }
  return geoCache.get('beamFade');
}

export function createDetailedVehicleMesh(type) {
  const spec = VEHICLE_CATALOG[type];
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.55 });
  if (type === 'interceptor') { // sheriff white must READ white under a warm dusk sun:
    paint.roughness = 0.42; paint.metalness = 0.18; paint.emissive = new THREE.Color(0x15171c);
  }
  const dark = new THREE.MeshLambertMaterial({ color: 0x15171c });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.25, metalness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x18242f, roughness: 0.1, metalness: 0.85 });
  const L = spec.len, W = spec.wid;
  const body = part(bodyGeo(type, 'body'), paint, 0, 0, 0); g.add(body);
  const cabin = part(bodyGeo(type, 'glass'), glass, 0, 0.02, 0); g.add(cabin);
  // grille, bumpers, door cutline
  g.add(part(boxGeo(0.07, 0.17, W * 0.52), dark, L / 2 + 0.03, 0.5, 0));
  g.add(part(boxGeo(0.16, 0.15, W * 0.97), dark, L / 2 + 0.01, 0.34, 0));
  g.add(part(boxGeo(0.16, 0.15, W * 0.97), dark, -L / 2 - 0.01, 0.34, 0));
  for (const s of [-1, 1]) g.add(part(boxGeo(L * 0.72, 0.035, 0.02), dark, -L * 0.02, 0.56, s * (W / 2 + 0.005)));
  // mirrors on stalks
  for (const s of [-1, 1]) {
    g.add(part(boxGeo(0.16, 0.03, 0.03), dark, L * 0.17, 1.0, s * (W / 2 + 0.05)));
    const mir = part(new THREE.SphereGeometry(0.085, 8, 6), chrome, L * 0.17, 1.03, s * (W / 2 + 0.13)); mir.scale.set(1, 0.75, 0.45); g.add(mir);
  }
  // wheels: tyre + lighter hubcap disc that spins with it
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14); wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.33, 10); hubGeo.rotateX(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0b0b0d });
  const wheels = [];
  for (const [wx, wz] of [[L * 0.32, W / 2 - 0.08], [L * 0.32, -W / 2 + 0.08], [-L * 0.32, W / 2 - 0.08], [-L * 0.32, -W / 2 + 0.08]]) {
    const w = part(wheelGeo, wheelMat, wx, 0.42, wz);
    const hub = new THREE.Mesh(hubGeo, chrome); w.add(hub);
    g.add(w); wheels.push(w);
  }
  // headlight lenses + beams, full-width taillight bar (brake material)
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff2233 });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0.5, alphaMap: beamFadeTexture(), blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (const s of [-1, 1]) {
    const lens = part(new THREE.CylinderGeometry(0.095, 0.095, 0.07, 10), headMat, L / 2 + 0.04, 0.64, s * W * 0.31);
    lens.rotation.z = Math.PI / 2; lens.castShadow = false; g.add(lens);
    const beam = new THREE.Mesh(coneGeo(), beamMat); beam.position.set(L / 2, 0.6, s * W * 0.31); g.add(beam);
  }
  g.add(part(boxGeo(0.06, 0.11, W * 0.72), brakeMat, -L / 2 - 0.03, 0.74, 0));
  let strobe = null;
  if (type === 'interceptor') { // WHITE sheriff livery: black doors stripe + lightbar only
    for (const s of [-1, 1]) g.add(part(boxGeo(L * 0.52, 0.3, 0.025), new THREE.MeshLambertMaterial({ color: 0x141c2c }), -L * 0.02, 0.68, s * (W / 2 + 0.008)));
    const barBase = part(boxGeo(0.46, 0.1, 1.34), dark, -0.1, 1.44, 0); g.add(barBase);
    const red = new THREE.MeshBasicMaterial({ color: 0xff2438 });
    const blue = new THREE.MeshBasicMaterial({ color: 0x2f6bff });
    const lampGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.56, 10); lampGeo.rotateX(Math.PI / 2);
    g.add(part(lampGeo, red, -0.1, 1.56, -0.31));
    g.add(part(lampGeo, blue, -0.1, 1.56, 0.31));
    strobe = { red, blue };
  }
  if (type === 'vesper') { // rear wing on two supports + dual exhausts
    for (const s of [-1, 1]) g.add(part(boxGeo(0.07, 0.24, 0.07), dark, -L * 0.45, 1.0, s * W * 0.3));
    const wing = part(boxGeo(0.36, 0.05, W * 0.94), dark, -L * 0.46, 1.14, 0); wing.rotation.z = 0.1; g.add(wing);
    const exGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8); exGeo.rotateZ(Math.PI / 2);
    for (const s of [-1, 1]) g.add(part(exGeo, chrome, -L / 2 - 0.05, 0.3, s * 0.32));
  }
  if (type === 'marlin') { // dark bed liner inside the profile's bed dip
    g.add(part(boxGeo(L * 0.42, 0.06, W * 0.86), dark, -L * 0.28, 0.98, 0));
  }
  if (type === 'taxi') { const sign = part(boxGeo(0.7, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), -0.1, 1.48, 0); g.add(sign); }
  const flame = part(new THREE.ConeGeometry(0.3, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0x53c8ff, transparent: true, opacity: 0.85 }), -spec.len / 2 - 0.8, 0.45, 0);
  flame.rotation.z = Math.PI / 2; flame.visible = false; g.add(flame);
  g.userData = { wheels, brakeMat, strobe, flame, paint };
  return g;
}

export function createVehicle(scene, type, x, z, heading, colorHex) {
  const mesh = createDetailedVehicleMesh(type);
  if (colorHex !== undefined) mesh.userData.paint.color.setHex(colorHex);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    type, mesh, heading, speed: 0, steerVis: 0, nitro: TUNING.nitroSeconds, nitroOn: false,
    latX: 0, latZ: 0, crashed: 0, radius: 2.3, braking: false, spec: VEHICLE_CATALOG[type],
  };
}

const FWD = { x: 0, z: 0 };
export function updateVehicleArcadePhysics(vehicle, input, dt, world) {
  const spec = vehicle.spec;
  const nitroReady = vehicle.nitro > 0.4;
  vehicle.nitroOn = !!(input.nitro && nitroReady && input.throttle > 0);
  if (vehicle.nitroOn) vehicle.nitro = Math.max(0, vehicle.nitro - dt);
  else vehicle.nitro = Math.min(TUNING.nitroSeconds, vehicle.nitro + dt * 0.35);
  const boost = vehicle.nitroOn ? TUNING.nitroBoost : 1;
  if (input.throttle > 0) vehicle.speed += spec.accel * boost * dt;
  else if (input.throttle < 0) {
    if (vehicle.speed > 0.5) vehicle.speed -= TUNING.carBrake * dt; // braking
    else vehicle.speed -= spec.accel * 0.45 * dt; // reverse, clamped below
  }
  vehicle.speed -= vehicle.speed * TUNING.carDrag * dt * 0.35;
  const top = spec.topSpeed * boost;
  vehicle.speed = Math.max(-14, Math.min(top, vehicle.speed));
  if (!input.throttle) vehicle.speed -= vehicle.speed * dt * 0.7;
  vehicle.braking = input.throttle < 0 && vehicle.speed > 1;
  const sf = Math.min(1, Math.abs(vehicle.speed) / 12);
  const turn = input.steer * (input.handbrake ? 2.5 : 1.55) * sf * (vehicle.speed < 0 ? -1 : 1);
  vehicle.heading -= turn * dt * (input.handbrake ? 1.25 : 1);
  vehicle.steerVis += ((input.steer * 0.45) - vehicle.steerVis) * Math.min(1, dt * 10);
  FWD.x = Math.sin(vehicle.heading); FWD.z = Math.cos(vehicle.heading);
  // velocity = forward speed + a lateral drift component that grip bleeds off
  let vx = FWD.x * vehicle.speed + vehicle.latX, vz = FWD.z * vehicle.speed + vehicle.latZ;
  const grip = input.handbrake ? 1.6 : TUNING.carGrip;
  vehicle.latX -= vehicle.latX * Math.min(1, grip * dt); vehicle.latZ -= vehicle.latZ * Math.min(1, grip * dt);
  if (input.handbrake && Math.abs(vehicle.speed) > 8) { // drift: throw velocity sideways
    vehicle.latX += -FWD.z * turn * vehicle.speed * dt * 2.4;
    vehicle.latZ += FWD.x * turn * vehicle.speed * dt * 2.4;
  }
  vehicle.mesh.position.x += vx * dt; vehicle.mesh.position.z += vz * dt;
  vehicle.crashed = 0;
  if (world) { // building collision: circle vs AABB, push out along the shallow axis
    const p = vehicle.mesh.position, r = vehicle.radius;
    for (const b of world.colliders) {
      const dx = p.x - b.x, dz = p.z - b.z;
      if (Math.abs(dx) < b.hw + r && Math.abs(dz) < b.hd + r) {
        const pushX = b.hw + r - Math.abs(dx), pushZ = b.hd + r - Math.abs(dz);
        if (pushX < pushZ) p.x += (dx >= 0 ? pushX : -pushX); else p.z += (dz >= 0 ? pushZ : -pushZ);
        if (Math.abs(vehicle.speed) > 9) vehicle.crashed = Math.abs(vehicle.speed);
        vehicle.speed *= 0.35; vehicle.latX *= 0.4; vehicle.latZ *= 0.4;
      }
    }
    p.x = Math.max(-565, Math.min(1130, p.x)); p.z = Math.max(-565, Math.min(565, p.z));
  }
  vehicle.mesh.rotation.y = vehicle.heading;
  vehicle.mesh.rotation.z = -vehicle.steerVis * Math.min(1, Math.abs(vehicle.speed) / 30) * 0.4;
  const spin = vehicle.speed * dt / 0.42;
  vehicle.mesh.userData.wheels.forEach((w, i) => { w.rotation.z -= spin; if (i < 2) w.rotation.y = vehicle.steerVis; });
  vehicle.mesh.userData.brakeMat.color.setHex(vehicle.braking ? 0xff5566 : 0xb01020);
  const flame = vehicle.mesh.userData.flame;
  flame.visible = vehicle.nitroOn; if (flame.visible) flame.scale.setScalar(0.8 + Math.random() * 0.5);
  vehicle.drifting = !!input.handbrake && Math.abs(vehicle.speed) > 10;
  return vehicle;
}

export function createTraffic(scene, world, rng, count = 15) {
  const cars = [];
  const types = ['sedan', 'sedan', 'taxi', 'marlin', 'vesper'];
  for (let i = 0; i < count; i++) {
    const onAve = rng.chance(0.55);
    const line = onAve ? rng.pick(AVENUES) : rng.pick(STREETS);
    const dir = rng.sign();
    const lane = (rng.chance(0.5) ? 1 : -1) * 6.5 * dir;
    const t = rng.range(-520, 520);
    const x = onAve ? t : line + lane, z = onAve ? line + lane : t;
    const type = rng.pick(types);
    const veh = createVehicle(scene, type, x, z, 0, rng.pick(VEHICLE_CATALOG[type].colors));
    veh.traffic = { onAve, line, dir, lane, speed: rng.range(11, 17) };
    veh.heading = onAve ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    cars.push(veh);
  }
  return {
    cars,
    update(dt, playerPos) {
      for (const veh of cars) {
        const tr = veh.traffic, p = veh.mesh.position;
        let target = tr.speed, blocked = false;
        for (const other of cars) {
          if (other === veh) continue;
          const o = other.mesh.position;
          const ahead = tr.onAve ? (o.x - p.x) * tr.dir : (o.z - p.z) * tr.dir;
          const side = tr.onAve ? Math.abs(o.z - p.z) : Math.abs(o.x - p.x);
          if (ahead > 0 && ahead < 13 && side < 3.4) { target = Math.min(target, other.speed); blocked = true; }
        }
        if (playerPos) {
          const ahead = tr.onAve ? (playerPos.x - p.x) * tr.dir : (playerPos.z - p.z) * tr.dir;
          const side = tr.onAve ? Math.abs(playerPos.z - p.z) : Math.abs(playerPos.x - p.x);
          if (ahead > 0 && ahead < 11 && side < 3.4) { target = 0; blocked = true; }
        }
        veh.speed += Math.max(-22 * dt, Math.min(9 * dt, target - veh.speed));
        veh.braking = blocked && veh.speed > 1;
        if (tr.onAve) p.x += tr.dir * veh.speed * dt; else p.z += tr.dir * veh.speed * dt;
        if (p.x > 1140) p.x = -540; if (p.x < -560) p.x = 1120;
        if (p.z > 580) p.z = -540; if (p.z < -580) p.z = 540;
        veh.mesh.rotation.y = veh.heading;
        const spin = veh.speed * dt / 0.42;
        veh.mesh.userData.wheels.forEach((w) => { w.rotation.z -= spin; });
        veh.mesh.userData.brakeMat.color.setHex(veh.braking ? 0xff5566 : 0xb01020);
      }
    },
  };
}

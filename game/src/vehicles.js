// Vehicles: the catalog, multi-part procedural meshes (body, glass cabin, wheels, emissive
// head/taillights, GT spoiler, sheriff lightbar, nitro flame), arcade physics with drift and
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

const geoCache = new Map();
function part(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m;
}
function boxGeo(w, h, d) {
  const k = `b${w}|${h}|${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}

export function createDetailedVehicleMesh(type) {
  const spec = VEHICLE_CATALOG[type];
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.55 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x15171c });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8ef, roughness: 0.08, metalness: 0.8 });
  const body = part(boxGeo(spec.len, 0.62, spec.wid), paint, 0, 0.62, 0); g.add(body);
  const nose = part(boxGeo(spec.len * 0.3, 0.34, spec.wid * 0.92), paint, spec.len * 0.36, 0.5, 0); g.add(nose);
  const cabin = part(boxGeo(spec.len * 0.44, 0.52, spec.wid * 0.84), glass, -spec.len * 0.05, 1.16, 0); g.add(cabin);
  if (type === 'marlin') { const bed = part(boxGeo(spec.len * 0.36, 0.4, spec.wid * 0.94), dark, -spec.len * 0.3, 0.95, 0); g.add(bed); }
  if (type === 'vesper') { const spoiler = part(boxGeo(0.28, 0.5, spec.wid * 0.94), dark, -spec.len * 0.46, 1.05, 0); g.add(spoiler); }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10); wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0c0c0e });
  const wheels = [];
  for (const [wx, wz] of [[spec.len * 0.32, spec.wid / 2], [spec.len * 0.32, -spec.wid / 2], [-spec.len * 0.32, spec.wid / 2], [-spec.len * 0.32, -spec.wid / 2]]) {
    const w = part(wheelGeo, wheelMat, wx, 0.42, wz); g.add(w); wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff2233 });
  for (const s of [-1, 1]) {
    g.add(part(boxGeo(0.1, 0.16, 0.42), headMat, spec.len / 2 + 0.02, 0.62, s * spec.wid * 0.3));
    g.add(part(boxGeo(0.1, 0.14, 0.44), brakeMat, -spec.len / 2 - 0.02, 0.68, s * spec.wid * 0.3));
  }
  let strobe = null;
  if (type === 'interceptor') {
    const barBase = part(boxGeo(0.5, 0.14, 1.3), dark, 0, 1.5, 0); g.add(barBase);
    const red = new THREE.MeshBasicMaterial({ color: 0xff2438 });
    const blue = new THREE.MeshBasicMaterial({ color: 0x2f6bff });
    g.add(part(boxGeo(0.44, 0.2, 0.58), red, 0, 1.62, -0.33));
    g.add(part(boxGeo(0.44, 0.2, 0.58), blue, 0, 1.62, 0.33));
    const stripe = part(boxGeo(spec.len * 0.98, 0.3, spec.wid + 0.04), new THREE.MeshLambertMaterial({ color: 0x1c2f52 }), 0, 0.66, 0); g.add(stripe);
    strobe = { red, blue };
  }
  if (type === 'taxi') { const sign = part(boxGeo(0.7, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), 0, 1.55, 0); g.add(sign); }
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

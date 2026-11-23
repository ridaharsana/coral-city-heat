// CORAL CITY HEAT — police.js: the Marisol Sheriff. A heat value under a 0-5 star readout,
// interceptor cruisers that steer for a predicted intercept point through the same arcade
// physics the player drives with, strobing lightbars, roadblocks at four stars, and the
// Condor helicopter — a capsule-fuselage aircraft that orbits the player from three stars
// and pins them in a volumetric searchlight cone with a real spotlight and ground pool.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { createVehicle, updateVehicleArcadePhysics } from './vehicles.js';

export function createWantedState() { return { stars: 0, heat: 0, seenTimer: 0 }; }

export function updateWantedHeatSystem(wanted, events, dt) {
  for (const e of events) {
    const w = TUNING.wantedPerCrime[e];
    if (w) wanted.heat += w;
    else if (e === 'missionCrime') wanted.heat += 1.05;
  }
  if (wanted.seenTimer > 0) wanted.seenTimer -= dt;
  else wanted.heat = Math.max(0, wanted.heat - dt * 0.042); // ~one star per 24 s unseen
  wanted.stars = Math.min(5, Math.floor(wanted.heat + 0.0001));
}

export function updateStrobes(mesh, t) {
  const s = mesh.userData.strobe; if (!s) return;
  const ph = Math.sin(t * 10 + (s.phase || 0));
  s.red.emissiveIntensity = ph > 0 ? 5.5 : 0.12;
  s.blue.emissiveIntensity = ph > 0 ? 0.12 : 5.5;
  s.redGlow.opacity = ph > 0 ? 0.85 : 0.0;
  s.blueGlow.opacity = ph > 0 ? 0.0 : 0.85;
}

function buildCondor(scene) {
  const heli = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.32, metalness: 0.55, envMapIntensity: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 0.5, metalness: 0.5 });
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.88, 2.6, 6, 12), paint);
  fus.rotation.x = Math.PI / 2; fus.castShadow = true; heli.add(fus);
  const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 1.1, 4, 12), dark);
  stripe.rotation.x = Math.PI / 2; stripe.position.z = -0.4; stripe.scale.set(1, 1, 0.55); heli.add(stripe);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0x10151f, metalness: 0.9, roughness: 0.08, envMapIntensity: 1.6 }));
  cockpit.scale.set(0.92, 0.78, 0.95); cockpit.position.set(0, 0.12, 1.55); heli.add(cockpit);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.36, 3.8, 10), paint);
  boom.rotation.x = Math.PI / 2 - 0.06; boom.position.set(0, 0.18, -3.1); heli.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.55), dark);
  fin.position.set(0, 0.55, -4.85); heli.add(fin);
  const tailDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 14), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  tailDisc.position.set(0.1, 0.55, -4.85); tailDisc.rotation.y = Math.PI / 2; heli.add(tailDisc);
  for (const e of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.1, 6), dark);
    skid.rotation.x = Math.PI / 2; skid.position.set(e * 0.78, -1.02, 0.15); heli.add(skid);
    for (const sz of [-0.9, 1.1]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), dark);
      strut.position.set(e * 0.72, -0.68, sz); strut.rotation.z = e * 0.35; heli.add(strut);
    }
  }
  const rotor = new THREE.Group(); rotor.position.y = 1.12; heli.add(rotor);
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.035, 0.3), dark);
    blade.rotation.y = a; rotor.add(blade);
  }
  const blur = new THREE.Mesh(new THREE.CircleGeometry(3.25, 24), new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  blur.rotation.x = -Math.PI / 2; blur.position.y = 0.03; rotor.add(blur);
  // searchlight: additive cone (apex at the heli) + real spotlight + ground pool
  const coneGeo = new THREE.CylinderGeometry(0.55, 10.5, 58, 18, 1, true);
  coneGeo.translate(0, -29, 0);
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xfff3cf, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  cone.visible = false; scene.add(cone);
  const spot = new THREE.SpotLight(0xffe9b8, 0, 240, 0.3, 0.7, 1.1);
  scene.add(spot); scene.add(spot.target);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(8.6, 22), new THREE.MeshBasicMaterial({ color: 0xfff3cf, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.visible = false; scene.add(pool);
  heli.visible = false;
  heli.userData = { rotor, cone, spot, pool, t: 0 };
  scene.add(heli);
  return heli;
}
const _dir = new THREE.Vector3(), _tgt = new THREE.Vector3(), _up = new THREE.Vector3(0, -1, 0);
export function setHeliBeam(heli, tx, tz, on) {
  const u = heli.userData;
  u.cone.visible = on; u.pool.visible = on;
  u.spot.intensity = on ? 900 : 0;
  if (!on) return;
  _tgt.set(tx, 0, tz);
  _dir.copy(_tgt).sub(heli.position).normalize();
  u.cone.position.copy(heli.position);
  u.cone.quaternion.setFromUnitVectors(_up, _dir);
  u.spot.position.copy(heli.position);
  u.spot.target.position.copy(_tgt);
  u.pool.position.set(tx, 0.07, tz);
  u.pool.material.opacity = 0.32;
}
export function stageHeli(heli, x, y, z, tx, tz) {
  heli.visible = true;
  heli.position.set(x, y, z);
  heli.lookAt(tx, 0, tz);
  heli.userData.rotor.rotation.y = 0.7;
  setHeliBeam(heli, tx, tz, true);
}

export function createPoliceFleet(scene) {
  const fleet = {
    cops: [], roadblock: [], roadblockFor: -1, heli: buildCondor(scene), world: null,
    ensureCount(sc, world, n, pos) {
      fleet.world = world;
      while (fleet.cops.length < n) {
        const a = Math.random() * Math.PI * 2, d = 95 + Math.random() * 55;
        let x = pos.x + Math.sin(a) * d, z = pos.z + Math.cos(a) * d;
        if (world) { const r = world.resolve(x, z, 2.2); x = r[0]; z = r[1]; }
        const cop = createVehicle(sc, 'interceptor', x, z, Math.atan2(pos.x - x, pos.z - z), 0xf2f4f6);
        cop.isCop = true;
        fleet.cops.push(cop);
      }
      while (fleet.cops.length > n) {
        let far = 0, fd = -1;
        fleet.cops.forEach((c, i) => { const d = c.mesh.position.distanceTo(pos); if (d > fd) { fd = d; far = i; } });
        sc.remove(fleet.cops[far].mesh);
        fleet.cops.splice(far, 1);
      }
    },
    clearRoadblock(sc) {
      for (const rb of fleet.roadblock) sc.remove(rb.mesh);
      fleet.roadblock.length = 0;
      fleet.roadblockFor = -1;
    },
  };
  return fleet;
}

let strobeClock = 0;
export function updatePolicePursuitAI(cops, heli, target, dt, fleet, scene) {
  strobeClock += dt;
  let seen = false;
  const tp = target.pos, world = fleet?.world;
  const physWorld = world || { resolve: (x, z) => [x, z] };
  for (const cop of cops) {
    updateStrobes(cop.mesh, strobeClock);
    if (cop.stolen) continue;
    const p = cop.mesh.position;
    const dist = Math.hypot(tp.x - p.x, tp.z - p.z);
    if (dist < 78) seen = true;
    const lead = Math.min(0.9, dist / 65);
    const px = tp.x + (target.vel?.x || 0) * lead, pz = tp.z + (target.vel?.z || 0) * lead;
    let dh = Math.atan2(px - p.x, pz - p.z) - cop.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const cap = TUNING.copSpeed * (0.8 + target.stars * 0.1);
    updateVehicleArcadePhysics(cop, {
      throttle: cop.speed < cap ? 1 : 0.15,
      steer: THREE.MathUtils.clamp(dh * 1.7, -1, 1),
      handbrake: Math.abs(dh) > 2.3 && cop.speed > 13,
      nitro: target.stars >= 4 && dist > 55,
    }, dt, physWorld);
  }
  if (fleet) for (const rb of fleet.roadblock) updateStrobes(rb.mesh, strobeClock + 1.7);
  const u = heli.userData;
  if (target.stars >= TUNING.heliStars) {
    heli.visible = true;
    u.t += dt;
    const hx = tp.x + Math.sin(u.t * 0.35) * 21, hz = tp.z + Math.cos(u.t * 0.35) * 21;
    heli.position.x += (hx - heli.position.x) * Math.min(1, dt * 1.6);
    heli.position.z += (hz - heli.position.z) * Math.min(1, dt * 1.6);
    heli.position.y += (54 - heli.position.y) * Math.min(1, dt * 1.6);
    heli.lookAt(tp.x, 0, tp.z);
    u.rotor.rotation.y += dt * 27;
    setHeliBeam(heli, tp.x, tp.z, true);
    if (Math.hypot(heli.position.x - tp.x, heli.position.z - tp.z) < 130) seen = true;
  } else if (heli.visible) {
    heli.visible = false;
    setHeliBeam(heli, 0, 0, false);
  }
  return seen;
}

// Wanted heat + Marisol Sheriff pursuit: crimes feed a heat meter that crystallises into
// 0–5 stars; hiding from every cop's line of sight decays it. Interceptors steer to an
// intercept point ahead of the player, lightbars strobe red/blue, at 3+ stars a Condor
// helicopter pins a searchlight cone on the player, at 4+ stars a roadblock of parked
// Interceptors waits on the player's road ahead.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { createVehicle } from './vehicles.js';

export function createWantedState() {
  return { stars: 0, heat: 0, seenTimer: 0, hiddenTimer: 0, crimes: [] };
}

export function updateWantedHeatSystem(wanted, events, dt) {
  for (const ev of events) {
    const gain = TUNING.wantedPerCrime[ev];
    if (gain) wanted.heat += gain;
    if (ev === 'missionCrime') wanted.heat += 1.05;
  }
  wanted.stars = Math.max(wanted.stars, Math.min(5, Math.floor(wanted.heat)));
  if (wanted.stars > 0) {
    if (wanted.seenTimer > 0) { wanted.seenTimer -= dt; wanted.hiddenTimer = 0; }
    else {
      wanted.hiddenTimer += dt;
      if (wanted.hiddenTimer > TUNING.wantedDecaySeconds / Math.max(1, wanted.stars)) {
        wanted.heat = Math.max(0, wanted.stars - 1 + 0.001); wanted.stars = Math.max(0, wanted.stars - 1);
        wanted.hiddenTimer = 0;
      }
    }
  }
  return wanted;
}

export function createPoliceFleet(scene) {
  const heliGroup = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf0f2f5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.7, 7.5), bodyMat); heliGroup.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 5.5), bodyMat); tail.position.set(0, 0.3, -6); heliGroup.add(tail);
  const rotorGeo = new THREE.BoxGeometry(11, 0.08, 0.7);
  const rotor = new THREE.Mesh(rotorGeo, new THREE.MeshLambertMaterial({ color: 0x22242a })); rotor.position.y = 1.15; heliGroup.add(rotor);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 7.6), new THREE.MeshLambertMaterial({ color: 0x1c2f52 })); stripe.position.y = -0.3; heliGroup.add(stripe);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(11, 46, 20, 1, true), coneMat);
  cone.position.y = -23.8; heliGroup.add(cone);
  const spot = new THREE.SpotLight(0xfff3b0, 0, 90, 0.42, 0.5, 0.6);
  spot.position.set(0, 0, 0); heliGroup.add(spot); heliGroup.add(spot.target);
  spot.target.position.set(0, -46, 0);
  heliGroup.visible = false; scene.add(heliGroup);
  return {
    cops: [], heli: { mesh: heliGroup, rotor, cone, spot, angle: 0 },
    roadblock: [], roadblockFor: -1,
    ensureCount(sceneRef, world, count, playerPos) {
      while (this.cops.length < count) {
        const a = Math.random() * Math.PI * 2, d = 85 + Math.random() * 30;
        const x = Math.max(-540, Math.min(1100, playerPos.x + Math.sin(a) * d));
        const z = Math.max(-540, Math.min(540, playerPos.z + Math.cos(a) * d));
        const cop = createVehicle(sceneRef, 'interceptor', x, z, a, 0xf0f2f5);
        cop.isCop = true; this.cops.push(cop);
      }
      while (this.cops.length > count) { const c = this.cops.pop(); sceneRef.remove(c.mesh); }
    },
    clearRoadblock(sceneRef) {
      for (const c of this.roadblock) sceneRef.remove(c.mesh);
      this.roadblock = []; this.roadblockFor = -1;
    },
  };
}

export function updatePolicePursuitAI(cops, heli, player, dt, fleet, scene) {
  const pPos = player.pos;
  let anySeen = false;
  for (const cop of cops) {
    const cp = cop.mesh.position;
    const dist = cp.distanceTo(pPos);
    if (dist < 95) anySeen = true;
    // intercept: aim ahead of the player's motion, fall in behind when close
    const lead = Math.min(1.2, dist / 60);
    const tx = pPos.x + player.vel.x * lead, tz = pPos.z + player.vel.z * lead;
    const want = Math.atan2(tx - cp.x, tz - cp.z);
    let diff = want - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.6));
    const throttle = dist > 7 ? 1 : 0.2;
    const spd = Math.abs(cop.speed);
    if (dist < 55 && spd < TUNING.copSpeed) cop.speed += 26 * dt * throttle;
    cop.speed -= cop.speed * dt * 0.3;
    cop.heading -= steer * Math.min(1, spd / 10) * 1.7 * dt;
    cp.x += Math.sin(cop.heading) * cop.speed * dt;
    cp.z += Math.cos(cop.heading) * cop.speed * dt;
    cp.x = Math.max(-560, Math.min(1125, cp.x)); cp.z = Math.max(-560, Math.min(560, cp.z));
    cop.mesh.rotation.y = cop.heading;
    const spin = cop.speed * dt / 0.42;
    cop.mesh.userData.wheels.forEach((w) => { w.rotation.z -= spin; });
    if (cop.mesh.userData.strobe) { // strobe the lightbar
      const phase = Math.floor(performance.now() / 130) % 2;
      cop.mesh.userData.strobe.red.color.setHex(phase ? 0xff2438 : 0x57101c);
      cop.mesh.userData.strobe.blue.color.setHex(phase ? 0x101c57 : 0x2f6bff);
    }
  }
  if (heli) {
    const active = player.stars >= TUNING.heliStars;
    heli.mesh.visible = active;
    if (active) {
      heli.angle += dt * 0.55;
      const hp = heli.mesh.position;
      hp.x += (pPos.x + Math.sin(heli.angle) * 16 - hp.x) * Math.min(1, dt * 1.6);
      hp.z += (pPos.z + Math.cos(heli.angle) * 16 - hp.z) * Math.min(1, dt * 1.6);
      hp.y = 44;
      heli.mesh.rotation.y = Math.atan2(pPos.x - hp.x, pPos.z - hp.z);
      heli.rotor.rotation.y += dt * 28;
      heli.spot.intensity = 900;
      if (pPos.distanceTo(hp) < 100) anySeen = true;
    } else heli.spot.intensity = 0;
  }
  return anySeen;
}

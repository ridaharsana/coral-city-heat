// People: the two switchable protagonists (Paloma Reyes, driver; Dario Venn, shooter),
// low-poly articulated person meshes, sidewalk pedestrians who flee gunfire, third-person
// on-foot control (walk / sprint / aim / shoot with tracers and muzzle flash / enter-exit
// cars with E), and the GTA-style sky-zoom protagonist switch.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { AVENUES, STREETS, ROAD_HALF } from './world.js';

export const PROTAGONISTS = [
  { name: 'Paloma Reyes', short: 'PALOMA', role: 'The Driver', shirt: 0xff2e88, pants: 0x1d2436, skin: 0xc98a5e, hair: 0x2a1608,
    stats: { Driving: 92, Shooting: 64, Stealth: 71, Stamina: 78 } },
  { name: 'Dario Venn', short: 'DARIO', role: 'The Shooter', shirt: 0x22384f, pants: 0x14161c, skin: 0x8a5a3a, hair: 0x0c0c0e,
    stats: { Driving: 68, Shooting: 94, Stealth: 80, Stamina: 85 } },
];

const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}
// a tapered limb segment that pivots at its top: cylinder, slightly narrower at the wrist/ankle
function limb(rTop, rBot, h, color, px, py, pz) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, 7); geo.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(geo, mat(color)); m.position.set(px, py, pz); m.castShadow = true; return m;
}

export function createPersonMesh(proto) {
  const g = new THREE.Group();
  // tapered torso: elliptical cylinder, shoulders wider than the waist — no box anywhere
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.21, 0.74, 9), mat(proto.shirt));
  torso.scale.z = 0.58; torso.position.y = 1.13; torso.castShadow = true; g.add(torso);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), mat(proto.pants));
  pelvis.scale.set(1.05, 0.62, 0.66); pelvis.position.y = 0.78; g.add(pelvis);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.185, 10, 8), mat(proto.skin));
  head.position.y = 1.68; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.195, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(proto.hair));
  hair.position.y = 1.715; hair.rotation.x = -0.25; g.add(hair);
  if (proto.short === 'PALOMA') { // her ponytail: a small tapered cone swept back off the hairline
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.075, 0.42, 6), mat(proto.hair));
    tail.position.set(0, 1.78, -0.2); tail.rotation.x = 0.7; g.add(tail);
  }
  const legL = limb(0.085, 0.06, 0.78, proto.pants, -0.15, 0.78, 0); g.add(legL);
  const legR = limb(0.085, 0.06, 0.78, proto.pants, 0.15, 0.78, 0); g.add(legR);
  const armL = limb(0.062, 0.045, 0.66, proto.shirt, -0.38, 1.44, 0); g.add(armL);
  const armR = limb(0.062, 0.045, 0.66, proto.shirt, 0.38, 1.44, 0); g.add(armR);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.62), mat(0x14161c));
  gun.position.set(0, -0.62, 0.2); gun.visible = false; armR.add(gun);
  g.userData = { legL, legR, armL, armR, gun, torso };
  return g;
}

export function animatePerson(mesh, speed, t, aiming) {
  const u = mesh.userData, swing = Math.min(1, Math.abs(speed) / 6) * 0.65;
  const ph = t * (4 + Math.abs(speed) * 1.1);
  u.legL.rotation.x = Math.sin(ph) * swing; u.legR.rotation.x = -Math.sin(ph) * swing;
  if (aiming) { u.armR.rotation.x = -1.45; u.armL.rotation.x = -1.25; }
  else { u.armL.rotation.x = -Math.sin(ph) * swing; u.armR.rotation.x = Math.sin(ph) * swing; }
  u.gun.visible = !!aiming;
}

// --- transient effects (tracers + muzzle flashes), updated by main each frame
const fx = [];
export function spawnTracer(scene, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.9 }));
  scene.add(line); fx.push({ obj: line, ttl: 0.07, scene });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffc95e, transparent: true, opacity: 0.95 }));
  flash.position.copy(from); scene.add(flash); fx.push({ obj: flash, ttl: 0.05, scene });
}
export function updateEffects(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    fx[i].ttl -= dt;
    if (fx[i].ttl <= 0) { fx[i].scene.remove(fx[i].obj); fx[i].obj.geometry?.dispose?.(); fx.splice(i, 1); }
  }
}

export function createPedestrians(scene, rng, count = 26) {
  const peds = [];
  const palettes = [0xe8e8f0, 0x37e0ff, 0xffb347, 0x3f9e4d, 0xb83a2f, 0xff5fa2, 0xc7a23a].map((shirt) => ({
    name: 'ped', shirt, pants: 0x232733, skin: rng.pick([0xc98a5e, 0x8a5a3a, 0xe8b98a, 0x6e4530]), hair: 0x1a120a,
  }));
  for (let i = 0; i < count; i++) {
    const proto = rng.pick(palettes);
    const mesh = createPersonMesh(proto); scene.add(mesh);
    const onAve = rng.chance(0.5);
    const line = onAve ? rng.pick(AVENUES) : rng.pick(STREETS);
    peds.push({
      mesh, onAve, line, dir: rng.sign(), off: (ROAD_HALF + 3.2) * rng.sign(),
      t: rng.range(-520, 520), speed: rng.range(1.2, 2.1), flee: 0, phase: rng.range(0, 9),
    });
  }
  return {
    peds,
    update(dt, panic) {
      for (const p of peds) {
        const pos = p.mesh.position;
        if (panic && pos.distanceTo(panic.pos) < 26 && panic.t > 0) p.flee = 2.5;
        p.flee = Math.max(0, p.flee - dt);
        const sp = p.speed * (p.flee > 0 ? 2.6 : 1);
        p.t += sp * dt * p.dir * (p.flee > 0 ? -1 : 1);
        if (p.t > 540) p.t = -540; if (p.t < -540) p.t = 540;
        if (p.onAve) pos.set(p.t, 0, p.line + p.off); else pos.set(p.line + p.off, 0, p.t);
        p.mesh.rotation.y = p.onAve ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) * (p.flee > 0 ? -1 : 1) : (p.dir > 0 ? 0 : Math.PI) * (p.flee > 0 ? -1 : 1);
        animatePerson(p.mesh, sp, performance.now() / 1000 + p.phase, false);
      }
    },
  };
}

// player: { mesh, protoIdx, heading, vehicle|null, health, armor, stamina, weapon, camYaw, walkPhase }
// ctx: { vehicles, events, scene, audio, time }
export function updateThirdPersonCharacter(player, input, world, dt, ctx) {
  const pos = player.mesh.position;
  if (player.vehicle) return; // driving is vehicles.js' job; main handles exit via ctx
  const fwd = input.axis('KeyS', 'KeyW'), strafe = input.axis('KeyA', 'KeyD');
  const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
  const moving = fwd !== 0 || strafe !== 0;
  const speed = sprint && player.stamina > 1 ? TUNING.sprintSpeed : TUNING.walkSpeed;
  if (moving) {
    const ang = Math.atan2(strafe, fwd) + player.camYaw;
    player.heading = ang;
    pos.x += Math.sin(ang) * speed * dt; pos.z += Math.cos(ang) * speed * dt;
    player.walkPhase += dt * speed * 1.6;
    player.stamina = Math.max(0, player.stamina - (sprint ? 9 : 0) * dt);
    // building collision (circle vs AABB, slide out)
    for (const b of world.colliders) {
      const dx = pos.x - b.x, dz = pos.z - b.z;
      if (Math.abs(dx) < b.hw + 0.5 && Math.abs(dz) < b.hd + 0.5) {
        const px = b.hw + 0.5 - Math.abs(dx), pz = b.hd + 0.5 - Math.abs(dz);
        if (px < pz) pos.x += dx >= 0 ? px : -px; else pos.z += dz >= 0 ? pz : -pz;
      }
    }
    pos.x = Math.max(-560, Math.min(1125, pos.x)); pos.z = Math.max(-560, Math.min(560, pos.z));
  } else player.stamina = Math.min(100, player.stamina + 6 * dt);
  player.mesh.rotation.y = player.heading;
  const aiming = input.mouseDown && player.weapon !== 'FISTS';
  animatePerson(player.mesh, moving ? speed : 0, player.walkPhase, aiming);
  // shooting: hitscan tracer toward the camera heading, peds flee, heat rises
  player.fireCd = Math.max(0, (player.fireCd || 0) - dt);
  if (aiming && player.fireCd <= 0) {
    player.fireCd = player.weapon === 'SMG' ? 0.09 : player.weapon === 'SHOTGUN' ? 0.7 : 0.16;
    const from = new THREE.Vector3(pos.x, 1.5, pos.z);
    const dirV = new THREE.Vector3(Math.sin(player.camYaw), 0, Math.cos(player.camYaw));
    const to = from.clone().add(dirV.multiplyScalar(46));
    to.y = 1.2;
    spawnTracer(ctx.scene, from, to);
    ctx.events.push('shot');
    ctx.audio?.shot();
    ctx.panic = { pos: pos.clone(), t: 0.4 };
  }
  // enter nearest vehicle with E
  if (input.actionEnter()) {
    let best = null, bestD = 5.2;
    for (const v of ctx.vehicles) {
      const d = v.mesh.position.distanceTo(pos);
      if (d < bestD) { bestD = d; best = v; }
    }
    if (best) {
      player.vehicle = best; player.mesh.visible = false;
      ctx.events.push(best.traffic ? 'carjack' : 'enter');
      return 'entered';
    }
  }
  return null;
}

// The switch: main binds its game object once; Tab swaps who `player` embodies. The other
// protagonist waits as a standby figure where they were left. Camera flight is main's job —
// this sets game.cameraFlight { t, dur, from, to } for the sky-zoom.
let boundGame = null;
export function bindProtagonistSwitch(game) { boundGame = game; }
export function switchActiveProtagonist(targetName, camera) {
  const game = boundGame; if (!game) return false;
  const idx = PROTAGONISTS.findIndex((p) => p.name === targetName);
  if (idx < 0 || idx === game.player.protoIdx) return false;
  const standby = game.standbys[game.player.protoIdx];
  standby.mesh.position.copy(game.player.mesh.position);
  standby.mesh.rotation.y = game.player.heading; standby.mesh.visible = true;
  const other = game.standbys[idx];
  game.player.mesh.position.copy(other.mesh.position);
  game.player.heading = other.mesh.rotation.y; other.mesh.visible = false;
  game.player.protoIdx = idx;
  game.player.mesh.userData.torso.material = mat(PROTAGONISTS[idx].shirt);
  const from = camera.position.clone();
  const to = game.player.mesh.position.clone().add(new THREE.Vector3(0, 4.5, -9));
  game.cameraFlight = { t: 0, dur: 1.5, from, to };
  return true;
}

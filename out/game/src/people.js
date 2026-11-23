// CORAL CITY HEAT — people.js: anatomical capsule-built humans, never boxes. Heads are scaled
// spheres with hair caps and capsule sunglasses, torsos are tapered cylinders under an open
// jacket shell, limbs are capsule segments on shoulder/elbow/hip/knee pivots — so the duo can
// walk, sprint, flee, and drop into a wide tactical shooting stance with a two-handed rifle.
// Also: pedestrians, gunfire effects (tracers, muzzle flash, sparks) and the protagonist switch.
import * as THREE from 'three';
import { TUNING } from './config.js';

export const PROTAGONISTS = [
  { name: 'Paloma Reyes', short: 'PALOMA', role: 'The Driver', skin: 0xc98a64, hair: 0x2a1a12, jacket: 0xd6336c, shirt: 0xf2e8ee, pants: 0x23232c, pony: true, stats: { driving: 95, shooting: 72, stealth: 64, stamina: 80 } },
  { name: 'Dario Venn', short: 'DARIO', role: 'The Trigger', skin: 0x8a5a3c, hair: 0x14100c, jacket: 0x27364f, shirt: 0x30363f, pants: 0x1d2126, beard: true, stats: { driving: 74, shooting: 94, stealth: 70, stamina: 86 } },
];
export const PANIC = { x: 0, z: 0, t: 0 };

const std = (color, rough = 0.75) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 });
function buildRifle(metal, dark) {
  const r = new THREE.Group();
  const recv = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.52), metal); r.add(recv);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.42, 8), dark);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.045, 0.44); r.add(barrel);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.3), dark); guard.position.set(0, 0.01, 0.3); r.add(guard);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.1), dark); mag.position.set(0, -0.15, 0.05); mag.rotation.x = 0.25; r.add(mag);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.24), dark); stock.position.set(0, -0.02, -0.36); r.add(stock);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.17, 8), dark);
  scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.13, -0.02); r.add(scope);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.045, 0.68); r.add(muzzle);
  r.userData.muzzle = muzzle;
  r.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return r;
}

export function createRealisticHumanCharacter(proto, cheap = false) {
  const seg = cheap ? 0.55 : 1;
  const S = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, Math.max(6, w * seg), Math.max(5, h * seg));
  const C = (r, l) => new THREE.CapsuleGeometry(r, l, 4, Math.max(6, 12 * seg));
  const skin = std(proto.skin, 0.6), hairM = std(proto.hair, 0.85), jacketM = std(proto.jacket, 0.7),
    shirtM = std(proto.shirt, 0.8), pantsM = std(proto.pants, 0.85), darkM = std(0x17181c, 0.5);
  const mesh = new THREE.Group();
  const rig = new THREE.Group(); mesh.add(rig);
  const pelvis = new THREE.Mesh(C(0.155, 0.14), pantsM); pelvis.position.y = 1.0; rig.add(pelvis);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.028, 8, 16), darkM);
  belt.rotation.x = Math.PI / 2; belt.position.y = 1.08; belt.scale.set(1, 0.78, 1); rig.add(belt);
  function leg(side) {
    const hip = new THREE.Group(); hip.position.set(0.11 * side, 1.02, 0); rig.add(hip);
    const thigh = new THREE.Mesh(C(0.105, 0.32), pantsM); thigh.position.y = -0.26; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.52; hip.add(knee);
    const calf = new THREE.Mesh(C(0.08, 0.32), pantsM); calf.position.y = -0.25; knee.add(calf);
    const shoe = new THREE.Mesh(S(0.085, 10, 8), darkM); shoe.scale.set(1, 0.55, 1.9); shoe.position.set(0, -0.52, 0.05); knee.add(shoe);
    return { hip, knee };
  }
  const legL = leg(-1), legR = leg(1);
  const torso = new THREE.Group(); torso.position.y = 1.06; rig.add(torso);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.145, 0.62, Math.max(8, 18 * seg)), shirtM);
  chest.scale.z = 0.72; chest.position.y = 0.31; torso.add(chest);
  const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.165, 0.6, Math.max(8, 18 * seg), 1, true, Math.PI * 0.78, Math.PI * 1.44), jacketM);
  jacket.scale.z = 0.74; jacket.position.y = 0.3; jacket.material.side = THREE.DoubleSide; torso.add(jacket);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.032, 8, 14), jacketM);
  collar.rotation.x = Math.PI / 2 - 0.25; collar.position.y = 0.6; collar.scale.set(1, 0.75, 1); torso.add(collar);
  for (const s of [-1, 1]) {
    const delt = new THREE.Mesh(S(0.105, 12, 9), jacketM); delt.position.set(0.235 * s, 0.5, 0); torso.add(delt);
  }
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(0.27 * side, 0.52, 0); torso.add(sh);
    const up = new THREE.Mesh(C(0.07, 0.24), jacketM); up.position.y = -0.19; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.4; sh.add(el);
    const fore = new THREE.Mesh(C(0.058, 0.22), skin); fore.position.y = -0.17; el.add(fore);
    const hand = new THREE.Mesh(S(0.05, 8, 7), skin); hand.position.y = -0.37; el.add(hand);
    return { sh, el };
  }
  const armL = arm(-1), armR = arm(1);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skin);
  neck.position.y = 0.68; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.74; torso.add(head);
  const skull = new THREE.Mesh(S(0.155, 18, 14), skin); skull.scale.set(0.92, 1.08, 0.98); skull.position.y = 0.1; head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.162, Math.max(8, 16 * seg), Math.max(6, 10 * seg), 0, Math.PI * 2, 0, Math.PI * 0.52), hairM);
  hair.scale.set(0.94, 1.06, 1); hair.position.set(0, 0.125, -0.012); head.add(hair);
  if (proto.pony) {
    const pony = new THREE.Mesh(C(0.042, 0.15), hairM);
    pony.position.set(0, 0.06, -0.17); pony.rotation.x = 0.55; head.add(pony);
  }
  if (proto.beard) {
    const beard = new THREE.Mesh(S(0.13, 12, 9), hairM);
    beard.scale.set(0.82, 0.55, 0.7); beard.position.set(0, -0.015, 0.055); head.add(beard);
  }
  const shades = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.19, 4, 8), new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.15, metalness: 0.6 }));
  shades.rotation.z = Math.PI / 2; shades.scale.set(1, 1, 0.5); shades.position.set(0, 0.12, 0.135); head.add(shades);
  const rifle = buildRifle(std(0x23262e, 0.45), darkM);
  rifle.position.set(0.1, 0.34, 0.3); rifle.visible = false; torso.add(rifle);
  mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  const parts = { rig, torso, head, armL, armR, legL, legR, rifle, muzzle: rifle.userData.muzzle };
  mesh.userData.parts = parts;
  poseStand(parts);
  return mesh;
}
export function createPersonMesh(proto) { return createRealisticHumanCharacter(proto, false); }

export function poseStand(P) {
  P.rig.position.y = 0; P.torso.rotation.set(0, 0, 0);
  P.legL.hip.rotation.x = 0; P.legR.hip.rotation.x = 0; P.legL.knee.rotation.x = 0.02; P.legR.knee.rotation.x = 0.02;
  P.armL.sh.rotation.set(-0.07, 0, 0.07); P.armR.sh.rotation.set(-0.07, 0, -0.07);
  P.armL.el.rotation.x = -0.22; P.armR.el.rotation.x = -0.22;
  P.head.rotation.set(0, 0, 0); P.rifle.visible = false;
}
export function poseWalk(P, ph, amt = 1) {
  const s = Math.sin(ph);
  P.legL.hip.rotation.x = -s * 0.58 * amt; P.legR.hip.rotation.x = s * 0.58 * amt;
  P.legL.knee.rotation.x = Math.max(0, Math.sin(ph - 0.7)) * 0.75 * amt;
  P.legR.knee.rotation.x = Math.max(0, Math.sin(ph + Math.PI - 0.7)) * 0.75 * amt;
  P.armL.sh.rotation.x = s * 0.42 * amt; P.armR.sh.rotation.x = -s * 0.42 * amt;
  P.armL.el.rotation.x = -0.3 - Math.max(0, -s) * 0.2; P.armR.el.rotation.x = -0.3 - Math.max(0, s) * 0.2;
  P.rig.position.y = Math.abs(Math.cos(ph)) * 0.045 * amt;
  P.torso.rotation.x = 0.07 * amt; P.rifle.visible = false;
}
export function poseAim(P) {
  P.legL.hip.rotation.x = -0.55; P.legL.knee.rotation.x = 0.5;
  P.legR.hip.rotation.x = 0.42; P.legR.knee.rotation.x = 0.18;
  P.rig.position.y = -0.09;
  P.torso.rotation.set(0.1, -0.32, 0);
  P.armR.sh.rotation.set(-1.42, 0, -0.1); P.armR.el.rotation.x = -0.12;
  P.armL.sh.rotation.set(-1.02, 0.25, 0.55); P.armL.el.rotation.x = -0.5;
  P.head.rotation.y = 0.3;
  P.rifle.visible = true;
}

/* ---------------- gunfire effects ---------------- */
const fx = [];
function fxTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const FX_TEX = typeof document !== 'undefined' ? fxTexture() : null;
export function spawnTracer(scene, from, to, color = 0xffd9a0) {
  const len = from.distanceTo(to); if (len < 1.5) return;
  const geo = new THREE.CylinderGeometry(0.021, 0.021, 1, 5);
  geo.translate(0, 0.5, 0); geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.position.copy(from); m.lookAt(to); m.scale.set(1, 1, len);
  scene.add(m); fx.push({ o: m, ttl: 0.08, max: 0.08, scene });
}
export function spawnMuzzleFlash(scene, pos, scale = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX_TEX, color: 0xffc46b, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.copy(pos); s.scale.setScalar(0.85 * scale);
  scene.add(s); fx.push({ o: s, ttl: 0.055, max: 0.055, scene, grow: true });
}
export function spawnSparks(scene, pos, n = 9) {
  const posArr = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    posArr.set([pos.x, pos.y, pos.z], i * 3);
    vel.push(new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 3.4, (Math.random() - 0.5) * 5));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffc46b, size: 0.1, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts); fx.push({ o: pts, ttl: 0.32, max: 0.32, scene, vel });
}
export function updateEffects(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const e = fx[i]; e.ttl -= dt;
    if (e.ttl <= 0) { e.scene.remove(e.o); e.o.geometry?.dispose?.(); e.o.material?.dispose?.(); fx.splice(i, 1); continue; }
    const k = e.ttl / e.max;
    if (e.vel) {
      const p = e.o.geometry.attributes.position;
      for (let j = 0; j < e.vel.length; j++) {
        const v = e.vel[j]; v.y -= 9.5 * dt;
        p.setXYZ(j, p.getX(j) + v.x * dt, Math.max(0.05, p.getY(j) + v.y * dt), p.getZ(j) + v.z * dt);
      }
      p.needsUpdate = true; e.o.material.opacity = k;
    } else if (e.grow) { e.o.material.opacity = k; e.o.scale.multiplyScalar(1 + dt * 6); }
    else e.o.material.opacity = k * 0.95;
  }
}

/* ---------------- on-foot control ---------------- */
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}
export function updateThirdPersonCharacter(pl, input, world, dt, ctx) {
  const P = pl.mesh.userData.parts;
  const pos = pl.mesh.position;
  const aF = input.axis('KeyS', 'KeyW'), aR = input.axis('KeyA', 'KeyD');
  const fx2 = Math.sin(pl.camYaw), fz2 = Math.cos(pl.camYaw);
  const rx = Math.cos(pl.camYaw), rz = -Math.sin(pl.camYaw);
  let mx = fx2 * aF + rx * aR, mz = fz2 * aF + rz * aR;
  const ml = Math.hypot(mx, mz);
  const sprinting = (input.down('ShiftLeft') || input.down('ShiftRight')) && ml > 0 && pl.stamina > 1;
  const speed = sprinting ? TUNING.sprintSpeed : TUNING.walkSpeed;
  pl.stamina = THREE.MathUtils.clamp(pl.stamina + (sprinting ? -21 : 13) * dt, 0, 100);
  const aiming = input.mouseDown && pl.weapon !== 'FISTS';
  if (ml > 0.01) {
    mx /= ml; mz /= ml;
    const res = world.resolve(pos.x + mx * speed * dt, pos.z + mz * speed * dt, 0.42);
    pos.x = res[0]; pos.z = res[1];
    pl.heading = angleLerp(pl.heading, Math.atan2(mx, mz), dt * 11);
    pl.walkPhase += dt * speed * 1.55;
    if (!aiming) poseWalk(P, pl.walkPhase, sprinting ? 1.15 : 0.85);
  } else if (!aiming) poseStand(P);
  if (aiming) {
    pl.heading = angleLerp(pl.heading, pl.camYaw, dt * 16);
    poseAim(P);
  }
  pl.mesh.rotation.y = pl.heading;
  // shooting
  pl.fireCd -= dt;
  if (aiming && pl.fireCd <= 0) {
    pl.fireCd = pl.weapon === 'CARBINE' || pl.weapon === 'SMG' ? 0.13 : 0.34;
    ctx.events.push('shot');
    ctx.audio?.shot();
    PANIC.x = pos.x; PANIC.z = pos.z; PANIC.t = 3;
    P.muzzle.getWorldPosition(_v1);
    spawnMuzzleFlash(ctx.scene, _v1);
    const dir = _v2.set(Math.sin(pl.heading), 0.06, Math.cos(pl.heading)).normalize().clone();
    const origin = _v1.clone();
    let best = 80, hitVeh = null, hitP = null;
    for (const v of ctx.vehicles) {
      const to = v.mesh.position.clone().setY(1).sub(origin.clone().setY(1));
      const along = to.dot(dir.clone().setY(0).normalize());
      if (along < 3 || along > 85) continue;
      const perp = to.sub(dir.clone().setY(0).normalize().multiplyScalar(along)).length();
      if (perp < 2.3 && along < best) { best = along; hitVeh = v; hitP = origin.clone().add(dir.clone().multiplyScalar(along)); }
    }
    const end = hitP || origin.clone().add(dir.multiplyScalar(80));
    spawnTracer(ctx.scene, origin, end);
    if (hitVeh) { spawnSparks(ctx.scene, hitP); if (hitVeh.isCop) ctx.events.push('cop'); }
  }
  // enter a vehicle
  if (input.actionEnter()) {
    let bestD = 5.2, bestV = null;
    for (const v of ctx.vehicles) {
      const d = v.mesh.position.distanceTo(pos);
      if (d < bestD) { bestD = d; bestV = v; }
    }
    if (bestV) {
      pl.vehicle = bestV; bestV.stolen = true;
      pl.mesh.visible = false;
      if (!bestV.isCop) ctx.events.push('carjack');
      return 'entered';
    }
  }
  return null;
}

/* ---------------- pedestrians ---------------- */
const PED_PALETTES = [
  { skin: 0x8a5a3c, hair: 0x1c1410, jacket: 0x4a6a8a, shirt: 0xd8d2c4, pants: 0x30343c },
  { skin: 0xc98a64, hair: 0x3a2412, jacket: 0x8a8f3a, shirt: 0x30363f, pants: 0x4a3a2c },
  { skin: 0x6e4530, hair: 0x0e0c0a, jacket: 0xb85c38, shirt: 0xe8e2d2, pants: 0x27364f },
  { skin: 0xe0aa7c, hair: 0x6e4a22, jacket: 0x5e4a7a, shirt: 0x22262e, pants: 0x3c4048 },
  { skin: 0xa06a44, hair: 0x241612, jacket: 0x2e6f79, shirt: 0xf2e8ee, pants: 0x23232c },
];
export function createPedestrians(scene, rng, count = 26) {
  const peds = [];
  const AV = [-490, -355, -220, -85, 50, 185, 320, 455], ST = [-490, -355, -220, -85, 50, 185, 320, 400];
  for (let i = 0; i < count; i++) {
    const proto = { ...rng.pick(PED_PALETTES), name: 'Pedestrian', short: 'PED', role: 'Local', pony: rng.chance(0.4), stats: {} };
    const mesh = createRealisticHumanCharacter(proto, true);
    const onAvenue = rng.chance(0.5);
    const ai = {
      axis: onAvenue ? 'z' : 'x', // avenue walkers stroll along z beside Ocean Drive etc.
      line: onAvenue ? rng.pick(ST) : rng.pick(AV),
      side: rng.sign(), dir: rng.sign(),
      speed: rng.range(1.5, 2.6), phase: rng.range(0, 6),
    };
    if (ai.axis === 'z') mesh.position.set(ai.line + ai.side * 10.6, 0, rng.range(-520, 520));
    else mesh.position.set(rng.range(-520, 520), 0, ai.line + ai.side * 11.6);
    mesh.scale.setScalar(rng.range(0.94, 1.04));
    scene.add(mesh);
    peds.push({ mesh, ai, parts: mesh.userData.parts });
  }
  function update(dt, panic) {
    if (PANIC.t > 0) PANIC.t -= dt;
    const src = panic && panic.t > 0 ? panic : (PANIC.t > 0 ? PANIC : null);
    for (const p of peds) {
      const pos = p.mesh.position, a = p.ai;
      let mvx = 0, mvz = 0, spd = a.speed;
      if (src) {
        const dx = pos.x - src.x, dz = pos.z - src.z, d = Math.hypot(dx, dz);
        if (d < 30 && d > 0.01) { mvx = dx / d; mvz = dz / d; spd = 6.4; }
      }
      if (!mvx && !mvz) { if (a.axis === 'z') mvz = a.dir; else mvx = a.dir; }
      pos.x += mvx * spd * dt; pos.z += mvz * spd * dt;
      if (a.axis === 'z' && (pos.z > 545 || pos.z < -545)) a.dir *= -1;
      if (a.axis === 'x' && (pos.x > 545 || pos.x < -545)) a.dir *= -1;
      pos.x = THREE.MathUtils.clamp(pos.x, -556, 556); pos.z = THREE.MathUtils.clamp(pos.z, -556, 556);
      p.mesh.rotation.y = Math.atan2(mvx, mvz);
      a.phase += dt * spd * 1.7;
      poseWalk(p.parts, a.phase, spd > 3 ? 1.2 : 0.7);
    }
  }
  return { list: peds, update };
}

/* ---------------- protagonist switch ---------------- */
let boundGame = null;
export function bindProtagonistSwitch(game) { boundGame = game; }
export function switchActiveProtagonist(targetName, camera) {
  const g = boundGame; if (!g) return false;
  const idx = PROTAGONISTS.findIndex((p) => p.name === targetName);
  if (idx < 0 || idx === g.player.protoIdx) return false;
  const pl = g.player;
  const oldMesh = pl.mesh, newMesh = g.standbys[idx].mesh;
  const targetPos = newMesh.position.clone();
  if (pl.vehicle) { // leave the car with the outgoing protagonist standing beside it
    oldMesh.position.set(pl.vehicle.mesh.position.x + 3, 0, pl.vehicle.mesh.position.z + 2);
    pl.vehicle = null;
  }
  oldMesh.visible = true;
  g.standbys[pl.protoIdx].mesh = oldMesh;
  pl.mesh = newMesh; pl.protoIdx = idx;
  pl.mesh.visible = true;
  pl.heading = pl.camYaw;
  g.cameraFlight = { from: camera.position.clone(), to: targetPos.clone().add(new THREE.Vector3(0, 2.5, 0)), t: 0, dur: 1.5 };
  return true;
}

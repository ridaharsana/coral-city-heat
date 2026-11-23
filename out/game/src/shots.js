// CORAL CITY HEAT — shots.js: the four staged screenshot scenes behind ?shot=cover|chase|
// shootout|systems&seed=N. Each stages the real game state (mood, vehicles, fleet, heli,
// poses, HUD, minimap) deterministically, aims a cinematic camera, and sets
// window.__shotReady — the frames are the game itself, graded light and all.
import * as THREE from 'three';
import { RADIO_STATIONS } from './config.js';
import { districtAt, roadGraph, GARAGE_POS } from './world.js';
import { MISSIONS } from './missions.js';
import { renderLiveRadarMinimap, renderFullMapOverlay, renderWeaponAndRadioWheel } from './hud.js';
import { poseAim, poseWalk, spawnTracer, spawnMuzzleFlash, spawnSparks } from './people.js';
import { updateStrobes, stageHeli } from './police.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(game, x, y, z, lx, ly, lz, fov = 47) {
  game.camera.position.set(x, y, z);
  game.camera.fov = fov; game.camera.updateProjectionMatrix();
  game.camera.lookAt(lx, ly, lz);
}
function beamTo(heli, x, y, z, tx, tz) {
  stageHeli(heli, x, y, z, tx, tz);
  const d = Math.hypot(tx - x, y, tz - z);
  heli.userData.cone.scale.set(1.1, d / 58, 1.1);
}
function parkTraffic(game) {
  game.traffic.cars.forEach((c, i) => { c.mesh.position.set(-520 + i * 9, 0, 548); c.mesh.rotation.y = 0; c.speed = 0; });
}
function placeCar(v, x, z, heading) { v.mesh.position.set(x, 0, z); v.heading = heading; v.mesh.rotation.y = heading; }
let smokeTexCache = null;
function smokeTrail(scene, x, z, dirX, dirZ) {
  if (!smokeTexCache) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(235,235,245,0.55)'); gr.addColorStop(1, 'rgba(235,235,245,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    smokeTexCache = new THREE.CanvasTexture(c);
  }
  for (let i = 0; i < 13; i++) {
    const t = i / 12;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTexCache, transparent: true, opacity: 0.66 * (1 - t * 0.7), depthWrite: false }));
    s.position.set(x + dirX * t * 17 + (i % 3 - 1) * 0.7, 0.5 + t * 1.5, z + dirZ * t * 17);
    s.scale.setScalar(1.3 + t * 4.6);
    scene.add(s);
  }
}
function hudBase(game, o) {
  const hud = game.hud;
  hud.setCash(o.cash ?? game.cash);
  hud.setStars(o.stars ?? 0);
  hud.setAlert(!!o.alert, o.alert);
  hud.setBars(o.hp ?? 100, o.ar ?? 40, o.st ?? 85);
  hud.setRadio(RADIO_STATIONS[o.radio ?? 0]);
  hud.setSwitch(game.player.protoIdx);
  hud.setWeapon(game.player.weapon, o.ammo ?? '30 / 210');
  if (o.speed) hud.setSpeed(o.speed[0], o.speed[1], o.speed[2], true); else hud.setSpeed(0, 'ON FOOT', false, false);
  if (o.district) hud.districtCard(o.district);
  if (o.banner) hud.banner(o.banner[0], o.banner[1]);
  if (o.subtitle) hud.subtitle(o.subtitle);
  if (o.objective) hud.setObjective(o.objective, o.objDist ?? 120, o.mission ?? MISSIONS[game.mission.index]);
}
function minimap(game, pos, heading, cops, objective) {
  renderLiveRadarMinimap(game.hud.mm, { pos, heading }, roadGraph(), cops || [], objective || null);
}

function shotCover(game) {
  const { world, scene, playerCar } = game;
  world.setMood('sunset'); world.followShadow(395, -40);
  parkTraffic(game);
  const h = Math.PI - 0.7;
  placeCar(playerCar, 394, -36, h);
  game.player.mesh.visible = false;
  const fx = Math.sin(h), fz = Math.cos(h);
  smokeTrail(scene, 394 - fx * 1.6, -36 - fz * 1.6, -fx, -fz);
  placeCar(game.traffic.cars[0], 404.3, -98, Math.PI);
  placeCar(game.traffic.cars[1], 395.7, -128, 0);
  placeCar(game.traffic.cars[2], 419, -66, Math.PI * 0.94);
  cam(game, 403.5, 1.8, -19, 394.5, 1.3, -37);
  hudBase(game, { stars: 0, speed: [132, '5TH GEAR', true], district: districtAt(396, -34), objective: { x: 372, z: -118 }, objDist: 88, mission: MISSIONS[0], st: 88 });
  minimap(game, playerCar.mesh.position, h, [], { x: 372, z: -118 });
}
function shotChase(game) {
  const { world, scene, playerCar, fleet } = game;
  world.setMood('dusk'); world.followShadow(10, -82);
  parkTraffic(game);
  placeCar(playerCar, 12, -81, Math.PI / 2 - 0.06);
  game.player.mesh.visible = false;
  game.wanted.stars = 4; game.wanted.heat = 4.2;
  fleet.ensureCount(scene, world, 4, playerCar.mesh.position);
  placeCar(fleet.cops[0], -13, -77.5, Math.PI / 2 + 0.12);
  placeCar(fleet.cops[1], -21, -86.5, Math.PI / 2 - 0.15);
  placeCar(fleet.cops[2], 88, -76.8, -0.5);
  placeCar(fleet.cops[3], 89, -88.5, 0.55);
  fleet.cops.forEach((c, i) => updateStrobes(c.mesh, i % 2 ? 0.52 : 0.2));
  beamTo(fleet.heli, 55, 38, -125, 12, -81);
  placeCar(game.traffic.cars[0], 56, -76.8, Math.PI / 2);
  cam(game, -40, 3.0, -73, 26, 1.5, -82, 48);
  hudBase(game, { stars: 4, alert: 'WANTED — MARISOL SHERIFF · SWAT DEPLOYED', speed: [118, '4TH GEAR', false], radio: 1, hp: 82, st: 64, district: districtAt(12, -81), banner: ['HEAT CHECK', "Lose the sheriff in Las Ciénagas"], objective: { x: -420, z: 60 }, objDist: 460, mission: MISSIONS[2] });
  minimap(game, playerCar.mesh.position, Math.PI / 2, fleet.cops, { x: -420, z: 60 });
}
function shotShootout(game) {
  const { world, scene, playerCar, fleet } = game;
  world.setMood('night'); world.followShadow(228, -208);
  parkTraffic(game);
  placeCar(playerCar, 231, -210, 1.25);
  game.wanted.stars = 4; game.wanted.heat = 4.2;
  fleet.ensureCount(scene, world, 2, V3(230, 0, -208));
  placeCar(fleet.cops[0], 214, -216, 0.5);
  placeCar(fleet.cops[1], 247, -217, -0.45);
  fleet.cops.forEach((c, i) => updateStrobes(c.mesh, i % 2 ? 0.52 : 0.2));
  beamTo(fleet.heli, 246, 30, -168, 230, -209);
  const pl = game.player;
  pl.mesh.visible = true; pl.mesh.position.set(227.5, 0, -206.5); pl.heading = Math.PI; pl.mesh.rotation.y = Math.PI;
  poseAim(pl.mesh.userData.parts);
  const dario = game.standbys[1];
  dario.mesh.visible = true; dario.mesh.position.set(234.5, 0, -205); dario.mesh.rotation.y = Math.PI;
  poseAim(dario.mesh.userData.parts);
  const flee1 = game.peds.list[0], flee2 = game.peds.list[1];
  if (flee1) { flee1.mesh.position.set(214, 0, -196); flee1.mesh.rotation.y = -Math.PI / 2; poseWalk(flee1.parts, 1.3, 1.15); }
  if (flee2) { flee2.mesh.position.set(250, 0, -199); flee2.mesh.rotation.y = Math.PI / 2; poseWalk(flee2.parts, 2.6, 1.15); }
  scene.updateMatrixWorld(true);
  const bolt = (a, b, t0, t1, col) => spawnTracer(scene, a.clone().lerp(b, t0), a.clone().lerp(b, t1), col);
  const muz = new THREE.Vector3(); pl.mesh.userData.parts.muzzle.getWorldPosition(muz);
  spawnMuzzleFlash(scene, muz, 1.15);
  bolt(muz, V3(215, 1.0, -214), 0.06, 0.62);
  const muz2 = new THREE.Vector3(); dario.mesh.userData.parts.muzzle.getWorldPosition(muz2);
  spawnMuzzleFlash(scene, muz2, 1);
  bolt(muz2, V3(245, 1.0, -215), 0.06, 0.62);
  bolt(V3(240, 1.35, -215), V3(233.5, 0.95, -211.5), 0.1, 0.66, 0xff8a6b);
  spawnSparks(scene, V3(233.5, 0.95, -211.5), 10);
  cam(game, 223.5, 2.3, -243, 231, 1.8, -204, 44);
  hudBase(game, { stars: 4, alert: 'WANTED — MARISOL SHERIFF · SWAT DEPLOYED', hp: 64, ar: 25, st: 70, radio: 2, district: districtAt(228, -207), subtitle: 'THE NATIONAL BANK JOB — Protect the getaway bag ($250,000) and reach Taller Neon to clear your heat.', objective: { x: GARAGE_POS.x, z: GARAGE_POS.z }, objDist: 512, mission: MISSIONS[3] });
  minimap(game, pl.mesh.position, Math.PI, fleet.cops, { x: GARAGE_POS.x, z: GARAGE_POS.z });
}
function shotSystems(game) {
  const { world, playerCar } = game;
  world.setMood('dusk'); world.followShadow(330, 296);
  parkTraffic(game);
  game.mission.index = 3;
  placeCar(playerCar, 330, 307, 2.6);
  const pl = game.player;
  pl.mesh.visible = true; pl.mesh.position.set(325.2, 0, 302.5); pl.mesh.rotation.y = 2.9;
  game.wanted.stars = 4;
  document.getElementById('mapWrap').style.display = 'block';
  renderFullMapOverlay(document.getElementById('mapCanvas').getContext('2d'), { playerPos: { x: 330, z: 307 }, objective: { x: 232, z: -195 }, missionIndex: 3, protoIdx: 0 });
  document.getElementById('wheelWrap').style.display = 'block';
  renderWeaponAndRadioWheel(document.getElementById('wheelCanvas').getContext('2d'), { weapon: 'CARBINE', ammo: '30 / 210', radio: RADIO_STATIONS[0] });
  cam(game, 315, 3.6, 327, 334, 2.2, 293, 48);
  hudBase(game, { cash: 262450, stars: 4, hp: 88, ar: 60, st: 92, speed: [0, 'PARKED', false], district: districtAt(330, 300), objective: { x: 330, z: 296 }, objDist: 9, mission: MISSIONS[3] });
  minimap(game, playerCar.mesh.position, 2.6, [], { x: 330, z: 296 });
}

export function stageShot(name, game) {
  if (name === 'chase') shotChase(game);
  else if (name === 'shootout') shotShootout(game);
  else if (name === 'systems') shotSystems(game);
  else shotCover(game);
  game.world.update(0.016, 2.5);
  window.__shotReady = true;
}

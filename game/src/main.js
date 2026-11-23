// CORAL CITY HEAT — boot and the one loop. Fixed-step simulation (1/60) decoupled from
// rendering; wires world, traffic, pedestrians, sheriff AI, wanted heat, the mission chain,
// HUD, audio and the protagonist switch together. Screens: title, play, pause, busted /
// wasted, complete. ?shot=<name>&seed=N stages a deterministic screenshot scene instead.
import * as THREE from 'three';
import { GAME_TITLE, SAVE_KEY, STEP, TUNING, RADIO_STATIONS, WEAPONS } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { initProceduralWebAudioEngine } from './audio.js';
import { buildProceduralCoralCity, buildEnvironmentReflections, districtAt, roadGraph } from './world.js';
import { createVehicle, createTraffic, updateVehicleArcadePhysics } from './vehicles.js';
import { PROTAGONISTS, createPersonMesh, createPedestrians, updateThirdPersonCharacter, updateEffects, bindProtagonistSwitch, switchActiveProtagonist } from './people.js';
import { createWantedState, updateWantedHeatSystem, createPoliceFleet, updatePolicePursuitAI } from './police.js';
import { MISSIONS, createMissionState, updateActiveMissionState, missionTarget } from './missions.js';
import { createHud, renderLiveRadarMinimap, renderWeaponAndRadioWheel, renderFullMapOverlay } from './hud.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.isInteger(Number.parseInt(params.get('seed') ?? '', 10)) ? Number.parseInt(params.get('seed'), 10) : 7;
const rng = createRandom(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
buildEnvironmentReflections(renderer, scene);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 6000);
camera.position.set(430, 6, -20);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const world = buildProceduralCoralCity(scene, rng);
const input = createInput();
const audio = initProceduralWebAudioEngine();
const hud = createHud();
const traffic = createTraffic(scene, world, rng, 15);
const peds = createPedestrians(scene, rng, 26);
const fleet = createPoliceFleet(scene);
const wanted = createWantedState();

// save / load
let save = { cash: TUNING.startCash, missionIndex: 0 };
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) save = { ...save, ...JSON.parse(raw) }; } catch { /* fresh */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: game.cash, missionIndex: game.mission.index })); } catch { /* off */ } };

const playerCar = createVehicle(scene, 'vesper', 372, -134, Math.PI, 0xff2e88);
const game = {
  scene, camera, renderer, world, input, audio, hud, traffic, peds, fleet, wanted,
  events: [], time: 0, screen: shotName ? 'shot' : 'title', cash: save.cash,
  mission: createMissionState(save), radioIdx: 0, mapOpen: false, wheelOpen: false,
  cameraFlight: null, camYaw: Math.PI, bustedTimer: 0, complete: false,
  player: null, standbys: [], panic: null, playerCar,
};
game.player = {
  mesh: createPersonMesh(PROTAGONISTS[0]), protoIdx: 0, heading: Math.PI, vehicle: null,
  health: 100, armor: 40, stamina: 100, weapon: 'CARBINE', camYaw: Math.PI, walkPhase: 0, fireCd: 0,
};
game.player.mesh.position.set(428, 0, -52);
scene.add(game.player.mesh);
game.standbys = PROTAGONISTS.map((p, i) => {
  const mesh = createPersonMesh(p); scene.add(mesh);
  return { mesh };
});
game.standbys[0].mesh.visible = false;
game.standbys[1].mesh.position.set(376, 0, -120); // Dario waits by the Vesper
bindProtagonistSwitch(game);

const roads = roadGraph();
const playerFacade = {
  get pos() { return game.player.vehicle ? game.player.vehicle.mesh.position : game.player.mesh.position; },
  get inCar() { return !!game.player.vehicle; },
  get carType() { return game.player.vehicle?.type; },
  get stars() { return wanted.stars; },
  events: game.events,
};
const hudFacade = {
  banner: (t, s) => { hud.banner(t, s); hud.subtitle(MISSIONS[game.mission.index]?.sub || ''); },
  subtitle: (t) => hud.subtitle(t),
  addCash: (n) => { game.cash += n; audio.pickup(); },
  complete: (title, payout, next) => {
    audio.complete(); persist();
    hud.banner(`MISSION COMPLETE — ${title}`, next ? `+$${payout.toLocaleString('en-US')} · Next: ${next.title}` : `+$${payout.toLocaleString('en-US')} · FINAL SCORE COMPLETE`);
    if (!next) { game.complete = true; showScreen('complete'); }
  },
  setObjective: (target, dist, m) => hud.setObjective(target, dist, m),
};

// tire-smoke particle pool
const smokeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(230,230,240,0.55)'); gr.addColorStop(1, 'rgba(230,230,240,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const smokes = [];
function spawnSmoke(x, y, z, big) {
  if (smokes.length > 90) return;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.5, depthWrite: false }));
  s.position.set(x, y, z); s.scale.setScalar(big ? 3.4 : 1.8); scene.add(s);
  smokes.push({ s, ttl: 0.9, vy: 2.2 });
}
function updateSmokes(dt) {
  for (let i = smokes.length - 1; i >= 0; i--) {
    const p = smokes[i]; p.ttl -= dt; p.s.position.y += p.vy * dt; p.s.scale.multiplyScalar(1 + dt * 1.6);
    p.s.material.opacity = Math.max(0, p.ttl * 0.5);
    if (p.ttl <= 0) { scene.remove(p.s); smokes.splice(i, 1); }
  }
}

const $ = (id) => document.getElementById(id);
function showScreen(name) {
  game.screen = name;
  $('titleScreen').classList.toggle('hidden', name !== 'title');
  $('pauseScreen').classList.toggle('hidden', name !== 'pause');
  $('endScreen').classList.toggle('hidden', !(name === 'busted' || name === 'wasted'));
  $('completeScreen').classList.toggle('hidden', name !== 'complete');
  if (name === 'busted') $('endTitle').textContent = 'BUSTED';
  if (name === 'wasted') $('endTitle').textContent = 'WASTED';
  $('hud').style.display = (name === 'play' || name === 'shot') ? 'block' : 'none';
}
function respawn() {
  wanted.stars = 0; wanted.heat = 0;
  game.player.health = 100; game.player.armor = 40;
  game.player.vehicle = null; game.player.mesh.visible = true;
  game.player.mesh.position.set(428, 0, -52);
  fleet.ensureCount(scene, world, 0, game.player.mesh.position);
  fleet.clearRoadblock(scene);
  showScreen('play');
}

// mission objective marker: a gold light pillar at the target
const marker = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 42, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
marker.visible = false; scene.add(marker);

function step(dt) {
  game.time += dt;
  const pl = game.player, events = game.events;
  events.length = 0;
  const pos = playerFacade.pos;
  // --- player: drive or walk
  if (pl.vehicle) {
    const v = pl.vehicle;
    const driveInput = {
      throttle: input.axis('KeyS', 'KeyW'), steer: input.axis('KeyD', 'KeyA'),
      handbrake: input.down('Space'), nitro: input.down('ShiftLeft') || input.down('ShiftRight'),
    };
    updateVehicleArcadePhysics(v, driveInput, dt, world);
    if (v.crashed > 13) { events.push('crash'); pl.health -= (v.crashed - 11) * (pl.armor > 0 ? 0.4 : 1); if (pl.armor > 0) pl.armor = Math.max(0, pl.armor - 6); audio.crash(); }
    if (v.drifting && Math.random() < 0.6) {
      const back = new THREE.Vector3(-Math.sin(v.heading), 0, -Math.cos(v.heading)).multiplyScalar(2);
      spawnSmoke(v.mesh.position.x + back.x, 0.7, v.mesh.position.z + back.z, false);
      audio.screech(0.7);
    }
    if (input.actionEnter()) { // step out beside the car
      pl.vehicle = null; pl.mesh.visible = true;
      pl.mesh.position.set(v.mesh.position.x + Math.cos(v.heading) * 2.6, 0, v.mesh.position.z - Math.sin(v.heading) * 2.6);
      pl.heading = v.heading;
    }
    pl.camYaw += ((v.heading + Math.PI) - pl.camYaw) * 0; // chase cam uses heading directly
  } else {
    pl.camYaw -= input.mouseDX * 0.004;
    const before = pl.mesh.position.clone();
    const res = updateThirdPersonCharacter(pl, input, world, dt, {
      vehicles: [...traffic.cars, ...fleet.cops, playerCar], events, scene, audio,
    });
    if (res === 'entered' && pl.vehicle) audio.start();
    if (game.panic) game.panic.t -= dt;
    if (pl.mesh.position.distanceTo(before) > 0.01) { /* moved */ }
  }
  // --- world life
  traffic.update(dt, pos);
  peds.update(dt, game.panic && game.panic.t > 0 ? game.panic : null);
  // traffic hits a walking player
  if (!pl.vehicle) for (const c of traffic.cars) {
    if (Math.abs(c.speed) > 5 && c.mesh.position.distanceTo(pl.mesh.position) < 2.4) {
      pl.health -= 22; pl.mesh.position.x += Math.sin(c.heading) * 3; pl.mesh.position.z += Math.cos(c.heading) * 3;
      events.push('crash'); audio.crash();
    }
  }
  // car-vs-car bumps for the player's vehicle
  if (pl.vehicle) for (const other of [...traffic.cars, ...fleet.cops, ...fleet.roadblock, playerCar]) {
    if (other === pl.vehicle) continue;
    const d = pl.vehicle.mesh.position.distanceTo(other.mesh.position);
    if (d < 4.4 && d > 0.01) {
      const push = pl.vehicle.mesh.position.clone().sub(other.mesh.position).normalize().multiplyScalar((4.4 - d) / 2);
      pl.vehicle.mesh.position.add(push);
      if (Math.abs(pl.vehicle.speed) > 10) { events.push(other.isCop ? 'cop' : 'crash'); pl.vehicle.speed *= 0.55; audio.crash(); }
    }
  }
  // --- missions, wanted, police
  updateActiveMissionState(game.mission, playerFacade, hudFacade, dt);
  const wantCount = TUNING.copCountByStars[wanted.stars] || 0;
  fleet.ensureCount(scene, world, wantCount, pos);
  if (wanted.stars >= TUNING.roadblockStars && fleet.roadblockFor !== wanted.stars) {
    fleet.clearRoadblock(scene);
    fleet.roadblockFor = wanted.stars;
    const ahead = new THREE.Vector3(Math.sin(pl.heading || 0), 0, Math.cos(pl.heading || 0)).multiplyScalar(110);
    for (const off of [-6, 6]) {
      const rb = createVehicle(scene, 'interceptor', pos.x + ahead.x + off, pos.z + ahead.z, Math.PI / 2, 0xf0f2f5);
      rb.mesh.userData.strobe = rb.mesh.userData.strobe; fleet.roadblock.push(rb);
    }
  }
  if (wanted.stars < TUNING.roadblockStars && fleet.roadblock.length) fleet.clearRoadblock(scene);
  const seen = updatePolicePursuitAI(fleet.cops, fleet.heli, { pos, vel: pl.vehicle ? { x: Math.sin(pl.vehicle.heading) * pl.vehicle.speed, z: Math.cos(pl.vehicle.heading) * pl.vehicle.speed } : { x: 0, z: 0 }, stars: wanted.stars }, dt, fleet, scene);
  if (seen) wanted.seenTimer = 2.5;
  updateWantedHeatSystem(wanted, events, dt);
  // busted: a cop holds you on foot
  if (!pl.vehicle && wanted.stars > 0 && fleet.cops.some((c) => c.mesh.position.distanceTo(pl.mesh.position) < 4)) {
    game.bustedTimer += dt; if (game.bustedTimer > 1.6) { showScreen('busted'); return; }
  } else game.bustedTimer = 0;
  if (pl.health <= 0) { showScreen('wasted'); return; }
  // --- audio + fx
  audio.setEngine(pl.vehicle ? Math.abs(pl.vehicle.speed) / pl.vehicle.spec.topSpeed : 0, !!pl.vehicle);
  audio.setSiren(wanted.stars > 0 && fleet.cops.length > 0, Math.min(1, (fleet.cops[0]?.mesh.position.distanceTo(pos) ?? 90) / 90));
  audio.update(dt);
  updateEffects(dt); updateSmokes(dt);
  world.update(dt, game.time);
  world.followShadow(pos.x, pos.z);
  const tgt = missionTarget(game.mission);
  marker.visible = !!tgt && game.screen === 'play';
  if (tgt) marker.position.set(tgt.x, 21, tgt.z);
}

function updateHud() {
  const pl = game.player, pos = playerFacade.pos;
  hud.setCash(game.cash);
  hud.setStars(wanted.stars);
  hud.setAlert(wanted.stars >= 2, `WANTED — MARISOL SHERIFF · ${wanted.stars} STAR${wanted.stars > 1 ? 'S' : ''}`);
  hud.setBars(Math.max(0, pl.health), pl.armor, pl.stamina);
  const v = pl.vehicle;
  hud.setSpeed(v ? Math.abs(v.speed) * 2.6 : 0, v ? (v.speed < -0.5 ? 'REV' : `${Math.min(6, 1 + Math.floor(Math.abs(v.speed) / 9))}TH GEAR`) : 'ON FOOT', v ? v.nitro > 0.4 : false, !!v);
  hud.setRadio(RADIO_STATIONS[game.radioIdx]);
  hud.setWeapon(pl.weapon, pl.weapon === 'FISTS' ? '' : '30 / 210');
  hud.districtCard(districtAt(pos.x, pos.z));
  hud.update(1 / 60, game.time);
  renderLiveRadarMinimap(hud.mm, { pos, heading: pl.vehicle ? pl.vehicle.heading : pl.camYaw + Math.PI }, roads, fleet.cops, missionTarget(game.mission));
  const prompt = $('prompt');
  if (!pl.vehicle) {
    const near = [...traffic.cars, playerCar].some((c) => c.mesh.position.distanceTo(pl.mesh.position) < 5.2);
    prompt.textContent = near ? 'E — ENTER VEHICLE' : '';
  } else prompt.textContent = 'E — EXIT · SHIFT — NITRO · SPACE — HANDBRAKE';
}

function frameCamera(dt) {
  const pl = game.player;
  if (game.cameraFlight) {
    const f = game.cameraFlight; f.t += dt;
    const u = Math.min(1, f.t / f.dur), arc = Math.sin(u * Math.PI) * 260;
    camera.position.lerpVectors(f.from, f.to, u); camera.position.y += arc;
    camera.lookAt(pl.mesh.position.x, 2, pl.mesh.position.z);
    if (u >= 1) game.cameraFlight = null;
    return;
  }
  if (pl.vehicle) {
    const v = pl.vehicle, back = 11 + Math.abs(v.speed) * 0.06;
    const want = new THREE.Vector3(
      v.mesh.position.x - Math.sin(v.heading) * back,
      4.4 + Math.abs(v.speed) * 0.02,
      v.mesh.position.z - Math.cos(v.heading) * back);
    camera.position.lerp(want, Math.min(1, dt * 5));
    camera.lookAt(v.mesh.position.x + Math.sin(v.heading) * 8, 1.6, v.mesh.position.z + Math.cos(v.heading) * 8);
    const targetFov = v.nitroOn ? 74 : 62 + Math.abs(v.speed) * 0.12;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
  } else {
    const p = pl.mesh.position, d = 8.5;
    const want = new THREE.Vector3(p.x - Math.sin(pl.camYaw) * d, 3.6, p.z - Math.cos(pl.camYaw) * d);
    camera.position.lerp(want, Math.min(1, dt * 9));
    camera.lookAt(p.x + Math.sin(pl.camYaw) * 6, 1.7, p.z + Math.cos(pl.camYaw) * 6);
    camera.fov += (62 - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
  }
}

let last = performance.now(), acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  let frame = Math.min(0.25, (now - last) / 1000); last = now;
  if (game.screen === 'play') {
    acc += frame;
    while (acc >= STEP) { step(STEP); acc -= STEP; if (game.screen !== 'play') break; }
    if (input.actionPause()) showScreen('pause');
    if (input.actionSwitch()) {
      const other = PROTAGONISTS[1 - game.player.protoIdx].name;
      if (switchActiveProtagonist(other, camera)) { hud.setSwitch(game.player.protoIdx); hud.banner(PROTAGONISTS[game.player.protoIdx].name.toUpperCase(), PROTAGONISTS[game.player.protoIdx].role + ' — now active'); }
    }
    if (input.actionMap()) {
      game.mapOpen = !game.mapOpen;
      $('mapWrap').style.display = game.mapOpen ? 'block' : 'none';
      if (game.mapOpen) renderFullMapOverlay($('mapCanvas').getContext('2d'), {
        playerPos: playerFacade.pos, objective: missionTarget(game.mission),
        missionIndex: game.mission.index, protoIdx: game.player.protoIdx,
      });
    }
    game.wheelOpen = input.actionWheel();
    $('wheelWrap').style.display = game.wheelOpen ? 'block' : 'none';
    if (game.wheelOpen) {
      renderWeaponAndRadioWheel($('wheelCanvas').getContext('2d'), { weapon: game.player.weapon, ammo: '30 / 210', radio: RADIO_STATIONS[game.radioIdx] });
      for (let i = 0; i < 8; i++) if (input.hit('Digit' + (i + 1))) game.player.weapon = WEAPONS[i];
      if (input.hit('KeyR')) { game.radioIdx = (game.radioIdx + 1) % RADIO_STATIONS.length; audio.setRadio(RADIO_STATIONS[game.radioIdx]); }
    }
    frameCamera(frame);
    updateHud();
  } else if (game.screen === 'title') {
    const t = now / 1000;
    camera.position.set(430 + Math.sin(t * 0.07) * 30, 26, -160 + Math.cos(t * 0.05) * 20);
    camera.lookAt(330, 8, 40);
    if (input.actionConfirm()) { audio.start(); audio.setRadio(RADIO_STATIONS[0]); showScreen('play'); hud.banner(MISSIONS[game.mission.index]?.title || 'FREE ROAM', MISSIONS[game.mission.index]?.sub || ''); }
  } else if (game.screen === 'pause' || game.screen === 'complete') {
    if (input.actionConfirm() || input.actionPause()) showScreen('play');
  } else if (game.screen === 'busted' || game.screen === 'wasted') {
    if (input.actionConfirm()) respawn();
  }
  input.endFrame();
  renderer.render(scene, camera);
}

// boot
hud.setCash(game.cash); hud.setSwitch(0); hud.setRadio(RADIO_STATIONS[0]);
if (shotName) {
  showScreen('shot');
  stageShot(shotName, game);
  // Keep presenting the staged frame until the screenshot is taken: renders done during
  // module evaluation never reach the compositor, and a stopped loop loses the surface,
  // so a static screenshot would come out black without this.
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
} else {
  showScreen('title');
  requestAnimationFrame(loop);
}
document.title = GAME_TITLE;

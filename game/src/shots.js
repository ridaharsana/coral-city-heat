// Deterministic screenshot scenes behind ?shot=cover|chase|shootout|systems&seed=7. Each
// scene stages the REAL game state (the same world, vehicles, fleet, HUD the player gets),
// sets the sky mood, places the camera, paints the HUD and minimap, renders, and only then
// sets window.__shotReady — so every screenshot is an honest frame of the shipped game.
import * as THREE from 'three';
import { RADIO_STATIONS } from './config.js';
import { districtAt } from './world.js';
import { createVehicle } from './vehicles.js';
import { animatePerson, spawnTracer } from './people.js';
import { renderLiveRadarMinimap, renderWeaponAndRadioWheel, renderFullMapOverlay } from './hud.js';
import { MISSIONS } from './missions.js';

function smokeSprite(scene, x, y, z, scale, opacity) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, `rgba(235,235,245,${opacity})`); gr.addColorStop(1, 'rgba(235,235,245,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.position.set(x, y, z); s.scale.setScalar(scale); scene.add(s);
}

function baseHud(game, cash) {
  const hud = game.hud;
  hud.setCash(cash); hud.setBars(100, 40, 100); hud.setSwitch(game.player.protoIdx);
  hud.setRadio(RADIO_STATIONS[0]);
  return hud;
}

function paint(game) {
  game.renderer.render(game.scene, game.camera);
  game.renderer.render(game.scene, game.camera);
}

export function stageShot(name, game) {
  const { scene, camera, hud, world, player, fleet } = game;
  const car = game.playerCar;
  document.getElementById('hud').style.display = 'block';
  if (name === 'chase') return chase(game);
  if (name === 'shootout') return shootout(game);
  if (name === 'systems') return systems(game);
  // ---- COVER: sunset drift on the Coral Beach avenue
  world.setMood('sunset');
  baseHud(game, 12450);
  car.mesh.position.set(390, 0, -30); car.heading = 0.42; car.mesh.rotation.y = 0.42;
  car.speed = 34; car.steerVis = -0.4; car.mesh.rotation.z = 0.05;
  car.mesh.userData.flame.visible = false;
  player.vehicle = car; player.mesh.visible = false;
  game.traffic.cars.forEach((c, i) => { // oncoming + ahead traffic on the beach streets
    const spots = [[377, 26, Math.PI], [403, 95, 0], [377, -150, Math.PI], [130, -64, Math.PI / 2]];
    const s = spots[i % spots.length];
    c.mesh.position.set(s[0], 0, s[1]); c.mesh.rotation.y = s[2]; c.heading = s[2];
  });
  for (let i = 0; i < 6; i++) smokeSprite(scene, 390 - i * 0.85, 0.7 + i * 0.16, -31.5 - i * 1.9, 1.3 + i * 0.45, 0.34);
  camera.position.set(381.5, 2.3, -40.5); camera.lookAt(393, 1.2, -22);
  camera.fov = 58; camera.updateProjectionMatrix();
  hud.setSpeed(132, '5TH GEAR', true, true);
  hud.setWeapon('PISTOL', '');
  hud.setObjective({ x: 372, z: -118 }, 96, MISSIONS[0]);
  hud.districtCard(districtAt(390, -30));
  renderLiveRadarMinimap(hud.mm, { pos: car.mesh.position, heading: 0.42 }, game.world ? { avenues: [-390, -260, -130, 0, 130, 260, 390], streets: [-390, -260, -130, 0, 130, 260, 390] } : null, [], { x: 372, z: -118 });
  paint(game);
  window.__shotReady = true;
}

function chase(game) {
  const { scene, camera, hud, world, player, fleet } = game;
  world.setMood('dusk');
  baseHud(game, 8610);
  const car = game.playerCar;
  car.mesh.position.set(0, 0, 2); car.heading = Math.PI / 2; car.mesh.rotation.y = Math.PI / 2; car.speed = 40;
  player.vehicle = car; player.mesh.visible = false;
  const copA = createVehicle(scene, 'interceptor', -27, -5, Math.PI / 2, 0xf0f2f5);
  const copB = createVehicle(scene, 'interceptor', -32, 8, Math.PI / 2, 0xf0f2f5);
  copA.mesh.userData.strobe.red.color.setHex(0xff2438); copA.mesh.userData.strobe.blue.color.setHex(0x101c57);
  copB.mesh.userData.strobe.red.color.setHex(0x57101c); copB.mesh.userData.strobe.blue.color.setHex(0x2f6bff);
  fleet.cops.push(copA, copB);
  const rbA = createVehicle(scene, 'interceptor', 88, -7, Math.PI / 2 + 0.5, 0xf0f2f5);
  const rbB = createVehicle(scene, 'interceptor', 88, 8, Math.PI / 2 - 0.5, 0xf0f2f5);
  fleet.heli.mesh.visible = true;
  fleet.heli.mesh.position.set(12, 44, -8); fleet.heli.spot.intensity = 900;
  game.wanted.stars = 4;
  hud.setStars(4);
  hud.setAlert(true, 'WANTED — MARISOL SHERIFF · SWAT DEPLOYED');
  hud.banner('HEAT CHECK', 'Lose the sheriff in Las Ciénagas — break line of sight.');
  hud.setSpeed(118, '5TH GEAR', true, true);
  hud.setWeapon('CARBINE', '30 / 210');
  hud.setObjective({ x: -420, z: 60 }, 388, MISSIONS[2]);
  hud.districtCard(districtAt(0, 2));
  camera.position.set(-47, 3.4, -11); camera.lookAt(45, 1.2, 2);
  camera.fov = 60; camera.updateProjectionMatrix();
  renderLiveRadarMinimap(hud.mm, { pos: car.mesh.position, heading: Math.PI / 2 }, { avenues: [-390, -260, -130, 0, 130, 260, 390], streets: [-390, -260, -130, 0, 130, 260, 390] }, fleet.cops, { x: -420, z: 60 });
  paint(game);
  window.__shotReady = true;
}

function shootout(game) {
  const { scene, camera, hud, world, player, fleet } = game;
  world.setMood('night');
  baseHud(game, 248500);
  const car = game.playerCar;
  car.mesh.position.set(258, 0, -192); car.heading = Math.PI + 0.3; car.mesh.rotation.y = car.heading;
  player.mesh.position.set(254, 0, -179); player.heading = Math.PI; player.mesh.rotation.y = Math.PI;
  player.weapon = 'CARBINE';
  // the player figure is Dario in this scene: recolour him (Paloma keeps her pink)
  player.mesh.userData.torso.material = new THREE.MeshLambertMaterial({ color: 0x22384f });
  player.mesh.children.forEach((ch) => { if (ch.position.y > 1.6 && ch.position.y < 1.85) ch.material = new THREE.MeshLambertMaterial({ color: 0x8a5a3a }); });
  animatePerson(player.mesh, 0, 2.2, true);
  const paloma = game.standbys[0].mesh;
  paloma.visible = true; paloma.position.set(248.5, 0, -176); paloma.rotation.y = Math.PI;
  animatePerson(paloma, 0, 3.1, true);
  game.standbys[1].mesh.visible = false;
  const copA = createVehicle(scene, 'interceptor', 262, -216, 0, 0xf0f2f5);
  const copB = createVehicle(scene, 'interceptor', 269, -229, 0.35, 0xf0f2f5);
  copA.mesh.userData.strobe.red.color.setHex(0xff2438);
  copB.mesh.userData.strobe.blue.color.setHex(0x2f6bff);
  fleet.cops.push(copA, copB);
  fleet.heli.mesh.visible = true;
  fleet.heli.mesh.position.set(258, 44, -198); fleet.heli.spot.intensity = 900;
  spawnTracer(scene, new THREE.Vector3(254.5, 1.5, -180), new THREE.Vector3(262, 1.1, -214));
  spawnTracer(scene, new THREE.Vector3(262, 1.4, -213), new THREE.Vector3(256, 1.2, -184));
  spawnTracer(scene, new THREE.Vector3(249, 1.5, -177.5), new THREE.Vector3(268, 1.0, -226));
  game.wanted.stars = 4;
  hud.setStars(4);
  hud.setAlert(true, 'WANTED — MARISOL SHERIFF · SWAT DEPLOYED');
  hud.setWeapon('CARBINE', '30 / 210');
  hud.setSpeed(0, 'ON FOOT', false, false);
  hud.subtitle('THE NATIONAL BANK JOB: Protect the getaway bag ($250,000) and reach Taller Neon to clear your heat.');
  hud.setObjective({ x: 330, z: 296 }, 512, MISSIONS[3]);
  camera.position.set(248, 2.5, -163); camera.lookAt(260, 1.5, -203);
  camera.fov = 55; camera.updateProjectionMatrix();
  renderLiveRadarMinimap(hud.mm, { pos: player.mesh.position, heading: Math.PI }, { avenues: [-390, -260, -130, 0, 130, 260, 390], streets: [-390, -260, -130, 0, 130, 260, 390] }, fleet.cops, { x: 330, z: 296 });
  paint(game);
  window.__shotReady = true;
}

function systems(game) {
  const { camera, hud, world, player } = game;
  world.setMood('evening');
  baseHud(game, 248500);
  const car = game.playerCar;
  car.mesh.position.set(330, 0, 300); car.heading = Math.PI; car.mesh.rotation.y = Math.PI;
  player.mesh.position.set(324.5, 0, 303); player.mesh.rotation.y = Math.PI;
  hud.setSpeed(0, 'ON FOOT', false, false);
  hud.setWeapon('CARBINE', '30 / 210');
  hud.setObjective({ x: 232, z: -195 }, 540, MISSIONS[3]);
  hud.districtCard({ name: 'Port Azahar', sub: 'cranes and cargo' });
  document.getElementById('mapWrap').style.display = 'block';
  document.getElementById('wheelWrap').style.display = 'block';
  renderFullMapOverlay(document.getElementById('mapCanvas').getContext('2d'), {
    playerPos: { x: 330, z: 300 }, objective: { x: 232, z: -195 }, missionIndex: 3, protoIdx: 0,
  });
  renderWeaponAndRadioWheel(document.getElementById('wheelCanvas').getContext('2d'), {
    weapon: 'CARBINE', ammo: '30 / 210', radio: { id: 'onda', name: 'ONDA 98.5' },
  });
  renderLiveRadarMinimap(hud.mm, { pos: player.mesh.position, heading: Math.PI }, { avenues: [-390, -260, -130, 0, 130, 260, 390], streets: [-390, -260, -130, 0, 130, 260, 390] }, [], { x: 232, z: -195 });
  camera.position.set(316, 6.5, 272); camera.lookAt(334, 3, 322);
  camera.fov = 55; camera.updateProjectionMatrix();
  paint(game);
  window.__shotReady = true;
}

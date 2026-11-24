// CORAL CITY HEAT — shots.js: the four staged scenes behind ?shot=cover|chase|shootout|systems&seed=N, golden hour.
import * as THREE from 'three';
import { RADIO_STATIONS } from './config.js';
import { roadGraph,GARAGE_POS } from './world.js';
import { MISSIONS } from './missions.js';
import { renderLiveRadarMinimap,renderGaragePanel,renderTitleScreen } from './hud.js';
import { createPersonMesh,poseAim,poseWalk,spawnTracer,spawnMuzzleFlash,spawnSparks } from './people.js';
import { createVehicle } from './vehicles.js';
import { updateStrobes,stageHeli } from './police.js';
const V3 = (x,y,z) => new THREE.Vector3(x,y,z);
function cam(game,x,y,z,lx,ly,lz,fov = 47) {
 game.camera.position.set(x,y,z);
 game.camera.fov = fov; game.camera.updateProjectionMatrix();
 game.camera.lookAt(lx,ly,lz);
}
function beamTo(heli,x,y,z,tx,tz) {
 stageHeli(heli,x,y,z,tx,tz);
 const d = Math.hypot(tx - x,y,tz - z);
 heli.userData.cone.scale.set(1.1,d / 58,1.1);
}
function parkTraffic(game) { game.traffic.cars.forEach((c,i) => { c.mesh.position.set(-520 + i * 9,0,548); c.mesh.rotation.y = 0; c.speed = 0; }); }
function placeCar(v,x,z,heading,y = 0) { v.mesh.position.set(x,y,z); v.heading = heading; v.mesh.rotation.y = heading; v.mesh.rotation.z = 0; }
let smokeTexCache = null;
function puffTex() {
 if (!smokeTexCache) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,'rgba(255,255,255,0.6)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0,0,64,64);
  smokeTexCache = new THREE.CanvasTexture(c);
 }
 return smokeTexCache;
}
function smokeTrail(scene,x,z,dirX,dirZ,dark = false,n = 13,rise = 1.5) {
 for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:puffTex(),color:dark ? 0x2a2a30 : 0xffffff,transparent:true,opacity:(dark ? 0.62 : 0.6) * (1 - t * 0.55),depthWrite:false }));
  s.position.set(x + dirX * t * 17 + (i % 3 - 1) * 0.7,0.5 + t * rise,z + dirZ * t * 17);
  s.scale.setScalar(1.3 + t * 4.6);
  scene.add(s);
 }
}
function explosion(scene,x,z) {
 const cols = [0xffe9a8,0xffd23e,0xff9f43,0xff6b35,0xff4757];
 [[0,1.1,0,2.5],[1.7,1.7,0.6,1.8],[-1.6,1.5,-0.5,1.6],[0.5,2.9,-0.4,1.4],[-0.7,2.5,0.8,1.15]].forEach(([dx,y,dz,r],i) => {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r,12,10),new THREE.MeshBasicMaterial({ color:cols[i % cols.length] }));
  s.position.set(x + dx,y,z + dz); scene.add(s);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:puffTex(),color:0xff9f43,transparent:true,opacity:0.55,blending:THREE.AdditiveBlending,depthWrite:false }));
  glow.position.set(x + dx,y,z + dz); glow.scale.setScalar(r * 3.4); scene.add(glow);
 });
 for (let i = 0; i < 6; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:puffTex(),color:0x17171c,transparent:true,opacity:0.66 - i * 0.07,depthWrite:false }));
  s.position.set(x + (i % 3 - 1) * 0.9,4.4 + i * 2.3,z + (i % 2) * 0.8);
  s.scale.setScalar(3.4 + i * 1.15); scene.add(s);
 }
 const debM = new THREE.MeshStandardMaterial({ color:0x1c1e24,roughness:0.9 });
 for (let i = 0; i < 8; i++) {
  const d = new THREE.Mesh(new THREE.TetrahedronGeometry(0.32 + (i % 3) * 0.14),debM);
  const a = i * 2.4;
  d.position.set(x + Math.cos(a) * (2.6 + (i % 4)),0.3,z + Math.sin(a) * (2.6 + (i % 3)));
  d.rotation.set(i,i * 1.7,i * 0.6); d.castShadow = true; scene.add(d);
 }
}
let markerTex = null;
function guardMarker(scene,x,z) {
 if (!markerTex) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ff2438'; g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(10,14); g.lineTo(54,14); g.lineTo(32,52); g.closePath(); g.fill(); g.stroke();
  markerTex = new THREE.CanvasTexture(c);
 }
 const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:markerTex,transparent:true,depthWrite:false }));
 s.position.set(x,2.5,z); s.scale.setScalar(0.85); scene.add(s);
}
const GUARD = {name:'Guard',short:'GRD',role:'Syndicate',skin:0xa06a44,hair:0x14100c,jacket:0x1d2126,shirt:0x11131a,pants:0x14161c,stats:{}};
function guard(game,x,z,ry) {
 const m = createPersonMesh({ ...GUARD,skin:[0xa06a44,0x8a5a3c,0xc98a64][Math.abs(Math.floor(x * 7 + z)) % 3] });
 m.position.set(x,0,z); m.rotation.y = ry; game.scene.add(m);
 poseAim(m.userData.parts);
 guardMarker(game.scene,x,z);
 return m;
}
function handsUp(P) {
 P.armL.sh.rotation.set(-2.85,0,0.55); P.armR.sh.rotation.set(-2.85,0,-0.55);
 P.armL.el.rotation.x = -0.25; P.armR.el.rotation.x = -0.25;
 P.rifle.visible = false;
}
function crowd(game,spots) {
 spots.forEach(([x,z,ry,mode,ph],i) => {
  const p = game.peds.list[i % game.peds.list.length];
  p.mesh.position.set(x,0,z); p.mesh.rotation.y = ry;
  if (mode === 'up') handsUp(p.parts);
  else if (mode === 'walk') poseWalk(p.parts,ph || 1.2,0.9);
 });
}
function hudBase(game,o) {
 const hud = game.hud;
 hud.setCash(o.cash ?? game.cash);
 hud.setStars(o.stars ?? 0);
 hud.setAlert(!!o.alert,o.alert);
 hud.setBars(o.hp ?? 100,o.ar ?? 40,o.st ?? 85);
 hud.setRadio(RADIO_STATIONS[o.radio ?? 0]);
 hud.setSwitch(game.player.protoIdx);
 hud.setWeapon(game.player.weapon,o.ammo ?? '30 / 210');
 if (o.speed) hud.setSpeed(o.speed[0],o.speed[1],o.speed[2],true); else hud.setSpeed(0,'ON FOOT',false,false);
 if (o.objective) hud.setObjective(o.objective,o.objDist ?? 120,o.mission ?? MISSIONS[game.mission.index]);
}
function minimap(game,pos,heading,cops,objective) {
 renderLiveRadarMinimap(game.hud.mm,{ pos,heading },roadGraph(),cops || [],objective || null);
}
const MATEO = {name:'UNCLE MATEO',role:'FIXER · HARBOR CREW',skin:'#8a5a3c',hair:'#6b6259',cloth:'#8a6d3b',bg:'#2c3444'};
const JUNO = {name:'JUNO VEGA',role:'DECOY · STREET CREW',skin:'#e0aa7c',hair:'#101418',cloth:'#2e8f86',bg:'#20303a'};
function shotCover(game) {
 const { world,scene,playerCar,fleet } = game;
 world.setMood('golden'); world.followShadow(400,170);
 parkTraffic(game);
 const h = Math.PI - 0.16;
 placeCar(playerCar,400,185,h);
 game.player.mesh.visible = false;
 const fx = Math.sin(h),fz = Math.cos(h);
 smokeTrail(scene,400 - fx * 1.8,185 - fz * 1.8,-fx,-fz);
 game.wanted.stars = 4; game.wanted.heat = 4.2;
 fleet.ensureCount(scene,world,4,playerCar.mesh.position);
 placeCar(fleet.cops[0],392.6,196,Math.PI - 0.05);
 placeCar(fleet.cops[1],407.6,191,Math.PI - 0.28);
 placeCar(fleet.cops[2],391,47,Math.PI / 2 + 0.5);
 placeCar(fleet.cops[3],415,55,Math.PI / 2 - 0.6);
 fleet.cops.forEach((c,i) => updateStrobes(c.mesh,i % 2 ? 0.52 : 0.2));
 const gun = game.peds.list[24];
 gun.mesh.position.set(406.6,-0.52,189.6); gun.mesh.rotation.y = Math.PI - 0.4;
 poseAim(gun.parts);
 beamTo(fleet.heli,378,38,120,400,185);
 fleet.heli.userData.pool.material.opacity = 0.1;
 const wreck = createVehicle(scene,'interceptor',404,51,0.9,0x2a2c30);
 wreck.mesh.rotation.z = 0.38; wreck.mesh.position.y = 0.25;
 explosion(scene,404,51);
 placeCar(game.traffic.cars[1],386,140,Math.PI);
 crowd(game,[
  [388.6,96,0.4,'walk',1.1],[388.6,148,-0.3,'walk',2.4],[411.4,104,2.8,'walk',0.6],
  [411.4,156,3.4,'walk',1.9],[388.6,66,0.2,'walk',3.1],[411.4,74,3.0,'walk',2.2],
  [421,96,1.4,'walk',1.5],[421,150,2.2,'walk',0.9],[388.6,178,-0.2,'walk',2.8],
  [411.4,186,3.2,'walk',1.4],[421,44,1.8,'walk',2.6],[388.6,30,0.1,'walk',0.4],
  [421,196,2.6,'walk',3.3],[411.4,18,3.1,'walk',1.7],[388.6,204,-0.4,'walk',2.0],
  [424,128,1.2,'walk',0.8],[421,168,2.0,'walk',2.9],
 ]);
 cam(game,396,2.3,204,424,3.2,96,48);
 hudBase(game,{ stars:4,alert:'WANTED — MARISOL SHERIFF · SWAT DEPLOYED',speed:[128,'5TH GEAR',true],radio:0,hp:82,ar:58,st:76,objective:{ x:GARAGE_POS.x,z:GARAGE_POS.z },objDist:190,mission:MISSIONS[3] });
 game.hud.stagePanels('chase',{ dialogue:{ ...MATEO,text:'Every cruiser in the bay and Air One have eyes on that coral Vesper! Punch it across the bridge before they seal the pier!' } });
 minimap(game,playerCar.mesh.position,h,fleet.cops,{ x:GARAGE_POS.x,z:GARAGE_POS.z });
}
function shotChase(game) {
 const { world,scene,playerCar,fleet } = game;
 world.setMood('golden'); world.followShadow(424,-96);
 parkTraffic(game);
 placeCar(playerCar,402,-128,0.4);
 game.wanted.stars = 4; game.wanted.heat = 4.2;
 fleet.ensureCount(scene,world,1,V3(420,0,-96));
 placeCar(fleet.cops[0],407,-76,0.7);
 updateStrobes(fleet.cops[0].mesh,0.3);
 const pl = game.player;
 pl.mesh.visible = true; pl.mesh.position.set(416,0,-90.5); pl.heading = Math.PI / 2; pl.mesh.rotation.y = Math.PI / 2;
 poseAim(pl.mesh.userData.parts);
 const dario = game.standbys[1];
 dario.mesh.visible = true; dario.mesh.position.set(421.5,0,-99.5); dario.mesh.rotation.y = Math.PI / 2;
 poseAim(dario.mesh.userData.parts);
 const g1 = guard(game,439,-89,-Math.PI / 2);
 guard(game,443,-99,-Math.PI / 2 + 0.3);
 guard(game,437,-105,-Math.PI / 2 - 0.4);
 createVehicle(scene,'marlin',447,-83,0.5,0x17181c);
 smokeTrail(scene,447,-83,0.15,-0.2,true,6,5.5);
 const flame = new THREE.Mesh(new THREE.SphereGeometry(0.9,10,8),new THREE.MeshBasicMaterial({ color:0xff8a3c }));
 flame.position.set(446.4,1.15,-83.6); flame.scale.y = 1.5; scene.add(flame);
 createVehicle(scene,'taxi',430,-84,0.35,0xf2b821);
 crowd(game,[
  [428,-88,1.2,'up'],[433,-100,-0.8,'up'],[424,-100,2.4,'up'],
  [434,-92,0.4,'walk',1.3],[438,-108,2.9,'walk',2.1],[440,-95,1.8,'walk',0.7],
 ]);
 scene.updateMatrixWorld(true);
 const bolt = (a,b,t0,t1,col) => spawnTracer(scene,a.clone().lerp(b,t0),a.clone().lerp(b,t1),col);
 const muz = new THREE.Vector3(); pl.mesh.userData.parts.muzzle.getWorldPosition(muz);
 spawnMuzzleFlash(scene,muz,0.5);
 bolt(muz,V3(438.6,1.1,-89.4),0.05,0.7);
 const muz2 = new THREE.Vector3(); dario.mesh.userData.parts.muzzle.getWorldPosition(muz2);
 spawnMuzzleFlash(scene,muz2,0.45);
 bolt(muz2,V3(442.6,1.1,-98.6),0.05,0.7);
 const gm = new THREE.Vector3(); g1.userData.parts.muzzle.getWorldPosition(gm);
 spawnMuzzleFlash(scene,gm,0.45);
 bolt(gm,V3(419,1.2,-92),0.08,0.6,0xff8a6b);
 spawnSparks(scene,V3(430,0.9,-95),9);
 cam(game,407.5,2.9,-83.5,435,1.2,-96.5,52);
 hudBase(game,{ stars:4,alert:'WANTED — MARISOL SHERIFF · SWAT DEPLOYED',hp:82,ar:58,st:80,radio:2 });
 game.hud.stagePanels('shootout',{
  mission:{ job:'[JOB 3/8]',title:'SALT & SIRENS · Uncle Mateo',timer:'0:42',stage:2,stages:3,stageLabel:'STAGE 2/3',obj:'CLEAR THE PIER — drop the syndicate guards',next:'[NEXT] Take the Sunline Cab to Dockside Customs' },
  dialogue:{ ...JUNO,text:'Guards on the pier, Paloma — drop them loud, I will keep the Sunline running. Take the cab the second it is clear!' },
  prompt:['[F] STEAL SUNLINE CAB','71%','48.5%'],
 });
 minimap(game,pl.mesh.position,Math.PI / 2,fleet.cops,{ x:GARAGE_POS.x,z:GARAGE_POS.z });
}
function shotShootout(game) {
 const { world,playerCar } = game;
 world.setMood('golden'); world.followShadow(330,296);
 parkTraffic(game);
 game.mission.index = 3;
 placeCar(playerCar,GARAGE_POS.x - 4,GARAGE_POS.z,0.12,1.06);
 const pl = game.player;
 pl.mesh.visible = true; pl.mesh.position.set(330,0,292.5); pl.mesh.rotation.y = -0.7;
 const dario = game.standbys[1];
 dario.mesh.visible = true; dario.mesh.position.set(320.5,0,293); dario.mesh.rotation.y = 0.9;
 game.wanted.stars = 0;
 document.getElementById('topRight').style.display = 'none';
 document.getElementById('bottomLeft').style.display = 'none';
 document.getElementById('bottomRight').style.display = 'none';
 document.getElementById('controlsHint').style.display = 'none';
 game.hud.stagePanels('garage');
 renderGaragePanel(game.hud.garageCanvas.getContext('2d'));
 cam(game,341,2.2,296,324,1.6,287,50);
 hudBase(game,{ cash:18450,stars:0,hp:88,ar:60,st:92 });
}
function shotSystems(game) {
 const { world,playerCar } = game;
 world.setMood('golden'); world.followShadow(400,60);
 parkTraffic(game);
 placeCar(playerCar,405,84,Math.PI - 0.5);
 placeCar(game.traffic.cars[0],394,30,Math.PI);
 placeCar(game.traffic.cars[1],408,150,0);
 crowd(game,[[388.6,96,0.4,'walk',1.1],[411.4,110,3.0,'walk',2.2],[421,60,1.6,'walk',0.8],[388.6,40,-0.2,'walk',2.7]]);
 game.player.mesh.visible = false;
 document.getElementById('hud').style.display = 'none';
 const ts = document.getElementById('titleScreen');
 ts.classList.remove('hidden');
 ts.style.background = 'radial-gradient(ellipse at 50% 62%, rgba(20,8,30,0.10), rgba(5,5,14,0.52))';
 renderTitleScreen();
 cam(game,500,9.5,128,388,7,26,50);
}
export function stageShot(name,game) {
 if (name === 'chase') shotChase(game);
 else if (name === 'shootout') shotShootout(game);
 else if (name === 'systems') shotSystems(game);
 else shotCover(game);
 game.world.update(0.016,2.5);
 window.__shotReady = true;
}

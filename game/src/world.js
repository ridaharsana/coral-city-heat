// CORAL CITY — the procedural open world: a seeded grid city on the Marisol coast with five
// districts (Coral Beach neon strip, Downtown towers, Port Azahar cranes, Las Ciénagas bayou,
// Isla Verde across the bridge), one canvas-painted ground (roads, beach, water, boardwalk),
// canvas-textured buildings with lit windows, neon signs, instanced palms and lamps, and a
// gradient sky dome whose mood (sunset / dusk / night / evening) shots and time-of-day set.
import * as THREE from 'three';
import { DISTRICTS } from './config.js';
export { DISTRICTS };

export const AVENUES = [-390, -260, -130, 0, 130, 260, 390]; // east-west roads, constant z
export const STREETS = [-390, -260, -130, 0, 130, 260, 390]; // north-south roads, constant x
export const ROAD_HALF = 13;

export function roadGraph() {
  return { avenues: AVENUES, streets: STREETS, roadHalf: ROAD_HALF };
}

export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  if (x > 470) return DISTRICTS[0];
  return DISTRICTS[1];
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function groundTexture(rng) {
  const S = 2048, W2U = S / 1700; // world units -> px, world [-850,850] -> [0,2048]
  const X = (x) => (x + 850) * W2U, Z = (z) => (z + 850) * W2U;
  return canvasTexture(S, S, (g) => {
    g.fillStyle = '#3d4a3a'; g.fillRect(0, 0, S, S);
    for (const d of DISTRICTS) { // district ground tints
      g.fillStyle = '#' + d.tint.toString(16).padStart(6, '0');
      g.fillRect(X(d.x0), Z(d.z0), (d.x1 - d.x0) * W2U, (d.z1 - d.z0) * W2U);
    }
    // ocean + channel + island
    const water = g.createLinearGradient(X(470), 0, X(1250), 0);
    water.addColorStop(0, '#1d6f8e'); water.addColorStop(1, '#0d3d5c');
    g.fillStyle = water; g.fillRect(X(470), 0, S - X(470), S);
    g.fillStyle = '#c9b083'; g.fillRect(X(452), 0, 22 * W2U, S); // sand strip
    g.fillStyle = '#8a6f4d'; g.fillRect(X(446), 0, 6 * W2U, S); // boardwalk
    g.fillStyle = '#38624a'; g.fillRect(X(740), Z(-260), 380 * W2U, 520 * W2U); // Isla Verde
    g.fillStyle = '#c9b083'; g.fillRect(X(736), Z(-264), 388 * W2U, 8 * W2U); g.fillRect(X(736), Z(256), 388 * W2U, 8 * W2U);
    g.fillStyle = '#173d33'; // bayou ponds
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(X(rng.range(-540, -300)), Z(rng.range(-520, 520)), rng.range(18, 46) * W2U, rng.range(12, 30) * W2U, rng.range(0, 3), 0, 7); g.fill(); }
    // roads: asphalt with edge lines and dashed centres (wet-look dark)
    const road = (x0, z0, x1, z1) => {
      g.fillStyle = '#22232b'; g.fillRect(X(x0), Z(z0), (x1 - x0) * W2U, (z1 - z0) * W2U);
      g.strokeStyle = '#9aa3ad'; g.lineWidth = 2; g.setLineDash([]);
      g.strokeRect(X(x0) + 2, Z(z0) + 2, (x1 - x0) * W2U - 4, (z1 - z0) * W2U - 4);
      g.strokeStyle = '#d8c25a'; g.lineWidth = 2.4; g.setLineDash([16, 14]);
      g.beginPath();
      if (x1 - x0 > z1 - z0) { g.moveTo(X(x0), Z((z0 + z1) / 2)); g.lineTo(X(x1), Z((z0 + z1) / 2)); }
      else { g.moveTo(X((x0 + x1) / 2), Z(z0)); g.lineTo(X((x0 + x1) / 2), Z(z1)); }
      g.stroke(); g.setLineDash([]);
    };
    for (const z of AVENUES) road(-560, z - ROAD_HALF, 452, z + ROAD_HALF);
    for (const x of STREETS) road(x - ROAD_HALF, -560, x + ROAD_HALF, 560);
    road(452, -ROAD_HALF, 1130, ROAD_HALF); // the Isla Verde bridge causeway
    road(880 - ROAD_HALF, -260, 880 + ROAD_HALF, 260);
    road(740, -60 - ROAD_HALF, 1120, -60 + ROAD_HALF);
    road(740, 90 - ROAD_HALF, 1120, 90 + ROAD_HALF);
  });
}

function windowTexture(rng, base, lit, floors, cols) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const fw = w / cols, fh = h / floors;
    for (let y = 0; y < floors; y++) for (let x = 0; x < cols; x++) {
      const on = rng.chance(lit);
      g.fillStyle = on ? (rng.chance(0.25) ? '#ffd98a' : '#bfe8ff') : '#141a26';
      g.fillRect(x * fw + 2, y * fh + 3, fw - 4, fh - 6);
    }
  });
}

function signTexture(text, fg, bg) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = fg; g.shadowBlur = 26; g.fillStyle = fg;
    g.fillText(text, w / 2, h / 2); g.fillText(text, w / 2, h / 2);
  });
}

const boxGeoCache = new Map();
function box(w, h, d, mat) {
  const key = `${w}|${h}|${d}`;
  let geo = boxGeoCache.get(key);
  if (!geo) { geo = new THREE.BoxGeometry(w, h, d); boxGeoCache.set(key, geo); }
  return new THREE.Mesh(geo, mat);
}

export function buildProceduralCoralCity(scene, rng) {
  const colliders = [];
  const flicker = [];
  const addCollider = (x, z, hw, hd) => colliders.push({ x, z, hw, hd });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1700, 1700),
    new THREE.MeshStandardMaterial({ map: groundTexture(rng), roughness: 0.92, metalness: 0.05 }),
  );
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1140),
    new THREE.MeshBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: 0.05 }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.set(950, 0.12, 0); scene.add(sheen);

  // sky dome + lights
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2a1a4a) }, mid: { value: new THREE.Color(0xff7e5f) }, bot: { value: new THREE.Color(0x1a1030) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.65, h)) : mix(bot, mid, smoothstep(-0.08, 0.12, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(3200, 24, 12), skyMat));
  const sun = new THREE.DirectionalLight(0xffb36b, 2.4);
  sun.position.set(-600, 420, -300); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260; sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 2600; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xffd9c0, 0x24304a, 0.85); scene.add(hemi);
  scene.fog = new THREE.Fog(0x40264d, 260, 1500);

  const texDowntown = windowTexture(rng, '#2c3247', 0.5, 18, 7);
  const texBeach = windowTexture(rng, '#7a4a63', 0.62, 9, 6);
  const texMid = windowTexture(rng, '#4a4238', 0.4, 8, 6);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x1c1e26 });
  const sideMats = (tex) => {
    const m = new THREE.MeshLambertMaterial({ map: tex });
    return [m, m, roofMat, roofMat, m, m];
  };
  const matsDowntown = sideMats(texDowntown), matsBeach = sideMats(texBeach), matsMid = sideMats(texMid);
  const HOTEL_SIGNS = ['HOTEL AZURE', 'NEON PALMS', 'CORAL REEF', 'HOTEL SOL', 'THE FLAMINGO', 'MAR Y SOL'];

  function building(x, z, w, d, h, mats, signText, signColor) {
    const b = box(w, h, d, mats); b.position.set(x, h / 2, z);
    b.castShadow = true; b.receiveShadow = true; scene.add(b); addCollider(x, z, w / 2, d / 2);
    if (signText) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 1.7, 34), 6.5),
        new THREE.MeshBasicMaterial({ map: signTexture(signText, signColor, '#12060f'), transparent: false }));
      sign.position.set(x, h + 4.5, z); sign.rotation.y = Math.PI / 2; scene.add(sign);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 1.9, 40), 9),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(signColor), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.set(x + 0.4, h + 4.5, z); glow.rotation.y = Math.PI / 2; scene.add(glow);
      flicker.push(sign.material);
    }
    return b;
  }

  // city blocks: fill each block cell per its district
  for (let i = 0; i < STREETS.length - 1; i++) for (let j = 0; j < AVENUES.length - 1; j++) {
    const x0 = STREETS[i] + ROAD_HALF + 6, x1 = STREETS[i + 1] - ROAD_HALF - 6;
    const z0 = AVENUES[j] + ROAD_HALF + 6, z1 = AVENUES[j + 1] - ROAD_HALF - 6;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, dist = districtAt(cx, cz);
    if (dist.name === 'Las Ciénagas') continue; // bayou stays swamp
    if (dist.name === 'Port Azahar') { // warehouses
      const w = box(rng.range(46, 62), 13, rng.range(40, 56),
        new THREE.MeshLambertMaterial({ color: rng.pick([0x6b5a49, 0x59636e, 0x71624a]) }));
      w.position.set(cx, 6.5, cz); w.castShadow = true; scene.add(w); addCollider(cx, cz, 31, 28);
      continue;
    }
    const beachFront = dist.name === 'Coral Beach' && STREETS[i] === 260; // hotels face the beach avenue
    const n = dist.name === 'Downtown' ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const bw = rng.range(30, 52), bd = rng.range(30, 52);
      const bx = n === 1 ? cx : cx + (k === 0 ? -26 : 26), bz = cz + rng.range(-8, 8);
      if (dist.name === 'Downtown') building(bx, bz, bw, bd, rng.range(46, 118), matsDowntown);
      else if (beachFront) building(bx, bz, bw, bd, rng.range(26, 44), matsBeach, rng.pick(HOTEL_SIGNS), rng.pick(['#ff5fa2', '#37e0ff', '#ffb347']));
      else building(bx, bz, bw, bd, rng.range(14, 30), matsMid);
    }
  }
  // Isla Verde: a small resort cluster + palms handled below
  for (let k = 0; k < 7; k++) {
    const bx = rng.range(790, 1070), bz = rng.range(-210, 210);
    if (Math.abs(bz) < 34 || Math.abs(bz + 60) < 30 || Math.abs(bz - 90) < 30) continue;
    building(bx, bz, rng.range(26, 44), rng.range(26, 44), rng.range(12, 34), matsMid,
      k === 0 ? 'ISLA VERDE' : null, '#7dff9a');
  }
  // Port Azahar cranes + container stacks
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xc7532c });
  for (const [px, pz] of [[60, 470], [220, 486], [380, 462]]) {
    const tower = box(6, 44, 6, craneMat); tower.position.set(px, 22, pz); scene.add(tower);
    const jib = box(64, 4, 4, craneMat); jib.position.set(px + 22, 42, pz); jib.rotation.z = 0.18; scene.add(jib);
    addCollider(px, pz, 4, 4);
    for (let s = 0; s < 5; s++) {
      const cont = box(13, 5, 6, new THREE.MeshLambertMaterial({ color: rng.pick([0x2f7fb8, 0xb83a2f, 0x3f9e4d, 0xc7a23a]) }));
      cont.position.set(px + rng.range(-40, 40), 2.5 + (s > 2 ? 5 : 0), pz + rng.range(-26, 26));
      cont.rotation.y = rng.pick([0, Math.PI / 2]); scene.add(cont);
    }
  }
  // Coral City National Bank — white-column landmark at Downtown's east edge
  const bank = new THREE.Group();
  const bankBody = box(56, 22, 40, new THREE.MeshLambertMaterial({ color: 0xd8d3c4 })); bankBody.position.y = 11; bank.add(bankBody);
  const colMat = new THREE.MeshLambertMaterial({ color: 0xf2ecdc });
  for (let cxi = -3; cxi <= 3; cxi++) { const col = box(2.4, 18, 2.4, colMat); col.position.set(29, 9, cxi * 5.2); bank.add(col); }
  const bankSign = new THREE.Mesh(new THREE.PlaneGeometry(46, 7),
    new THREE.MeshBasicMaterial({ map: signTexture('CORAL CITY NATIONAL BANK', '#ffe9a8', '#241a08') }));
  bankSign.position.set(29.5, 25, 0); bankSign.rotation.y = Math.PI / 2; bank.add(bankSign);
  bank.position.set(196, 0, -195); scene.add(bank); addCollider(196, -195, 29, 21);
  // Taller Neon respray garage in Port Azahar
  const garage = new THREE.Group();
  const gBody = box(44, 12, 34, new THREE.MeshLambertMaterial({ color: 0x333a44 })); gBody.position.y = 6; garage.add(gBody);
  const gDoor = new THREE.Mesh(new THREE.PlaneGeometry(30, 9), new THREE.MeshBasicMaterial({ color: 0x0e2a33 }));
  gDoor.position.set(0, 4.5, -17.2); gDoor.rotation.y = Math.PI; garage.add(gDoor);
  const gSign = new THREE.Mesh(new THREE.PlaneGeometry(40, 7),
    new THREE.MeshBasicMaterial({ map: signTexture('TALLER NEON · RESPRAY', '#37e0ff', '#04121a') }));
  gSign.position.set(0, 14.5, -17.4); gSign.rotation.y = Math.PI; garage.add(gSign); flicker.push(gSign.material);
  garage.position.set(330, 0, 330); scene.add(garage); addCollider(330, 330, 23, 18);
  // bridge rails over the channel
  const railMat = new THREE.MeshLambertMaterial({ color: 0x8a93a0 });
  for (const s of [-1, 1]) { const rail = box(290, 2.2, 1, railMat); rail.position.set(605, 1.6, s * (ROAD_HALF + 0.5)); scene.add(rail); }

  // palms + bayou trees + lamps, instanced
  const palmSpots = [];
  for (let z = -540; z <= 540; z += 34) { palmSpots.push([452 - 8, z]); palmSpots.push([390 - 17, z]); }
  for (let i = 0; i < 90; i++) palmSpots.push([rng.range(770, 1100), rng.range(-240, 240)]);
  for (let i = 0; i < 130; i++) palmSpots.push([rng.range(-545, -285), rng.range(-545, 545)]);
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 8, 5); trunkGeo.translate(0, 4, 0);
  const crownGeo = new THREE.IcosahedronGeometry(3.1, 0); crownGeo.scale(1, 0.42, 1); crownGeo.translate(0, 8.4, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x7a5c3e }), palmSpots.length);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ color: 0x2e8b57 }), palmSpots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  palmSpots.forEach(([px, pz], idx) => {
    e.set(rng.range(-0.07, 0.07), rng.range(0, 6.28), rng.range(-0.07, 0.07)); q.setFromEuler(e);
    const s = rng.range(0.8, 1.35); sc.set(s, s, s); v.set(px, 0, pz);
    m4.compose(v, q, sc); trunks.setMatrixAt(idx, m4); crowns.setMatrixAt(idx, m4);
  });
  trunks.castShadow = true; scene.add(trunks); scene.add(crowns);
  const lampGeo = new THREE.CylinderGeometry(0.16, 0.16, 7, 4); lampGeo.translate(0, 3.5, 0);
  const lampHeadGeo = new THREE.SphereGeometry(0.5, 6, 5); lampHeadGeo.translate(0, 7.1, 0);
  const lampSpots = [];
  for (const z of AVENUES) for (let x = -520; x <= 440; x += 78) lampSpots.push([x, z - ROAD_HALF - 2]);
  for (const x of STREETS) for (let z = -520; z <= 520; z += 78) lampSpots.push([x - ROAD_HALF - 2, z]);
  const lampPoles = new THREE.InstancedMesh(lampGeo, new THREE.MeshLambertMaterial({ color: 0x39404c }), lampSpots.length);
  const lampHeads = new THREE.InstancedMesh(lampHeadGeo, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), lampSpots.length);
  lampSpots.forEach(([px, pz], idx) => { v.set(px, 0, pz); q.identity(); sc.set(1, 1, 1); m4.compose(v, q, sc); lampPoles.setMatrixAt(idx, m4); lampHeads.setMatrixAt(idx, m4); });
  scene.add(lampPoles); scene.add(lampHeads);

  const moods = {
    sunset: { top: 0x35306e, mid: 0xff7e5f, bot: 0x2a1430, fog: 0x59304d, sun: 0xffb36b, sunI: 2.4, hemi: 0.85, sunPos: [-600, 300, -260] },
    dusk: { top: 0x1c1440, mid: 0xd84e6d, bot: 0x140b24, fog: 0x2c1836, sun: 0xff8a5f, sunI: 1.5, hemi: 0.5, sunPos: [-500, 150, -200] },
    night: { top: 0x050914, mid: 0x14263f, bot: 0x05070f, fog: 0x0a1220, sun: 0x8fb4ff, sunI: 0.55, hemi: 0.32, sunPos: [200, 500, 100] },
    evening: { top: 0x27355e, mid: 0xe8734a, bot: 0x1c1226, fog: 0x3a2440, sun: 0xffa860, sunI: 1.9, hemi: 0.65, sunPos: [-550, 230, 150] },
  };
  function setMood(name) {
    const mo = moods[name] || moods.sunset;
    skyMat.uniforms.top.value.setHex(mo.top); skyMat.uniforms.mid.value.setHex(mo.mid); skyMat.uniforms.bot.value.setHex(mo.bot);
    scene.fog.color.setHex(mo.fog); sun.color.setHex(mo.sun); sun.intensity = mo.sunI;
    sun.position.set(mo.sunPos[0], mo.sunPos[1], mo.sunPos[2]); hemi.intensity = mo.hemi;
    lampHeads.material.color.setHex(name === 'sunset' ? 0xffe2b0 : 0xffc978);
  }
  setMood('sunset');
  let flickT = 0;
  return {
    colliders, bankPos: { x: 196, z: -195 }, garagePos: { x: 330, z: 330 },
    setMood, sun,
    update(dt, t) {
      flickT -= dt;
      if (flickT <= 0) { flickT = 0.12; for (const mt of flicker) mt.opacity = 0.86 + Math.random() * 0.14; }
      sun.target.position.set(0, 0, 0);
    },
    followShadow(x, z) { sun.position.x = x + moods.sunset.sunPos[0] * 0.4; sun.position.z = z - 120; sun.target.position.set(x, 0, z); },
  };
}

// CORAL CITY — the procedural open world: a seeded grid city on the Marisol coast with five
// districts (Coral Beach neon strip, Downtown towers, Port Azahar cranes, Las Ciénagas bayou,
// Isla Verde across the bridge), one canvas-painted ground (roads with zebra crossings,
// beach, boardwalk), TIERED buildings with parapet caps, rooftop water towers, glowing
// lit-window grids, deco hotels with awnings and vertical neon blade signs, a columned
// National Bank, curved palms with textured fronds, lamps with light pools, a living
// specular ocean with foam, and a gradient sky dome with a real sun disc and clouds whose
// mood (sunset / dusk / night / evening) shots and time-of-day set.
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
    // roads: asphalt with edge lines and dashed centres (wet-look dark), over a paler
    // sidewalk slab so every street reads as raised pavement between kerbs
    const road = (x0, z0, x1, z1) => {
      g.fillStyle = '#565b60'; g.fillRect(X(x0) - 5, Z(z0) - 5, (x1 - x0) * W2U + 10, (z1 - z0) * W2U + 10);
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
    // zebra crossings on every junction approach
    g.fillStyle = 'rgba(226,230,235,0.75)';
    const zebra = (cx, cz, horiz) => {
      for (let sIdx = -2; sIdx <= 2; sIdx++) {
        if (horiz) g.fillRect(X(cx + sIdx * 4.6 - 1.5), Z(cz - 4.4), 3 * W2U, 8.8 * W2U);
        else g.fillRect(X(cx - 4.4), Z(cz + sIdx * 4.6 - 1.5), 8.8 * W2U, 3 * W2U);
      }
    };
    for (const ax of STREETS) for (const az of AVENUES) {
      zebra(ax, az - ROAD_HALF - 5.5, true); zebra(ax, az + ROAD_HALF + 5.5, true);
      zebra(ax - ROAD_HALF - 5.5, az, false); zebra(ax + ROAD_HALF + 5.5, az, false);
    }
  });
}

function windowTexture(rng, base, lit, floors, cols) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const fw = w / cols, fh = h / floors;
    for (let y = 0; y < floors; y++) for (let x = 0; x < cols; x++) {
      const on = rng.chance(lit);
      const warm = rng.chance(0.62);
      g.fillStyle = on ? (warm ? (rng.chance(0.3) ? '#ffe9ad' : '#ffc978') : '#bfe8ff') : (rng.chance(0.2) ? '#1d2735' : '#12161f');
      // varied pane sizes: some windows are wide suites, some narrow, a few floor-to-ceiling
      const inset = rng.chance(0.22) ? 1 : 2.5, tall = y > floors - 3 && rng.chance(0.3);
      g.fillRect(x * fw + inset, y * fh + (tall ? 1.5 : 3), fw - inset * 2, fh - (tall ? 3 : 6));
      if (on && rng.chance(0.24)) { g.fillStyle = 'rgba(20,16,10,0.55)'; g.fillRect(x * fw + fw * rng.range(0.3, 0.55), y * fh + 3, 2, fh - 6); } // a blind / figure shadow
    }
    // storefront band: taller, brighter glazing on the ground floor + a parapet cap line
    const grd = g.createLinearGradient(0, h - fh * 1.6, 0, h);
    grd.addColorStop(0, 'rgba(255,214,140,0)'); grd.addColorStop(1, 'rgba(255,214,140,0.34)');
    g.fillStyle = grd; g.fillRect(0, h - fh * 1.6, w, fh * 1.6);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, 5);
  });
}

function verticalSignTexture(text, fg, bg) {
  return canvasTexture(96, 512, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = 'bold 58px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = fg; g.shadowBlur = 16; g.fillStyle = fg;
    const step = Math.min(58, (h - 30) / Math.max(1, text.length));
    [...text].forEach((ch, i) => { g.fillText(ch, w / 2, 34 + i * step); g.fillText(ch, w / 2, 34 + i * step); });
  });
}

function palmLeafTexture() {
  return canvasTexture(128, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#2f9e5f'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(2, 32); g.quadraticCurveTo(64, 26, 126, 34); g.stroke();
    g.lineWidth = 2;
    for (let i = 0; i < 15; i++) { // leaflets drooping off the rib
      const t = i / 14, x = 6 + t * 116, y = 32 + Math.sin(t * 2.4) * 3;
      g.strokeStyle = i % 3 ? '#35b06a' : '#278a4e';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y + 12, x + 2, y + 24 - t * 7); g.stroke();
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y - 11, x + 3, y - 21 + t * 5); g.stroke();
    }
  });
}

function glowSpriteTexture(inner, outer) {
  return canvasTexture(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
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
  // the living ocean: a specular Phong sheet over the painted water, its noise texture
  // forever sliding so the surface ripples and throws a sun streak; foam licks the sand
  const oceanTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#175d7c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rng.chance(0.5) ? 'rgba(120,200,230,0.16)' : 'rgba(6,32,52,0.2)';
      g.fillRect(rng.range(0, w), rng.range(0, h), rng.range(2, 9), 1.4);
    }
  });
  oceanTex.wrapS = oceanTex.wrapT = THREE.RepeatWrapping; oceanTex.repeat.set(3, 12);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(404, 1700),
    new THREE.MeshPhongMaterial({ map: oceanTex, color: 0x9fd4e8, specular: 0xffc98f, shininess: 110 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(654, 0.09, 0); scene.add(ocean);
  const foamTex = canvasTexture(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) {
      g.fillStyle = `rgba(240,252,255,${rng.range(0.1, 0.5)})`;
      g.beginPath(); g.ellipse(rng.range(0, w), rng.range(0, h), rng.range(3, 13), rng.range(1.5, 4), 0, 0, 7); g.fill();
    }
  });
  foamTex.wrapS = foamTex.wrapT = THREE.RepeatWrapping; foamTex.repeat.set(1, 26);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(13, 1700),
    new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, opacity: 0.55, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(449, 0.14, 0); scene.add(foam);

  // sky dome + lights
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2a1a4a) }, mid: { value: new THREE.Color(0xff7e5f) }, bot: { value: new THREE.Color(0x1a1030) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.05 ? mix(mid, top, smoothstep(0.05, 0.34, h)) : mix(bot, mid, smoothstep(-0.06, 0.05, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(3200, 24, 12), skyMat));
  // a real sun: hot core disc inside a wide warm glow, plus soft cloud billboards that
  // take the mood's colour — the sky stops being a flat gradient wash
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSpriteTexture('rgba(255,236,190,1)', 'rgba(255,150,80,0.42)'), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sunGlow.scale.setScalar(1150); scene.add(sunGlow);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSpriteTexture('rgba(255,252,238,1)', 'rgba(255,214,140,0.85)'), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sunCore.scale.setScalar(300); scene.add(sunCore);
  const cloudTex = glowSpriteTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0.28)');
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: rng.range(0.14, 0.3), depthWrite: false, fog: false }));
    const a = rng.range(0, Math.PI * 2), r = rng.range(1500, 2600);
    cl.position.set(Math.sin(a) * r, rng.range(420, 900), Math.cos(a) * r);
    cl.scale.set(rng.range(700, 1300), rng.range(120, 220), 1);
    scene.add(cl); clouds.push(cl);
  }
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
    // emissiveMap = the window grid itself: lit panes glow after dark, walls barely do
    const m = new THREE.MeshLambertMaterial({ map: tex, emissive: 0xa8895c, emissiveMap: tex });
    return [m, m, roofMat, roofMat, m, m];
  };
  const matsDowntown = sideMats(texDowntown), matsBeach = sideMats(texBeach), matsMid = sideMats(texMid);
  const HOTEL_SIGNS = ['HOTEL AZURE', 'NEON PALMS', 'CORAL REEF', 'HOTEL SOL', 'THE FLAMINGO', 'MAR Y SOL'];
  const capMat = new THREE.MeshLambertMaterial({ color: 0x2a2d38 });
  const acMat = new THREE.MeshLambertMaterial({ color: 0x8a929c });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5a4030 });
  const awningTex = canvasTexture(64, 64, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2e7da' : '#d84e6d'; g.fillRect(i * 8, 0, 8, h); }
  });
  awningTex.wrapS = THREE.RepeatWrapping; awningTex.repeat.set(3, 1);
  const awningMat = new THREE.MeshLambertMaterial({ map: awningTex });

  function rooftopProps(gx, gz, topY, w, d, tall) {
    const ac = box(rng.range(2.5, 4.5), 1.4, rng.range(2, 3.4), acMat);
    ac.position.set(gx + rng.range(-w / 5, w / 5), topY + 0.7, gz + rng.range(-d / 5, d / 5)); ac.castShadow = true; scene.add(ac);
    if (tall && rng.chance(0.45)) { // a downtown water tower: tank on legs with a cone cap
      const tx = gx + rng.range(-w / 6, w / 6), tz = gz - d / 5;
      for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
        const leg = box(0.32, 3.4, 0.32, woodMat); leg.position.set(tx + lx, topY + 1.7, tz + lz); scene.add(leg);
      }
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 3.8, 10), woodMat);
      tank.position.set(tx, topY + 5.3, tz); tank.castShadow = true; scene.add(tank);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 2.6, 1.7, 10), capMat);
      cap.position.set(tx, topY + 8, tz); scene.add(cap);
    }
  }

  function building(x, z, w, d, h, mats, signText, signColor) {
    const grp = new THREE.Group(); scene.add(grp);
    if (h >= 38) { // tiered tower: three setbacks, a cap slab on every ledge, props on top
      let y = 0;
      const tiers = [[1, 0.52], [0.8, 0.3], [0.6, 0.18]];
      for (const [s, hf] of tiers) {
        const th = h * hf, tw = w * s, td = d * s;
        const t = box(tw, th, td, mats); t.position.set(x, y + th / 2, z);
        t.castShadow = true; t.receiveShadow = true; grp.add(t);
        const cap = box(tw * 1.05, 0.9, td * 1.05, capMat); cap.position.set(x, y + th + 0.45, z); grp.add(cap);
        y += th;
      }
      rooftopProps(x, z, h, w * 0.6, d * 0.6, h >= 70);
    } else {
      const b = box(w, h, d, mats); b.position.set(x, h / 2, z);
      b.castShadow = true; b.receiveShadow = true; grp.add(b);
      const cap = box(w * 1.04, 0.8, d * 1.04, capMat); cap.position.set(x, h + 0.4, z); grp.add(cap);
      if (h >= 20) rooftopProps(x, z, h, w, d, false);
    }
    addCollider(x, z, w / 2, d / 2);
    if (signText) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 1.7, 34), 6.5),
        new THREE.MeshBasicMaterial({ map: signTexture(signText, signColor, '#12060f'), transparent: false }));
      sign.position.set(x, h + 4.5, z); sign.rotation.y = Math.PI / 2; scene.add(sign);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 1.9, 40), 9),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(signColor), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.set(x + 0.4, h + 4.5, z); glow.rotation.y = Math.PI / 2; scene.add(glow);
      flicker.push(sign.material);
      // deco dressing: a striped awning over the beach-side entrance + a vertical neon
      // blade sign down the east face, letters stacked like the real strip
      const awn = box(3.4, 0.16, d * 0.82, awningMat);
      awn.position.set(x + w / 2 + 1.3, 3.7, z); awn.rotation.z = -0.38; awn.castShadow = true; scene.add(awn);
      const short = signText.replace('HOTEL ', '').replace('THE ', '').replace(/ /g, '');
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(4.4, Math.min(21, h * 0.6)),
        new THREE.MeshBasicMaterial({ map: verticalSignTexture(short, signColor, '#14060f') }));
      blade.position.set(x + w / 2 + 0.4, h * 0.55, z); blade.rotation.y = Math.PI / 2; scene.add(blade);
      const bGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, Math.min(23, h * 0.64)),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(signColor), transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }));
      bGlow.position.set(x + w / 2 + 0.35, h * 0.55, z); bGlow.rotation.y = Math.PI / 2; scene.add(bGlow);
      flicker.push(blade.material);
    }
    return grp;
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
  // Coral City National Bank — a columned landmark at Downtown's east edge: round stone
  // columns, entrance steps and a triangular pediment carrying the name over the street
  const bank = new THREE.Group();
  const bankBody = box(56, 22, 40, new THREE.MeshLambertMaterial({ color: 0xd8d3c4 })); bankBody.position.y = 11; bank.add(bankBody);
  const colMat = new THREE.MeshLambertMaterial({ color: 0xf2ecdc });
  const colGeo = new THREE.CylinderGeometry(0.95, 1.05, 17, 10);
  for (let cxi = -3; cxi <= 3; cxi++) { const col = new THREE.Mesh(colGeo, colMat); col.position.set(29.5, 9.5, cxi * 5.4); col.castShadow = true; bank.add(col); }
  const entab = box(4, 2.4, 41, colMat); entab.position.set(29.2, 19.6, 0); bank.add(entab);
  const pedShape = new THREE.Shape();
  pedShape.moveTo(-20, 0); pedShape.lineTo(20, 0); pedShape.lineTo(0, 5.6); pedShape.closePath();
  const pediment = new THREE.Mesh(new THREE.ExtrudeGeometry(pedShape, { depth: 3.4, bevelEnabled: false }),
    new THREE.MeshLambertMaterial({ color: 0xe6e0cd }));
  pediment.rotation.y = Math.PI / 2; pediment.position.set(30.9, 20.8, 0); bank.add(pediment);
  for (let sIdx = 0; sIdx < 3; sIdx++) { // entrance steps spilling toward the street
    const stepH = (3 - sIdx) * 0.55;
    const step = box(2.6, stepH, 34 - sIdx * 3, colMat);
    step.position.set(31.6 + sIdx * 2.3, stepH / 2, 0); bank.add(step);
  }
  const bankSign = new THREE.Mesh(new THREE.PlaneGeometry(38, 6),
    new THREE.MeshBasicMaterial({ map: signTexture('CORAL CITY NATIONAL BANK', '#ffe9a8', '#241a08') }));
  bankSign.position.set(31.2, 23.4, 0); bankSign.rotation.y = Math.PI / 2; bank.add(bankSign);
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
  // palms: a trunk that LEANS along a curve, crowned with seven drooping fronds cut from
  // a leaf texture — and lamps with an arm over the road and a pool of light on the asphalt
  const palmSpots = [];
  for (let z = -540; z <= 540; z += 34) { palmSpots.push([452 - 8, z]); palmSpots.push([390 - 17, z]); }
  for (let i = 0; i < 90; i++) palmSpots.push([rng.range(770, 1100), rng.range(-240, 240)]);
  for (let i = 0; i < 130; i++) palmSpots.push([rng.range(-545, -285), rng.range(-545, 545)]);
  const trunkCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, 4.4, 0), new THREE.Vector3(1.8, 8.0, 0));
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 6, 0.3, 5);
  const frondGeo = new THREE.PlaneGeometry(3.9, 1.25, 4, 1); frondGeo.translate(1.95, 0, 0);
  { // arc every frond downward along its length
    const pa = frondGeo.attributes.position;
    for (let vi = 0; vi < pa.count; vi++) { const fx = pa.getX(vi); pa.setY(vi, pa.getY(vi) - Math.pow(fx / 3.9, 2) * 1.7); }
    frondGeo.computeVertexNormals();
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x7a5c3e }), palmSpots.length);
  const FRONDS = 7;
  const fronds = new THREE.InstancedMesh(frondGeo,
    new THREE.MeshLambertMaterial({ map: palmLeafTexture(), alphaTest: 0.32, side: THREE.DoubleSide }), palmSpots.length * FRONDS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const mTop = new THREE.Matrix4().makeTranslation(1.8, 8.0, 0);
  const bayouTint = new THREE.Color(0x8fa578), palmTint = new THREE.Color(0xffffff);
  palmSpots.forEach(([px, pz], idx) => {
    e.set(rng.range(-0.06, 0.06), rng.range(0, 6.28), rng.range(-0.06, 0.06)); q.setFromEuler(e);
    const s = rng.range(0.8, 1.35); sc.set(s, s, s); v.set(px, 0, pz);
    m4.compose(v, q, sc); trunks.setMatrixAt(idx, m4);
    for (let f = 0; f < FRONDS; f++) {
      const mf = m4.clone().multiply(mTop)
        .multiply(new THREE.Matrix4().makeRotationY((f / FRONDS) * Math.PI * 2 + rng.range(-0.2, 0.2)))
        .multiply(new THREE.Matrix4().makeRotationZ(rng.range(0.05, 0.3)));
      fronds.setMatrixAt(idx * FRONDS + f, mf);
      fronds.setColorAt(idx * FRONDS + f, px < -270 ? bayouTint : palmTint);
    }
  });
  trunks.castShadow = true; scene.add(trunks); scene.add(fronds);
  const lampGeo = new THREE.CylinderGeometry(0.16, 0.2, 7, 5); lampGeo.translate(0, 3.5, 0);
  const lampAve = [], lampSt = [];
  for (const z of AVENUES) for (let x = -520; x <= 440; x += 78) lampAve.push([x, z - ROAD_HALF - 2]);
  for (const x of STREETS) for (let z = -520; z <= 520; z += 78) lampSt.push([x - ROAD_HALF - 2, z]);
  const allLamps = [...lampAve, ...lampSt];
  const lampPoles = new THREE.InstancedMesh(lampGeo, new THREE.MeshLambertMaterial({ color: 0x39404c }), allLamps.length);
  const armMat = lampPoles.material;
  const mkInst = (geo, mat, spots) => {
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach(([px, pz], idx) => { v.set(px, 0, pz); q.identity(); sc.set(1, 1, 1); m4.compose(v, q, sc); im.setMatrixAt(idx, m4); });
    scene.add(im); return im;
  };
  const armAveGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.0, 5); armAveGeo.rotateX(Math.PI / 2); armAveGeo.translate(0, 6.85, 0.95);
  const armStGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.0, 5); armStGeo.rotateZ(Math.PI / 2); armStGeo.translate(0.95, 6.85, 0);
  mkInst(armAveGeo, armMat, lampAve); mkInst(armStGeo, armMat, lampSt);
  const headMatLamp = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const headAveGeo = new THREE.SphereGeometry(0.42, 8, 6); headAveGeo.scale(1, 0.7, 1); headAveGeo.translate(0, 6.8, 1.9);
  const headStGeo = new THREE.SphereGeometry(0.42, 8, 6); headStGeo.scale(1, 0.7, 1); headStGeo.translate(1.9, 6.8, 0);
  const lampHeadsAve = mkInst(headAveGeo, headMatLamp, lampAve);
  const lampHeadsSt = mkInst(headStGeo, headMatLamp, lampSt);
  const poolTexLamp = glowSpriteTexture('rgba(255,208,138,0.95)', 'rgba(255,180,100,0.4)');
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTexLamp, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false });
  const poolAveGeo = new THREE.CircleGeometry(3.8, 14); poolAveGeo.rotateX(-Math.PI / 2); poolAveGeo.translate(0, 0.07, 1.9);
  const poolStGeo = new THREE.CircleGeometry(3.8, 14); poolStGeo.rotateX(-Math.PI / 2); poolStGeo.translate(1.9, 0.07, 0);
  mkInst(poolAveGeo, poolMat, lampAve); mkInst(poolStGeo, poolMat, lampSt);
  allLamps.forEach(([px, pz], idx) => { v.set(px, 0, pz); q.identity(); sc.set(1, 1, 1); m4.compose(v, q, sc); lampPoles.setMatrixAt(idx, m4); });
  scene.add(lampPoles);

  const moods = {
    sunset: { top: 0x35306e, mid: 0xff7e5f, bot: 0xe8906a, fog: 0x59304d, sun: 0xffb36b, sunI: 2.4, hemi: 0.85, sunPos: [240, 130, 430], glow: 0xffc38a, cloud: 0xffc4a8, pool: 0.1, ocean: 0x9fd4e8 },
    dusk: { top: 0x1c1440, mid: 0xd84e6d, bot: 0x140b24, fog: 0x2c1836, sun: 0xff9d78, sunI: 1.5, hemi: 0.58, sunPos: [-500, 150, -200], glow: 0xff9a7a, cloud: 0xb98aa8, pool: 0.3, ocean: 0x7a9fc0 },
    night: { top: 0x050914, mid: 0x14263f, bot: 0x05070f, fog: 0x0a1220, sun: 0x8fb4ff, sunI: 0.55, hemi: 0.4, sunPos: [200, 500, 100], glow: 0xaac4ff, cloud: 0x2c3a55, pool: 0.42, ocean: 0x54708f },
    evening: { top: 0x27355e, mid: 0xe8734a, bot: 0x1c1226, fog: 0x3a2440, sun: 0xffa860, sunI: 1.9, hemi: 0.65, sunPos: [-550, 230, 150], glow: 0xffb37a, cloud: 0xffb490, pool: 0.2, ocean: 0x93c2dc },
  };
  function setMood(name) {
    const mo = moods[name] || moods.sunset;
    skyMat.uniforms.top.value.setHex(mo.top); skyMat.uniforms.mid.value.setHex(mo.mid); skyMat.uniforms.bot.value.setHex(mo.bot);
    scene.fog.color.setHex(mo.fog); sun.color.setHex(mo.sun); sun.intensity = mo.sunI;
    sun.position.set(mo.sunPos[0], mo.sunPos[1], mo.sunPos[2]); hemi.intensity = mo.hemi;
    headMatLamp.color.setHex(name === 'sunset' ? 0xffe2b0 : 0xffc978);
    poolMat.opacity = mo.pool;
    ocean.material.color.setHex(mo.ocean);
    const dir = new THREE.Vector3(mo.sunPos[0], mo.sunPos[1], mo.sunPos[2]).normalize();
    sunGlow.position.copy(dir).multiplyScalar(2750); sunGlow.material.color.setHex(mo.glow);
    sunGlow.scale.setScalar(name === 'night' ? 520 : 1150);
    sunCore.position.copy(dir).multiplyScalar(2750);
    sunCore.scale.setScalar(name === 'night' ? 165 : 300);
    for (const cl of clouds) { cl.material.color.setHex(mo.cloud); cl.material.opacity = name === 'night' ? 0.1 : 0.22; }
  }
  setMood('sunset');
  let flickT = 0;
  return {
    colliders, bankPos: { x: 196, z: -195 }, garagePos: { x: 330, z: 330 },
    setMood, sun,
    update(dt, t) {
      flickT -= dt;
      if (flickT <= 0) { flickT = 0.12; for (const mt of flicker) mt.opacity = 0.86 + Math.random() * 0.14; }
      oceanTex.offset.set(t * 0.006, t * 0.0022); // the ripple field forever slides
      foamTex.offset.y = -t * 0.016;
      foam.material.opacity = 0.42 + Math.sin(t * 0.6) * 0.14; // surf breathing on the sand
      sun.target.position.set(0, 0, 0);
    },
    followShadow(x, z) { sun.position.x = x + moods.sunset.sunPos[0] * 0.4; sun.position.z = z - 120; sun.target.position.set(x, 0, z); },
  };
}

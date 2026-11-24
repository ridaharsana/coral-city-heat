// CORAL CITY HEAT — world.js: the procedural golden-hour city (canvas textures, curved geometry, landmarks, collision, moods).
import * as THREE from 'three';
import { DISTRICTS as DISTRICT_DEFS } from './config.js';
const {Mesh,MeshBasicMaterial,Vector3,PlaneGeometry,CylinderGeometry,Group,MeshStandardMaterial,SphereGeometry,Matrix4,ClampToEdgeWrapping,BufferAttribute,DoubleSide,Color,BoxGeometry,SpriteMaterial,Sprite,ConeGeometry,CircleGeometry,BufferGeometry,AdditiveBlending,TubeGeometry,TorusGeometry,RepeatWrapping,MeshPhongMaterial,CatmullRomCurve3,BackSide,ShaderMaterial,Scene,SRGBColorSpace,PointLight,PMREMGenerator,Object3D,MeshPhysicalMaterial,InstancedMesh,IcosahedronGeometry,HemisphereLight,Fog,DirectionalLight,CanvasTexture,AmbientLight} = THREE;
export const DISTRICTS = DISTRICT_DEFS;
export const AVENUES = [-490, -355, -220, -85, 50, 185, 320, 455];
export const STREETS = [-490, -355, -220, -85, 50, 185, 320, 400, 800, 935, 1070];
const MAIN_STREETS = STREETS.filter((x) => x < 700);
const ISLAND_AVENUES = AVENUES.filter((z) => z >= -260 && z <= 260);
const SHORE_X = 470, ISLAND_X0 = 740, WORLD_X1 = 1130, BRIDGE_Z = 50;
export const BANK_POS = { x: 232, z: -172, faceZ: -183 };
export const GARAGE_POS = { x: 330, z: 288, faceZ: 296 };
export function districtAt(x, z) {
 for (const d of DISTRICT_DEFS) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
 if (x > SHORE_X && x < ISLAND_X0) return { name: 'Marisol Crossing', sub: 'the causeway', tint: 0x2c4a5e, map: '#2c4a5e' };
 if (x >= ISLAND_X0) return DISTRICT_DEFS[4];
 return { name: 'Coral City', sub: 'the open road', tint: 0x3a3f52, map: '#3a3f52' };
}
export function roadGraph() { return { avenues: AVENUES, streets: STREETS }; }
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function lcg(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function tex(c, srgb = true) { const t = new CanvasTexture(c); if (srgb) t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.anisotropy = 16; return t; }
function asphaltSet() {
 const [c, g] = cnv(1024, 1024), [rc, rg] = cnv(1024, 1024), [bc, bg] = cnv(512, 512);
 g.fillStyle = '#26272c'; g.fillRect(0, 0, 1024, 1024);
 rg.fillStyle = 'rgb(168,168,168)'; rg.fillRect(0, 0, 1024, 1024);
 bg.fillStyle = 'rgb(128,128,128)'; bg.fillRect(0, 0, 512, 512);
 const rnd = lcg(1234567);
 for (let i = 0; i < 15000; i++) {
  const v = 30 + rnd() * 40;
  g.fillStyle = `rgba(${v},${v},${v + 6},${0.16 + rnd() * 0.2})`; g.fillRect(rnd() * 1024, rnd() * 1024, 2.4, 2.4);
  const bv = 90 + rnd() * 80;
  bg.fillStyle = `rgba(${bv},${bv},${bv},0.25)`; bg.fillRect(rnd() * 512, rnd() * 512, 2, 2);
 }
 for (let i = 0; i < 16; i++) {
  g.strokeStyle = 'rgba(12,12,14,0.5)'; g.lineWidth = 1.6; g.beginPath();
  let x = rnd() * 1024, y = rnd() * 1024; g.moveTo(x, y);
  for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 130; y += (rnd() - 0.5) * 130; g.lineTo(x, y); }
  g.stroke();
 }
 for (let i = 0; i < 16; i++) {
  const x = rnd() * 1024, y = 90 + rnd() * 844, rx = 44 + rnd() * 76, ry = 14 + rnd() * 22;
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
  const gr = g.createRadialGradient(x, y, 2, x, y, rx);
  gr.addColorStop(0, 'rgba(16,20,28,0.5)'); gr.addColorStop(1, 'rgba(16,20,28,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, 7); g.fill(); g.restore();
  rg.save(); rg.translate(x, y); rg.scale(1, ry / rx); rg.translate(-x, -y);
  const rr = rg.createRadialGradient(x, y, 2, x, y, rx);
  rr.addColorStop(0, 'rgb(16,16,16)'); rr.addColorStop(0.7, 'rgb(52,52,52)'); rr.addColorStop(1, 'rgb(168,168,168)');
  rg.fillStyle = rr; rg.beginPath(); rg.arc(x, y, rx, 0, 7); rg.fill(); rg.restore();
 }
 g.fillStyle = 'rgba(232,236,240,0.92)'; g.fillRect(0, 14, 1024, 9); g.fillRect(0, 1001, 1024, 9);
 g.fillStyle = 'rgba(240,244,248,0.85)';
 for (const v of [248, 754]) for (let x = 0; x < 1024; x += 128) g.fillRect(x, v, 74, 10);
 g.fillStyle = '#e8a91c'; g.fillRect(0, 494, 1024, 11); g.fillRect(0, 519, 1024, 11);
 g.strokeStyle = 'rgba(10,10,12,0.20)'; g.lineWidth = 15;
 for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(rnd() * 1024, rnd() * 1024, 90 + rnd() * 190, rnd() * 3, rnd() * 2 + 3.4); g.stroke(); }
 return { map: tex(c), rough: tex(rc, false), bump: tex(bc, false) };
}
function facadeSet(base, frame, litRatio, seed) {
 const [c, g] = cnv(256, 512), [ec, eg] = cnv(256, 512);
 const rnd = lcg(seed);
 g.fillStyle = base; g.fillRect(0, 0, 256, 512);
 const grad = g.createLinearGradient(0, 0, 0, 512);
 grad.addColorStop(0, 'rgba(255,255,255,0.10)'); grad.addColorStop(1, 'rgba(0,0,0,0.22)');
 g.fillStyle = grad; g.fillRect(0, 0, 256, 512);
 eg.fillStyle = '#000'; eg.fillRect(0, 0, 256, 512);
 const cols = 6, rows = 12, cw = 256 / cols, rh = 512 / rows;
 for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
  const x = i * cw + 6, y = j * rh + 7, w = cw - 12, h = rh - 14, lit = rnd() < litRatio;
  g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
  const warm = rnd() < 0.72;
  g.fillStyle = lit ? (warm ? '#ffd9a0' : '#bfe0ff') : '#141c2a'; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.20)'; g.fillRect(x, y, w, 5);
  if (lit) { eg.fillStyle = warm ? '#ffbe78' : '#a8d4ff'; eg.fillRect(x, y, w, h); }
 }
 return { map: tex(c), emissive: tex(ec) };
}
function concreteTex() {
 const [c, g] = cnv(256, 256);
 g.fillStyle = '#83858a'; g.fillRect(0, 0, 256, 256);
 const rnd = lcg(777);
 for (let i = 0; i < 2600; i++) { const v = 105 + rnd() * 60; g.fillStyle = `rgba(${v},${v},${v},0.3)`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
 g.strokeStyle = 'rgba(40,40,44,0.65)'; g.lineWidth = 3;
 for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
 return tex(c);
}
function barkTex() {
 const [c, g] = cnv(128, 256);
 g.fillStyle = '#5d4630'; g.fillRect(0, 0, 128, 256);
 const rnd = lcg(4242);
 for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${30 + rnd() * 40},${22 + rnd() * 26},14,0.55)`; g.lineWidth = 2 + rnd() * 4; g.beginPath(); const x = rnd() * 128; g.moveTo(x, 0); g.lineTo(x + (rnd() - 0.5) * 22, 256); g.stroke(); }
 g.strokeStyle = 'rgba(24,16,8,0.8)'; g.lineWidth = 3;
 for (let y = 12; y < 256; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + 4); g.stroke(); }
 return tex(c);
}
function frondTex() {
 const [c, g] = cnv(256, 128);
 g.clearRect(0, 0, 256, 128);
 g.strokeStyle = '#2e7d46'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 64); g.lineTo(256, 64); g.stroke();
 for (let x = 8; x < 252; x += 7) {
  const t = x / 256, len = 44 * (1 - t * 0.45);
  for (const d of [-1, 1]) {
   const gr = g.createLinearGradient(x, 64, x + 16, 64 + d * len);
   gr.addColorStop(0, '#3fae5f'); gr.addColorStop(1, '#1d5c31');
   g.strokeStyle = gr; g.lineWidth = 3.4;
   g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + 9, 64 + d * len * 0.6, x + 17, 64 + d * len); g.stroke();
  }
 }
 const t = tex(c); t.wrapS = t.wrapT = ClampToEdgeWrapping; return t;
}
function glowTex() {
 const [c, g] = cnv(128, 128);
 const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
 gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
 g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
 const t = tex(c); t.wrapS = t.wrapT = ClampToEdgeWrapping; return t;
}
function blobTex() {
 const [c, g] = cnv(256, 128);
 for (const [x, y, r] of [[70, 70, 44], [128, 58, 54], [186, 70, 42], [100, 76, 38], [158, 78, 36]]) {
  const gr = g.createRadialGradient(x, y, 2, x, y, r);
  gr.addColorStop(0, 'rgba(255,255,255,0.30)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
 }
 const t = tex(c); t.wrapS = t.wrapT = ClampToEdgeWrapping; return t;
}
function signTex(text, color, vertical = false, sub = '') {
 const [c, g] = cnv(vertical ? 192 : 640, vertical ? 640 : 160);
 g.clearRect(0, 0, c.width, c.height);
 g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 26;
 g.textAlign = 'center'; g.textBaseline = 'middle';
 if (vertical) { g.font = '900 92px Arial'; [...text].forEach((ch, i) => g.fillText(ch, 96, 62 + i * 82)); }
 else {
  g.font = '900 74px Arial'; g.fillText(text, 320, sub ? 62 : 80);
  if (sub) { g.font = '700 34px Arial'; g.fillText(sub, 320, 122); }
 }
 const t = tex(c); t.wrapS = t.wrapT = ClampToEdgeWrapping; return t;
}
function skylineTex() {
 const [c, g] = cnv(1024, 256);
 g.clearRect(0, 0, 1024, 256);
 const rnd = lcg(991);
 let x = 0;
 while (x < 1024) {
  const w = 30 + rnd() * 70, h = 90 + rnd() * 160;
  g.fillStyle = '#463a55'; g.fillRect(x, 256 - h, w, h);
  const dots = Math.floor(w * h / 260);
  for (let i = 0; i < dots; i++) { g.fillStyle = rnd() < 0.8 ? 'rgba(255,205,130,0.85)' : 'rgba(170,215,255,0.85)'; g.fillRect(x + 3 + rnd() * (w - 6), 256 - h + 4 + rnd() * (h - 10), 2.4, 3.2); }
  x += w + 4 + rnd() * 16;
 }
 const t = tex(c); t.wrapS = RepeatWrapping; t.wrapT = ClampToEdgeWrapping; return t;
}
function awningTex() {
 const [c, g] = cnv(128, 128);
 for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8e4da' : '#c22e4a'; g.fillRect(i * 16, 0, 16, 128); }
 return tex(c);
}
function mergeParts(parts) {
 let vtx = 0, idx = 0;
 for (const p of parts) { vtx += p.g.attributes.position.count; idx += p.g.index ? p.g.index.count : p.g.attributes.position.count; }
 const pos = new Float32Array(vtx * 3), nor = new Float32Array(vtx * 3), uv = new Float32Array(vtx * 2);
 const index = new Uint32Array(idx);
 const geo = new BufferGeometry();
 let vo = 0, io = 0;
 for (const p of parts) {
  const g = p.g.clone(); g.applyMatrix4(p.m);
  pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
  if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
  const cnt = g.attributes.position.count;
  if (g.index) { const gi = g.index.array; for (let i = 0; i < gi.length; i++) index[io + i] = gi[i] + vo; geo.addGroup(io, gi.length, p.mat || 0); io += gi.length; }
  else { for (let i = 0; i < cnt; i++) index[io + i] = vo + i; geo.addGroup(io, cnt, p.mat || 0); io += cnt; }
  vo += cnt;
 }
 geo.setAttribute('position', new BufferAttribute(pos, 3));
 geo.setAttribute('normal', new BufferAttribute(nor, 3));
 geo.setAttribute('uv', new BufferAttribute(uv, 2));
 geo.setIndex(new BufferAttribute(index, 1));
 return geo;
}
const M4 = (x, y, z, ry = 0, s = 1) => {
 const m = new Matrix4().makeRotationY(ry);
 m.setPosition(x, y, z); if (s !== 1) m.multiply(new Matrix4().makeScale(s, s, s));
 return m;
};
const MOODS = {golden:{top:'#46589f',mid:'#e88a6d',bot:'#ffd08a',sun:'#ffdf9e',sunI:2.7,sunDir:[-0.55,0.34,-0.35],hemiSky:'#a8c2e8',hemiGnd:'#7a5c40',hemiI:0.66,fog:'#eda87e',fogFar:3400,lamp:0.22,pool:0.03,win:0.32,amb:0.26}};
export function buildEnvironmentReflections(renderer, scene) {
 const env = new Scene();
 const [c, g] = cnv(64, 256);
 const gr = g.createLinearGradient(0, 0, 0, 256);
 gr.addColorStop(0, '#46589f'); gr.addColorStop(0.52, '#e2707a'); gr.addColorStop(0.78, '#ffc36b'); gr.addColorStop(1, '#4a3220');
 g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
 const domeTex = tex(c); domeTex.wrapS = domeTex.wrapT = ClampToEdgeWrapping;
 env.add(new Mesh(new SphereGeometry(60, 24, 16), new MeshBasicMaterial({ map: domeTex, side: BackSide })));
 const gnd = new Mesh(new CircleGeometry(58, 24), new MeshBasicMaterial({ color: 0x2a1c12 }));
 gnd.rotation.x = -Math.PI / 2; gnd.position.y = -3; env.add(gnd);
 const card = (w, h, x, y, z, rgb) => {
  const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ side: DoubleSide }));
  m.material.color.setRGB(rgb[0], rgb[1], rgb[2]);
  m.position.set(x, y, z); m.lookAt(0, y, 0); env.add(m);
 };
 const WARM = [[12,9,5],[11,7,4],[9,8,7],[12,6,3],[7,8,10],[10,5,4]];
 for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2, r = 42;
  card(8 + (i % 3) * 3, 14 + (i % 4) * 4, Math.cos(a) * r, 8 + (i % 3) * 3, Math.sin(a) * r, WARM[i % WARM.length]);
 }
 card(46, 16, -34, 6, -21, [13, 9.5, 5.5]);
 const pmrem = new PMREMGenerator(renderer);
 scene.environment = pmrem.fromScene(env, 0.04).texture;
 pmrem.dispose();
}
export function buildProceduralCoralCity(scene, rng) {
 const colliders = [];
 const coll = (x0, z0, x1, z1) => colliders.push({ x0, z0, x1, z1 });
 const dyn = { winMats: [], water: null, clouds: [], spinners: [], blimp: null };
 const gm = (color, rough = 1) => new MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
 const box = (w, h, d, mat, x = 0, y = 0, z = 0, p = scene) => { const m = new Mesh(new BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; };
 const skyUni = {
  topColor:{value:new Color('#2c2a5e')},midColor:{value:new Color('#a83e70')},
  botColor:{value:new Color('#ff9e4f')},sunColor:{value:new Color('#ffc07a')},
  sunDir:{value:new Vector3(-0.62,0.17,-0.38).normalize()},
 };
 const sky = new Mesh(new SphereGeometry(3300, 32, 18), new ShaderMaterial({
  uniforms: skyUni, side: BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 topColor, midColor, botColor, sunColor, sunDir; varying vec3 vDir;
   void main(){ vec3 d = normalize(vDir); float h = d.y;
    vec3 col = mix(botColor, midColor, smoothstep(-0.06, 0.20, h));
    col = mix(col, topColor, smoothstep(0.16, 0.62, h));
    float s = max(dot(d, normalize(sunDir)), 0.0);
    col += sunColor * (pow(s, 420.0) * 1.6 + pow(s, 20.0) * 0.38 + pow(s, 3.0) * 0.12);
    gl_FragColor = vec4(col, 1.0); }`,
 }));
 scene.add(sky);
 scene.fog = new Fog(0xdd8a76, 480, 2800);
 {
  const st = skylineTex();
  const mk = (w, x, z, ry) => {
   const t2 = st.clone(); t2.needsUpdate = true; t2.repeat.set(w / 900, 1);
   const m = new Mesh(new PlaneGeometry(w, 210), new MeshBasicMaterial({ map: t2, transparent: true, fog: false, depthWrite: false, side: DoubleSide }));
   m.position.set(x, 88, z); m.rotation.y = ry; scene.add(m); return m;
  };
  mk(2600, 240, -1250, 0); mk(2600, 240, 1350, Math.PI);
  mk(2400, -1150, 40, Math.PI / 2); mk(2400, 1750, 40, -Math.PI / 2);
 }
 {
  const bt = blobTex();
  for (let i = 0; i < 9; i++) {
   const sm = new SpriteMaterial({ map: bt, color: 0xffd9c9, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
   const sp = new Sprite(sm);
   sp.position.set(rng.range(-1400, 1800), rng.range(280, 430), rng.range(-1300, 1300));
   sp.scale.set(rng.range(380, 640), rng.range(90, 150), 1);
   scene.add(sp); dyn.clouds.push(sp);
  }
 }
 const hemi = new HemisphereLight(0x8a6bbf, 0x4a3226, 0.55); scene.add(hemi);
 const amb = new AmbientLight(0xffe0c0, 0.22); scene.add(amb);
 const sun = new DirectionalLight(0xffc07a, 2.9);
 sun.castShadow = true;
 sun.shadow.mapSize.set(2048, 2048);
 sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
 sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180;
 sun.shadow.camera.near = 40; sun.shadow.camera.far = 1150;
 sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4;
 scene.add(sun); scene.add(sun.target);
 const plane = (w, d, mat, x, z, y = 0) => {
  const m = new Mesh(new PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m;
 };
 plane(3400, 3400, gm(0x23262c), 280, 0, -0.08);
 for (const d of DISTRICT_DEFS) plane(d.x1 - d.x0, d.z1 - d.z0, gm(new Color(d.tint).multiplyScalar(0.55).getHex()), (d.x0 + d.x1) / 2, (d.z0 + d.z1) / 2, -0.03);
 plane(46, 1120, gm(0xc2a878, 0.95), 447, 0, 0.005);
 plane(14, 1120, gm(0x8a6f4d, 0.9), 424, 0, 0.012);
 const waterMat = new MeshPhongMaterial({ color: 0x14425e, specular: 0xffb36b, shininess: 170, transparent: true, opacity: 0.96 });
 {
  const [wc, wg] = cnv(256, 256);
  wg.fillStyle = '#7a8a99'; wg.fillRect(0, 0, 256, 256);
  const rnd = lcg(31);
  for (let i = 0; i < 380; i++) { wg.fillStyle = `rgba(255,255,255,${0.12 + rnd() * 0.3})`; wg.fillRect(rnd() * 256, rnd() * 40, 14 + rnd() * 42, 2); }
  waterMat.alphaMap = tex(wc); waterMat.alphaMap.repeat.set(30, 40);
  const w = new Mesh(new PlaneGeometry(880, 2400), waterMat);
  w.rotation.x = -Math.PI / 2; w.position.set(910, -1.25, 0); scene.add(w);
  dyn.water = waterMat;
  const foam = new Mesh(new PlaneGeometry(5, 1120), new MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.4, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(469, -0.5, 0); scene.add(foam);
  const foam2 = foam.clone(); foam2.position.set(742, -0.5, 0); foam2.scale.x = 0.8; scene.add(foam2);
 }
 {
  const deck = box(ISLAND_X0 - 452, 1.2, 21, gm(0x3c4048, 0.9), (452 + ISLAND_X0) / 2, -0.6, BRIDGE_Z);
  deck.receiveShadow = true;
  for (const sgn of [-1, 1]) {
   box(ISLAND_X0 - 452, 1.1, 0.5, gm(0x9aa2ae, 0.6), (452 + ISLAND_X0) / 2, 0.55, BRIDGE_Z + sgn * 10.2);
   coll(452, BRIDGE_Z + sgn * 10.2 - 0.4, ISLAND_X0, BRIDGE_Z + sgn * 10.2 + 0.4);
  }
  for (let x = 490; x < ISLAND_X0; x += 62) box(4, 6, 17, gm(0x565c66, 0.95), x, -4, BRIDGE_Z);
 }
 coll(SHORE_X + 2, -590, SHORE_X + 5, BRIDGE_Z - 13);
 coll(SHORE_X + 2, BRIDGE_Z + 13, SHORE_X + 5, 590);
 coll(ISLAND_X0 - 5, -590, ISLAND_X0 - 2, BRIDGE_Z - 13);
 coll(ISLAND_X0 - 5, BRIDGE_Z + 13, ISLAND_X0 - 2, 590);
 coll(-590, -590, 1150, -586); coll(-590, 586, 1150, 590);
 coll(-590, -590, -586, 590); coll(1146, -590, 1150, 590);
 coll(ISLAND_X0 - 4, -272, WORLD_X1 + 4, -268); coll(ISLAND_X0 - 4, 268, WORLD_X1 + 4, 272);
 const asphalt = asphaltSet();
 const roadMat = new MeshStandardMaterial({ color: 0xd9d3cb, map: asphalt.map, roughnessMap: asphalt.rough, roughness: 1.0, metalness: 0.32, bumpMap: asphalt.bump, bumpScale: 0.6, envMapIntensity: 0.75 });
 const plainAsphalt = new MeshStandardMaterial({ color: 0x2a2b30, roughness: 0.6, metalness: 0.25, envMapIntensity: 0.45 });
 function roadStrip(len, wid, x, z, alongX) {
  const geo = new PlaneGeometry(len, wid);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 34);
  geo.rotateX(-Math.PI / 2);
  if (!alongX) geo.rotateY(Math.PI / 2);
  const m = new Mesh(geo, roadMat);
  m.position.set(x, 0.02, z); m.receiveShadow = true; scene.add(m); return m;
 }
 for (const z of AVENUES) { roadStrip(SHORE_X + 560, 17, (-560 + SHORE_X) / 2, z, true); roadStrip(14, 17, SHORE_X + 7, z, true); }
 for (const z of ISLAND_AVENUES) roadStrip(WORLD_X1 - ISLAND_X0, 17, (ISLAND_X0 + WORLD_X1) / 2, z, true);
 for (const x of MAIN_STREETS) roadStrip(1120, x === 400 ? 19 : 15.5, x, 0, false);
 for (const x of [800, 935, 1070]) roadStrip(520, 15.5, x, 0, false);
 const crossMat = new MeshBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.75 });
 function intersection(x, z, w) {
  const m = new Mesh(new PlaneGeometry(w, w), plainAsphalt);
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.032, z); m.receiveShadow = true; scene.add(m);
  for (const [dx, dz, rot] of [[0, -w / 2 + 2.2, 0], [0, w / 2 - 2.2, 0], [-w / 2 + 2.2, 0, Math.PI / 2], [w / 2 - 2.2, 0, Math.PI / 2]]) {
   for (let i = -2; i <= 2; i++) {
    const s = new Mesh(new PlaneGeometry(3.6, 1.1), crossMat);
    s.rotation.x = -Math.PI / 2; s.rotation.z = rot;
    s.position.set(x + dx + (rot ? 0 : i * 3.4), 0.045, z + dz + (rot ? i * 3.4 : 0));
    scene.add(s);
   }
  }
 }
 for (const x of MAIN_STREETS) for (const z of AVENUES) intersection(x, z, x === 400 ? 19 : 17);
 for (const x of [800, 935, 1070]) for (const z of ISLAND_AVENUES) intersection(x, z, 17);
 const conc = concreteTex();
 const walkMat = new MeshStandardMaterial({ map: conc, roughness: 0.9, metalness: 0 });
 const walkGeo = new BoxGeometry(1, 0.18, 1);
 function sidewalk(len, x, z, alongX, w = 3.4) {
  const m = new Mesh(walkGeo, walkMat);
  m.scale.set(alongX ? len : w, 1, alongX ? w : len);
  m.position.set(x, 0.09, z); m.receiveShadow = true; m.castShadow = false; scene.add(m);
 }
 for (const z of AVENUES) for (const sgn of [-1, 1]) sidewalk(1030, -45, z + sgn * 10.4, true);
 for (const x of MAIN_STREETS) for (const sgn of [-1, 1]) sidewalk(1120, x + sgn * (x === 400 ? 11.4 : 9.6), 0, false);
 const facades = [
  facadeSet('#8a6f5c', '#4a382c', 0.5, 101), facadeSet('#5c6678', '#2e3442', 0.62, 202),
  facadeSet('#9a8a72', '#5a4c38', 0.44, 303), facadeSet('#7a4a5e', '#452a38', 0.58, 404),
 ];
 const facadeMats = facades.map((f) => {
  const m = new MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffc37a, emissiveIntensity: 0.85, roughness: 0.82, metalness: 0.08, envMapIntensity: 0.5 });
  dyn.winMats.push(m); return m;
 });
 const roofMat = gm(0x2e3138, 0.95);
 const glassMat = new MeshPhysicalMaterial({ color: 0x1c2836, metalness: 0.9, roughness: 0.12, envMapIntensity: 1.5, emissive: 0xff9a4d, emissiveIntensity: 0.22 });
 const NEON = [0xff2a85, 0x00f0ff, 0xffb800];
 const glowT = glowTex();
 function neonGlow(x, y, z, color, scale = 7, op = 0.4) {
  const sm = new SpriteMaterial({ map: glowT, color, transparent: true, opacity: op, blending: AdditiveBlending, depthWrite: false });
  const sp = new Sprite(sm); sp.position.set(x, y, z); sp.scale.set(scale, scale, 1); scene.add(sp); return sp;
 }
 function signPlane(text, color, w, h, x, y, z, ry, vertical = false, sub = '') {
  const t = signTex(text, color, vertical, sub);
  const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ map: t, transparent: true, side: DoubleSide, depthWrite: false }));
  m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  const back = box(vertical ? 0.5 : w * 0.96, vertical ? h * 0.98 : h * 0.8, 0.5, gm(0x14161c, 0.8), x - Math.sin(ry) * 0.4, y, z - Math.cos(ry) * 0.4);
  back.rotation.y = ry;
  return m;
 }
 function scaledFacadeGeo(w, h, d) {
  const g = new BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 17, uv.getY(i) * h / 34);
  return g;
 }
 function makeBuilding(cx, cz, w, d, h, mat, opts = {}) {
  const grp = new Group(); grp.position.set(cx, 0, cz);
  const tiers = h > 62 ? 3 : h > 32 ? 2 : 1;
  let y = 0, inset = 1;
  for (let t = 0; t < tiers; t++) {
   const th = t === tiers - 1 ? h - y : (h / tiers) * (t === 0 ? 1.15 : 0.95);
   const tw = w * inset, td = d * inset;
   const tier = new Mesh(scaledFacadeGeo(tw, th, td), mat);
   tier.position.y = y + th / 2; tier.castShadow = true; tier.receiveShadow = true; grp.add(tier);
   const cap = box(tw + 1.1, 0.7, td + 1.1, roofMat, 0, y + th + 0.35, 0, grp); cap.castShadow = true;
   y += th; inset *= 0.85;
  }
  if (opts.glass) box(w + 0.6, 3.4, d + 0.6, glassMat, 0, 1.7, 0, grp);
  if (opts.roofProps) {
   const n = rng.int(1, 3);
   for (let i = 0; i < n; i++) {
    const ac = box(rng.range(2, 4.4), rng.range(1, 1.8), rng.range(2, 3.6), gm(0x6a7076, 0.7), rng.range(-w / 4, w / 4), h + rng.range(0.6, 1), rng.range(-d / 4, d / 4), grp);
    ac.castShadow = true;
   }
   if (h > 52 && rng.chance(0.6)) {
    const wt = new Group(); wt.position.set(rng.range(-w / 5, w / 5), h + 0.7, rng.range(-d / 5, d / 5));
    const tank = new Mesh(new CylinderGeometry(2.3, 2.3, 4.4, 10), gm(0x7a5c40, 0.9));
    tank.position.y = 4.2; tank.castShadow = true; wt.add(tank);
    const cone = new Mesh(new ConeGeometry(2.7, 1.8, 10), roofMat); cone.position.y = 7.2; wt.add(cone);
    grp.add(wt);
   }
  }
  if (opts.neon && rng.chance(0.75)) {
   const color = NEON[rng.int(0, 2)];
   const fx = (rng.chance(0.5) ? -1 : 1) * (w / 2 + 0.25), fz = (rng.chance(0.5) ? -1 : 1) * (d / 2 + 0.25);
   box(0.34, h * 0.82, 0.34, new MeshBasicMaterial({ color }), fx, h * 0.46, fz, grp);
   neonGlow(cx + fx, h * 0.5, cz + fz, color, 9, 0.30);
  }
  scene.add(grp);
  coll(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2);
  return grp;
 }
 function makeWarehouse(cx, cz, w, d, h) {
  const mat = gm(rng.pick([0x6e6258, 0x5e6a72, 0x746a5a]), 0.85);
  const b = box(w, h, d, mat, cx, h / 2, cz); b.castShadow = true; b.receiveShadow = true;
  box(w * 0.3, h * 0.62, 0.3, gm(0x22262c, 0.6), cx - w * 0.2, h * 0.31, cz + d / 2 + 0.1);
  box(w, 0.9, d + 0.24, new MeshBasicMaterial({ color: 0xffb800 }), cx, h - 0.8, cz);
  coll(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2);
 }
 const sHalf = (x) => (x === 400 ? 9.5 : 7.75), aHalf = 8.5;
 for (let si = 0; si < MAIN_STREETS.length - 1; si++) for (let ai = 0; ai < AVENUES.length - 1; ai++) {
  const bx0 = MAIN_STREETS[si] + sHalf(MAIN_STREETS[si]) + 3, bx1 = MAIN_STREETS[si + 1] - sHalf(MAIN_STREETS[si + 1]) - 3;
  const bz0 = AVENUES[ai] + aHalf + 3, bz1 = AVENUES[ai + 1] - aHalf - 3;
  if (bx1 - bx0 < 20 || bz1 - bz0 < 20) continue;
  const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, bw = bx1 - bx0, bd = bz1 - bz0;
  if (cx > BANK_POS.x - 40 && cx < BANK_POS.x + 40 && cz > BANK_POS.z - 40 && cz < BANK_POS.z + 40) continue;
  if (cx > GARAGE_POS.x - 42 && cx < GARAGE_POS.x + 42 && cz > 230 && cz < 345) continue;
  const dist = districtAt(cx, cz).name;
  if (dist === 'Las Ciénagas') continue;
  if (dist === 'Port Azahar') {
   makeWarehouse(cx + rng.range(-8, 8), cz, Math.min(bw * 0.8, 64), Math.min(bd * 0.62, 34), rng.range(10, 15));
   if (rng.chance(0.7)) {
    const cont = box(12, 2.6, 5, gm(rng.pick([0xb04a32, 0x3262a8, 0x3f8a52, 0xb8862e]), 0.7), bx0 + 10, 1.3, bz1 - 6);
    cont.castShadow = true;
    coll(bx0 + 4, bz1 - 8.5, bx0 + 16, bz1 - 3.5);
   }
   continue;
  }
  if (MAIN_STREETS[si] === 320 && dist === 'Coral Beach') {
   const n = bd > 90 ? 2 : 1;
   for (let i = 0; i < n; i++) {
    const hz = n === 1 ? cz : bz0 + (bd / n) * (i + 0.5);
    makeBuilding(bx0 + 15, hz, 25, Math.min(bd / n - 12, 52), rng.range(26, 46), facadeMats[rng.int(0, 3)], { glass: true, neon: true, roofProps: true });
   }
   continue;
  }
  if (dist === 'Downtown') {
   const n = rng.int(2, 3);
   for (let i = 0; i < n; i++) makeBuilding(bx0 + (bw / n) * (i + 0.5), cz + rng.range(-9, 9), rng.range(24, Math.min(38, bw / n - 8)), rng.range(24, 38), rng.range(48, 125), facadeMats[rng.int(0, 3)], { glass: true, neon: true, roofProps: true });
   continue;
  }
  const n = rng.int(1, 2);
  for (let i = 0; i < n; i++) makeBuilding(bx0 + (bw / n) * (i + 0.5), cz + rng.range(-8, 8), rng.range(22, 34), rng.range(22, 34), rng.range(22, 52), facadeMats[rng.int(0, 3)], { glass: true, neon: true, roofProps: true });
 }
 for (const [vx,vz] of [[768,-160],[768,128],[878,-192],[882,150],[1002,-168],[1012,142],[1096,-118],[862,-28],[985,30],[1092,96]]) {
  const w = rng.range(13, 18), d = rng.range(11, 15), h = rng.range(6.5, 9);
  const v = box(w, h, d, gm(rng.pick([0xd8cfc0, 0xc4d4da, 0xe0c8b0, 0xcbd8c2]), 0.9), vx, h / 2, vz);
  v.castShadow = true; v.receiveShadow = true;
  const roofG = new BufferGeometry();
  const hw = w / 2 + 1, hd = d / 2 + 1, rh2 = 3.4;
  roofG.setAttribute('position', new BufferAttribute(new Float32Array([
   -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd, -hw, rh2, 0, hw, rh2, 0]), 3));
  roofG.setIndex([0, 1, 4, 1, 5, 4, 2, 3, 5, 3, 4, 5, 3, 0, 4, 1, 2, 5]);
  roofG.computeVertexNormals();
  const roof = new Mesh(roofG, gm(0x9a4636, 0.9));
  roof.position.set(vx, h, vz); roof.castShadow = true; scene.add(roof);
  coll(vx - w / 2, vz - d / 2, vx + w / 2, vz + d / 2);
 }
 {
  const stone = new MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.7 });
  const darkStone = gm(0x8a7f68, 0.7);
  const bank = new Group(); bank.position.set(BANK_POS.x, 0, BANK_POS.z);
  const main = box(46, 15, 22, stone, 0, 7.5, 0, bank); main.castShadow = true; main.receiveShadow = true;
  const ent = box(40, 2.6, 3.4, darkStone, 0, 13.4, -12, bank); ent.castShadow = true;
  const ped = new BufferGeometry();
  ped.setAttribute('position', new BufferAttribute(new Float32Array([-19, 0, 0, 19, 0, 0, 0, 5.4, 0]), 3));
  ped.setIndex([0, 1, 2]); ped.computeVertexNormals();
  const pedM = new Mesh(ped, stone); pedM.position.set(0, 14.7, -13.4); bank.add(pedM);
  box(38, 5.2, 0.8, stone, 0, 17.3, -10.6, bank);
  for (let i = 0; i < 6; i++) {
   const col = new Mesh(new CylinderGeometry(0.85, 0.95, 11.5, 14), stone);
   col.position.set(-16.5 + i * 6.6, 5.75 + 1.1, -13.2); col.castShadow = true; bank.add(col);
   box(2.3, 0.7, 2.3, darkStone, -16.5 + i * 6.6, 12.6, -13.2, bank);
  }
  for (let s = 0; s < 3; s++) {
   const step = box(42 - s * 3, 0.55, 2.2, darkStone, 0, 0.55, -12.4 - s * 1.9, bank); step.receiveShadow = true;
  }
  box(10, 8.5, 0.4, glassMat, 0, 4.25, -11.2, bank);
  scene.add(bank);
  signPlane('BANCO CORAL', '#ffb800', 24, 3.4, BANK_POS.x, 13.4, BANK_POS.faceZ - 4.6, Math.PI);
  coll(BANK_POS.x - 23, BANK_POS.z - 11, BANK_POS.x + 23, BANK_POS.z + 11);
  coll(BANK_POS.x - 21, BANK_POS.faceZ - 4, BANK_POS.x + 21, BANK_POS.faceZ - 2.4);
 }
 {
  const g = new Group(); g.position.set(GARAGE_POS.x, 0, GARAGE_POS.z);
  const wallM = gm(0x59636e, 0.85), darkM = gm(0x22262c, 0.6);
  const wall = (w, h, d, x, y, z, mat = wallM) => { const m = box(w, h, d, mat, x, y, z, g); m.castShadow = true; m.receiveShadow = true; return m; };
  wall(38, 9.5, 0.6, 0, 4.75, -8);
  wall(0.6, 9.5, 16, -19, 4.75, 0); wall(0.6, 9.5, 16, 19, 4.75, 0);
  wall(38, 0.6, 16.6, 0, 9.5, 0);
  wall(38, 0.15, 16, 0, 0.07, 0, gm(0x3a3f46, 0.7));
  const liftM = gm(0xd8a018, 0.45);
  for (const px of [-8.4, 0.4]) wall(0.55, 3.4, 0.55, px, 1.7, 0, liftM);
  wall(9.4, 0.4, 0.5, -4, 3.35, 0, liftM);
  wall(7.6, 0.28, 3.2, -4, 0.92, 0, darkM);
  wall(11, 3.4, 0.4, -11.5, 1.7, -7.6, gm(0x7a2e2e, 0.6));
  wall(5, 2.2, 1.1, -13.5, 1.1, -7.2, gm(0x2e4a68, 0.6));
  for (let i = 0; i < 3; i++) { const t = new Mesh(new TorusGeometry(0.52, 0.19, 8, 16), darkM); t.rotation.x = Math.PI / 2; t.position.set(-14.5, 0.22 + i * 0.4, -4.5); t.castShadow = true; g.add(t); }
  for (const lx of [-9, 1]) { const strip = new Mesh(new BoxGeometry(4.6, 0.12, 0.5), new MeshBasicMaterial({ color: 0xffe2b0 })); strip.position.set(lx, 9.1, 1); g.add(strip); }
  const workLight = new PointLight(0xffc98a, 500, 46, 1.8); workLight.position.set(0, 7.4, 2); g.add(workLight);
  const sign = new Mesh(new PlaneGeometry(16, 2.3), new MeshBasicMaterial({ map: signTex('DOCKSIDE CUSTOMS', '#00f0ff'), transparent: true }));
  sign.position.set(-4, 6.9, -7.65); g.add(sign);
  scene.add(g);
  signPlane('TALLER NEON', '#00f0ff', 20, 3, GARAGE_POS.x - 4, 8.6, GARAGE_POS.faceZ + 0.7, 0, false, 'RESPRAY · TUNING · ARMOR');
  coll(GARAGE_POS.x - 19, GARAGE_POS.z - 8, GARAGE_POS.x + 19, GARAGE_POS.z + 8);
 }
 {
  makeBuilding(347, -152, 25, 64, 47, facadeMats[3], { glass: true, roofProps: true });
  signPlane('MARISOL', '#ff2a85', 9, 30, 361.5, 17, -152, Math.PI / 2, true);
  signPlane('HOTEL MARISOL', '#ff2a85', 17, 2.8, 360.5, 44, -152, Math.PI / 2);
  const awn = new Mesh(new PlaneGeometry(20, 4.6), new MeshStandardMaterial({ map: awningTex(), side: DoubleSide, roughness: 0.9 }));
  awn.position.set(361, 4.1, -152); awn.rotation.y = Math.PI / 2; awn.rotation.x = 0; awn.rotation.z = 0; awn.rotation.order = 'YXZ'; awn.rotation.x = -0.5;
  scene.add(awn);
  neonGlow(362.5, 17, -152, 0xff2a85, 15, 0.4);
 }
 {
  signPlane('CLUB FIEBRE', '#00f0ff', 16, 2.8, 313.5, 10.5, -18, Math.PI / 2);
  neonGlow(314.5, 10.5, -18, 0x00f0ff, 11, 0.35);
 }
 for (const [px, pz] of [[120, 522], [268, 528]]) {
  const crane = new Group(); crane.position.set(px, 0, pz);
  const steel = gm(0xc25e2e, 0.6);
  for (const [lx, lz] of [[-11, -5], [11, -5], [-11, 5], [11, 5]]) {
   const leg = box(1.6, 34, 1.6, steel, lx, 17, lz, crane); leg.castShadow = true;
  }
  box(30, 2.6, 13, steel, 0, 34, 0, crane);
  box(3, 2, 44, steel, 0, 36.5, -8, crane);
  box(0.3, 17, 0.3, gm(0x222222, 0.5), 0, 27, -24, crane);
  box(5, 3.4, 5, gm(0x3262a8, 0.7), 0, 17, -24, crane);
  scene.add(crane);
  coll(px - 13, pz - 7, px + 13, pz + 7);
 }
 {
  const lh = new Group(); lh.position.set(1106, 0, 214);
  const bands = [0xe8e4da, 0xc22e3a, 0xe8e4da, 0xc22e3a];
  for (let i = 0; i < 4; i++) {
   const seg = new Mesh(new CylinderGeometry(2.6 - i * 0.3, 2.9 - i * 0.3, 4.6, 14), gm(bands[i], 0.7));
   seg.position.y = 2.3 + i * 4.6; seg.castShadow = true; lh.add(seg);
  }
  const lampM = new Mesh(new CylinderGeometry(1.3, 1.3, 2.2, 10), new MeshBasicMaterial({ color: 0xffe9a8 }));
  lampM.position.y = 19.6; lh.add(lampM);
  const capL = new Mesh(new ConeGeometry(1.9, 1.6, 10), gm(0x22262c, 0.6)); capL.position.y = 21.4; lh.add(capL);
  scene.add(lh);
  neonGlow(1106, 19.6, 214, 0xffe9a8, 13, 0.5);
  coll(1102, 210, 1110, 218);
 }
 {
  const red = gm(0xc23a22, 0.55);
  for (const tx of [520, 680]) for (const sgn of [-1, 1]) {
   const leg = box(1.7, 27, 1.7, red, tx, 13.5, BRIDGE_Z + sgn * 9.2); leg.castShadow = true;
   box(1.7, 1.4, 20, red, tx, 25.8, BRIDGE_Z);
   box(1.7, 1.4, 20, red, tx, 12, BRIDGE_Z);
  }
  for (const sgn of [-1, 1]) {
   const curve = new CatmullRomCurve3([
    new Vector3(455, 8.5, BRIDGE_Z + sgn * 9.2), new Vector3(520, 26.4, BRIDGE_Z + sgn * 9.2),
    new Vector3(600, 10.5, BRIDGE_Z + sgn * 9.2), new Vector3(680, 26.4, BRIDGE_Z + sgn * 9.2),
    new Vector3(738, 8.5, BRIDGE_Z + sgn * 9.2)]);
   scene.add(new Mesh(new TubeGeometry(curve, 32, 0.22, 6), red));
  }
 }
 {
  const deck = box(96, 1, 13, gm(0x8a6f4d, 0.9), 500, 0.1, -40); deck.receiveShadow = true;
  for (let px = 462; px <= 540; px += 13) for (const pz of [-45.5, -34.5]) {
   const post = new Mesh(new CylinderGeometry(0.32, 0.32, 3.4, 8), gm(0x5d4630, 0.95));
   post.position.set(px, -1.4, pz); scene.add(post);
  }
  const wheel = new Group(); wheel.position.set(534, 15.5, -40); wheel.rotation.y = Math.PI / 2;
  const spin = new Group(); wheel.add(spin);
  const rimM = gm(0xe8e4da, 0.4);
  for (const r of [13, 9.5]) { const rim = new Mesh(new TorusGeometry(r, 0.32, 8, 36), rimM); spin.add(rim); }
  const GOND = [0xff5fa2, 0xffb800, 0x37e0ff, 0xff6b35, 0x57e389, 0xc04df0, 0xff4757, 0x7be495];
  for (let i = 0; i < 8; i++) {
   const a = (i / 8) * Math.PI * 2;
   const spoke = new Mesh(new CylinderGeometry(0.14, 0.14, 13, 6), rimM);
   spoke.position.set(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0); spoke.rotation.z = a + Math.PI / 2; spin.add(spoke);
   const gon = box(2.2, 1.7, 1.8, gm(GOND[i], 0.5), Math.cos(a) * 13, Math.sin(a) * 13, 0, spin); gon.castShadow = true;
  }
  const hub = new Mesh(new SphereGeometry(1.1, 12, 10), gm(0xc23a22, 0.4)); spin.add(hub);
  for (const sgn of [-1, 1]) {
   const legA = box(0.7, 17.5, 0.7, gm(0x59636e, 0.6), sgn * 4.6, -8.2, 0, wheel); legA.rotation.z = sgn * 0.27;
  }
  scene.add(wheel); dyn.spinners.push(spin);
  coll(524, -48, 544, -32);
 }
 {
  const blimp = new Group(); blimp.position.set(300, 110, -150);
  const body = new Mesh(new SphereGeometry(3.4, 18, 12), gm(0xd84a5e, 0.35));
  body.scale.set(4.2, 1.22, 1.22); body.castShadow = true; blimp.add(body);
  const stripe = new Mesh(new SphereGeometry(3.42, 18, 8), gm(0xf2e8ee, 0.4));
  stripe.scale.set(4.2, 0.5, 1.22); blimp.add(stripe);
  for (const sgn of [-1, 1]) { const fin = box(2.6, 0.18, 1.6, gm(0x27364f, 0.5), -13.2, sgn * 1.4, 0, blimp); fin.rotation.z = sgn * 0.5; }
  box(3.2, 1, 1.4, gm(0x27364f, 0.5), 1.5, -4.1, 0, blimp);
  scene.add(blimp); dyn.blimp = blimp;
 }
 {
  const UMB = [0xff5fa2, 0xffb800, 0x37e0ff, 0xff6b35, 0x57e389, 0xc04df0];
  let ui = 0;
  for (let z = -520; z <= 520; z += 62) for (const ux of [443, 456]) {
   if (Math.abs(z - (-40)) < 16 && ux === 456) continue;
   const u = new Group(); u.position.set(ux + (ui % 3), 0, z + (ui % 5) * 3);
   const pole = new Mesh(new CylinderGeometry(0.05, 0.05, 2.3, 6), gm(0xe8e4da, 0.5));
   pole.position.y = 1.15; u.add(pole);
   const top = new Mesh(new ConeGeometry(1.6, 0.55, 10), gm(UMB[ui % UMB.length], 0.7));
   top.position.y = 2.35; top.castShadow = true; u.add(top);
   scene.add(u); ui++;
  }
 }
 signPlane('BODEGA DEL SOL', '#ffd23e', 15, 2.6, 361, 5, 88, Math.PI / 2);
 neonGlow(362, 5, 88, 0xffd23e, 9, 0.3);
 signPlane('MANGO & RYE', '#7be495', 13, 2.6, 361, 5, 147, Math.PI / 2);
 neonGlow(362, 5, 147, 0x7be495, 9, 0.3);
 const barkMat = new MeshStandardMaterial({ map: barkTex(), roughness: 1 });
 const frondMat = new MeshStandardMaterial({ map: frondTex(), alphaTest: 0.42, side: DoubleSide, roughness: 0.9 });
 function palmGeometry() {
  const curve = new CatmullRomCurve3([
   new Vector3(0, 0, 0), new Vector3(0.3, 1.7, 0.08),
   new Vector3(0.8, 3.4, 0.2), new Vector3(1.5, 5.2, 0.4),
  ]);
  const trunk = new TubeGeometry(curve, 10, 0.17, 7);
  const tuv = trunk.attributes.uv; for (let i = 0; i < tuv.count; i++) tuv.setY(i, tuv.getY(i) * 3);
  const parts = [{ g: trunk, m: new Matrix4(), mat: 0 }];
  for (let k = 0; k < 10; k++) {
   const f = new PlaneGeometry(3.1, 0.85, 6, 1);
   f.rotateX(-Math.PI / 2); f.translate(1.55, 0, 0);
   const p = f.attributes.position;
   for (let i = 0; i < p.count; i++) { const t = p.getX(i) / 3.1; p.setY(i, -t * t * 1.35); }
   f.computeVertexNormals();
   const m = new Matrix4().makeRotationY((k / 10) * Math.PI * 2 + (k % 3) * 0.2);
   m.setPosition(1.5, 5.2, 0.4);
   parts.push({ g: f, m, mat: 1 });
  }
  parts.push({ g: new SphereGeometry(0.34, 8, 6), m: M4(1.5, 5.05, 0.4), mat: 0 });
  return mergeParts(parts);
 }
 const palmGeo = palmGeometry();
 const palmMats = [barkMat, frondMat];
 function plantPalm(x, z, s = 1) {
  const p = new Mesh(palmGeo, palmMats);
  p.position.set(x, 0, z); p.rotation.y = rng.range(0, Math.PI * 2);
  p.scale.setScalar(s * rng.range(0.85, 1.2)); p.castShadow = true;
  scene.add(p);
 }
 for (let z = -545; z <= 545; z += 29) { if (AVENUES.some((a) => Math.abs(z - a) < 11)) continue; plantPalm(387.5, z + rng.range(-3, 3)); }
 for (let z = -530; z <= 545; z += 34) { if (AVENUES.some((a) => Math.abs(z - a) < 11)) continue; plantPalm(413, z + rng.range(-3, 3)); }
 for (let z = -520; z <= 540; z += 47) plantPalm(421, z + rng.range(-4, 4), 0.9);
 for (let z = -240; z <= 240; z += 58) { plantPalm(752, z + rng.range(-5, 5)); plantPalm(1108, z + rng.range(-5, 5)); }
 for (const [px, pz] of [[140, -96], [-96, 61], [140, 61], [-245, -96], [62, -238], [62, 202]]) plantPalm(px, pz, 0.92);
 {
  const darkBark = gm(0x3a2e22, 1), darkLeaf = gm(0x1e3a26, 1);
  const parts = [{ g: new CylinderGeometry(0.22, 0.34, 3.6, 7), m: M4(0, 1.8, 0), mat: 0 }];
  for (const [ox, oy, oz, s] of [[0, 4.6, 0, 1.6], [-1.3, 3.9, 0.4, 1.15], [1.25, 4.1, -0.3, 1.25], [0.2, 5.4, 0.7, 1.0]]) {
   parts.push({ g: new IcosahedronGeometry(1.5, 1), m: M4(ox, oy, oz, 0, s), mat: 1 });
  }
  const treeGeo = mergeParts(parts);
  const treeMats = [darkBark, darkLeaf];
  for (const gx of [-540, -468, -398, -330]) for (const gz of [-520, -385, -245, -105, 42, 185, 325, 465]) {
   const x = gx + rng.range(-17, 17), z = gz + rng.range(-17, 17);
   if (Math.abs(x + 420) < 26 && Math.abs(z - 60) < 26) continue;
   if (AVENUES.some((a) => Math.abs(z - a) < 13) || MAIN_STREETS.some((sx) => Math.abs(x - sx) < 13)) continue;
   const t = new Mesh(treeGeo, treeMats);
   t.position.set(x, 0, z); t.rotation.y = rng.range(0, 6); t.scale.setScalar(rng.range(0.9, 1.5)); t.castShadow = true;
   scene.add(t); coll(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
  }
  for (let i = 0; i < 6; i++) {
   const pond = new Mesh(new CircleGeometry(rng.range(9, 17), 18), new MeshPhongMaterial({ color: 0x14261c, specular: 0x9ab88a, shininess: 120 }));
   pond.rotation.x = -Math.PI / 2;
   pond.position.set(rng.range(-545, -285), 0.015, rng.range(-540, 540)); scene.add(pond);
  }
 }
 const lampGlowMat = new SpriteMaterial({ map: glowT, color: 0xffc98a, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false });
 const lampPoolMat = new MeshBasicMaterial({ color: 0xffbe78, transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false });
 const lampPoleGeo = (() => {
  const pole = new CylinderGeometry(0.09, 0.12, 6.6, 8); pole.translate(0, 3.3, 0);
  const arm = new BoxGeometry(2.3, 0.13, 0.13); arm.translate(1.05, 6.55, 0);
  return mergeParts([{ g: pole, m: new Matrix4(), mat: 0 }, { g: arm, m: new Matrix4(), mat: 0 }]);
 })();
 const lampSteel = gm(0x2c3036, 0.5);
 const lampHeadMat = new MeshBasicMaterial({ color: 0xffdca8 });
 const poolGeo = new CircleGeometry(5.4, 18); poolGeo.rotateX(-Math.PI / 2);
 function lamp(x, z, ry) {
  const grp = new Group(); grp.position.set(x, 0, z); grp.rotation.y = ry;
  const pole = new Mesh(lampPoleGeo, lampSteel); pole.castShadow = true; grp.add(pole);
  const head = new Mesh(new SphereGeometry(0.21, 10, 8), lampHeadMat); head.position.set(2.1, 6.5, 0); grp.add(head);
  const glow = new Sprite(lampGlowMat); glow.position.set(2.1, 6.5, 0); glow.scale.set(5.5, 5.5, 1); grp.add(glow);
  const pool = new Mesh(poolGeo, lampPoolMat); pool.position.set(2.1, 0.06, 0); grp.add(pool);
  scene.add(grp);
 }
 for (let z = -520; z <= 540; z += 55) lamp(410.5, z, Math.PI);
 for (let x = -240; x <= 110; x += 65) { lamp(x, -74.5, Math.PI / 2); lamp(x + 30, 61.5, Math.PI / 2); }
 for (let x = -200; x <= 420; x += 78) lamp(x, 308.5, -Math.PI / 2);
 {
  const bol = new InstancedMesh(new CylinderGeometry(0.09, 0.11, 0.8, 8), gm(0x30343a, 0.5), 92);
  const dummy = new Object3D(); let bi = 0;
  for (let z = -540; z <= 540 && bi < 92; z += 12) { dummy.position.set(416.5, 0.4, z); dummy.updateMatrix(); bol.setMatrixAt(bi++, dummy.matrix); }
  bol.count = bi; scene.add(bol);
  const hydGeo = mergeParts([
   { g: new CylinderGeometry(0.17, 0.19, 0.55, 10), m: M4(0, 0.28, 0), mat: 0 },
   { g: new SphereGeometry(0.15, 10, 8), m: M4(0, 0.62, 0), mat: 0 },
  ]);
  const hydMat = gm(0xb03030, 0.5);
  for (const [hx, hz] of [[392, -300], [392, 120], [318, -60], [60, -200], [200, 340], [-100, 90], [430, -420]]) {
   const hyd = new Mesh(hydGeo, hydMat); hyd.position.set(hx, 0, hz); hyd.castShadow = true; scene.add(hyd);
  }
  const binGeo = new CylinderGeometry(0.42, 0.38, 0.95, 10);
  const binMat = gm(0x2c4a38, 0.7);
  for (const [bx2, bz2] of [[390, -180], [390, 240], [330, -320], [120, -70], [-40, 200], [424, 60], [424, -480], [180, 460], [60, 300], [1000, 60]]) {
   const bin = new Mesh(binGeo, binMat); bin.position.set(bx2, 0.48, bz2); bin.castShadow = true; scene.add(bin);
  }
 }
 let sunDirV = new Vector3(-0.62, 0.17, -0.38).normalize();
 function setMood(name) {
  const m = MOODS[name] || MOODS.golden;
  skyUni.topColor.value.set(m.top); skyUni.midColor.value.set(m.mid); skyUni.botColor.value.set(m.bot);
  skyUni.sunColor.value.set(m.sun); skyUni.sunDir.value.set(...m.sunDir).normalize();
  sunDirV = new Vector3(...m.sunDir).normalize();
  sun.color.set(m.sun); sun.intensity = m.sunI;
  hemi.color.set(m.hemiSky); hemi.groundColor.set(m.hemiGnd); hemi.intensity = m.hemiI;
  amb.intensity = m.amb;
  scene.fog.color.set(m.fog); scene.fog.far = m.fogFar;
  for (const wm of dyn.winMats) wm.emissiveIntensity = m.win;
  lampGlowMat.opacity = m.lamp * 0.55; lampPoolMat.opacity = m.pool;
  if (dyn.water) dyn.water.specular.set(m.sun);
 }
 function followShadow(x, z) {
  sun.position.set(x + sunDirV.x * 430, Math.max(60, sunDirV.y * 430), z + sunDirV.z * 430);
  sun.target.position.set(x, 0, z);
  sun.target.updateMatrixWorld();
 }
 function update(dt, t) {
  if (dyn.water && dyn.water.alphaMap) { dyn.water.alphaMap.offset.x = t * 0.008; dyn.water.alphaMap.offset.y = Math.sin(t * 0.3) * 0.02; }
  for (const c of dyn.clouds) { c.position.x += dt * 1.4; if (c.position.x > 2100) c.position.x = -1600; }
  for (const s of dyn.spinners) s.rotation.z += dt * 0.12;
  if (dyn.blimp) { dyn.blimp.position.x += dt * 2.4; if (dyn.blimp.position.x > 1500) dyn.blimp.position.x = -1300; }
 }
 function resolve(x, z, r) {
  for (const c of colliders) {
   if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) {
    const pl = x - (c.x0 - r), pr = (c.x1 + r) - x, pt = z - (c.z0 - r), pb = (c.z1 + r) - z;
    const m = Math.min(pl, pr, pt, pb);
    if (m === pl) x = c.x0 - r; else if (m === pr) x = c.x1 + r; else if (m === pt) z = c.z0 - r; else z = c.z1 + r;
   }
  }
  return [Math.max(-584, Math.min(1144, x)), Math.max(-584, Math.min(584, z))];
 }
 setMood('golden');
 followShadow(390, -60);
 return { update, followShadow, setMood, resolve, colliders, avenues: AVENUES, streets: STREETS, sun, hemi };
}

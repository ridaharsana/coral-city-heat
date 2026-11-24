// CORAL CITY HEAT — HUD: the classic live stack (cash, stars, bars, speedo, district card,
// banner, radio, weapon) plus the staged showcase systems: mission + crew cards, MARISOL
// PATROL dispatch, fixer dialogue, 6-slot hotbar + vehicle box, coastal GPS radar, the
// Dockside Customs garage panel and the title menu. Dark cards, data-driven tables below.
import { DISTRICTS, RADIO_STATIONS, WEAPONS } from './config.js';
import { AVENUES, STREETS } from './world.js';
import { MISSIONS } from './missions.js';
import { PROTAGONISTS } from './people.js';
const $ = (id) => document.getElementById(id);
const CARD = 'background:rgba(10,12,26,.85);border:1px solid rgba(255,255,255,.18);border-radius:10px;box-shadow:0 6px 22px rgba(0,0,0,.45);';
function mk(parent, css, html) { const e = document.createElement('div'); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.appendChild(e); return e; }
function face(skin, hair, cloth, bg) { return `<svg width="36" height="36" viewBox="0 0 36 36"><rect width="36" height="36" fill="${bg}"/><path d="M5 36c1.6-7.4 6.4-10 13-10s11.4 2.6 13 10z" fill="${cloth}"/><circle cx="18" cy="14.5" r="6.6" fill="${skin}"/><path d="M11.2 14a6.8 6.8 0 0 1 13.6 0l-.4-3.4a6.8 6.8 0 0 0-12.8 0z" fill="${hair}"/></svg>`; }
const CREW = [
  { key: 'Z', name: 'PILAR SANTOS', role: 'GETAWAY', abil: 'Swap Plates', st: 'READY', ok: 1, skin: '#c98a64', hair: '#2a1a12', cloth: '#d6336c', bg: '#3a2438' },
  { key: 'X', name: 'UNCLE MATEO', role: 'SCANNER', abil: 'Jam Dispatch', st: '24s', ok: 0, skin: '#8a5a3c', hair: '#6b6259', cloth: '#8a6d3b', bg: '#2c3444' },
  { key: 'C', name: 'JUNO VEGA', role: 'DECOY', abil: 'Street Racer', st: 'READY', ok: 1, skin: '#e0aa7c', hair: '#101418', cloth: '#2e8f86', bg: '#20303a' }];
const UNITS = [['BAY-12', '6 m', 'RAMMING', '#ff4757'], ['AIR ONE', '48 m', 'SPOTLIGHT', '#37e0ff'], ['PIER-05', '11 m', 'FLANKING', '#ffd23e'], ['TIDE-37', '14 m', 'FIRING', '#ff2e63'], ['HARBOR-2', '110 m', 'ROADBLOCK', '#ff9f43']];
const GUNS = [
  ['1', 'FISTS', '∞', 'M13 15V8a2.4 2.4 0 0 1 4.8 0V6a2.4 2.4 0 0 1 4.8 0V5a2.4 2.4 0 0 1 4.8 0v6c0 6-3.4 10-9 10-4.6 0-7.4-2.3-9.4-6z'],
  ['2', '.38 PISTOL', '84', 'M2 6h17l1-2h5v3h11l1 5h-8l-2-4H13l-1 7H6l1-7H2z'],
  ['3', 'RATTLER SMG', '120', 'M2 5h24l4 3h8v4h-9l-1 3h-5l-1-3H14l-1 6H7l1-6H2z'],
  ['4', 'TIDE SHOTGUN', '24', 'M1 7h30l8 1v4H31l-2 2H12l-1 4H6l1-4H1z'],
  ['5', 'HARRIER AR', 'LV 5', 'M1 6h22l2-2h6l-1 3h9v4h-8l-2 5h-5l1-5H15l-1 6H8l1-6H1z'],
  ['6', 'RPG / FLARES', 'X3', 'M1 8l16-3 14-1a3 3 0 0 1 0 6l-14-1-4 5-4 1 1-4H5z']];
const POIS = [['H', 428, -52, '#57e389'], ['G', 330, 288, '#37e0ff'], ['D', 232, -172, '#ffd23e'], ['R', 400, -355, '#ff5fa2'], ['+', 62, 202, '#fff'], ['P', -70, -20, '#7aa2ff']];

export function createHud() {
  const el = { minimap: $('minimap'), cash: $('cashVal'), stars: $('stars'), alert: $('alertBar'), hp: $('hpFill'), ar: $('arFill'), st: $('stFill'), speed: $('speedVal'), gear: $('gearVal'), nitro: $('nitroVal'), district: $('districtCard'), districtName: $('districtName'), districtSub: $('districtSub'), banner: $('missionBanner'), bannerTitle: $('mbTitle'), bannerSub: $('mbSub'), subtitle: $('subtitle'), radio: $('radioPill'), weapon: $('weaponInfo'), switchBadge: $('switchBadge'), objective: $('objText'), wheelWrap: $('wheelWrap'), mapWrap: $('mapWrap'), wantedFlash: $('wantedFlash') };
  const mm = el.minimap.getContext('2d'), root = $('hud');
  mk($('bottomLeft'), 'position:absolute;top:-17px;left:4px;z-index:2;transform:rotate(-4deg);background:rgba(10,12,26,.85);border:1px solid rgba(255,210,62,.6);border-radius:6px;padding:3px 10px;font-size:11.5px;font-weight:800;letter-spacing:1.2px;color:#ffd23e;white-space:nowrap;', 'MARINA ROW · CORAL CITY');
  const missionCard = mk(root, `position:absolute;top:50px;left:18px;width:316px;padding:10px 13px;display:none;${CARD}`);
  const crewBox = mk(root, 'position:absolute;top:196px;left:18px;width:316px;display:none;', CREW.map((c) => `<div style="display:flex;gap:9px;align-items:center;margin-top:7px;padding:6px 9px;${CARD}"><span style="background:#ffd23e;color:#14100a;font-weight:900;font-size:12.5px;border-radius:5px;padding:3px 6px;">${c.key}</span><span style="border-radius:6px;overflow:hidden;line-height:0;">${face(c.skin, c.hair, c.cloth, c.bg)}</span><span style="line-height:1.25;"><b style="font-size:13.5px;">${c.name}</b> <span style="color:#9fd8ef;font-size:11.5px;font-weight:700;">${c.role}</span><br><span style="font-size:12px;color:#cfd6e4;">${c.abil} (<b style="color:${c.ok ? '#57e389' : '#ffd23e'};">${c.st}</b>)</span></span></div>`).join(''));
  const infoCard = mk(root, `position:absolute;top:14px;right:18px;width:262px;padding:9px 13px;display:none;${CARD}`);
  const dispatch = mk(root, `position:absolute;top:118px;right:18px;width:262px;padding:9px 12px;display:none;${CARD}`,
    `<div style="font-size:12.5px;font-weight:900;letter-spacing:1.2px;color:#ff8a93;">MARISOL PATROL · 6 UNITS</div>` + UNITS.map((u) => `<div style="display:flex;align-items:center;gap:7px;margin-top:6px;font-size:12.5px;"><b style="width:58px;">${u[0]}</b><span style="color:#9fd8ef;width:40px;">${u[1]}</span><span style="margin-left:auto;background:${u[3]};color:#14100a;font-weight:800;font-size:10.5px;border-radius:4px;padding:2px 6px;">${u[2]}</span></div>`).join('') + `<div style="margin-top:8px;font-size:11.5px;color:#cfd6e4;border-top:1px solid rgba(255,255,255,.14);padding-top:6px;">+1 more unit · roadblock ahead on Marina Parade</div>`);
  const dialogue = mk(root, `position:absolute;bottom:66px;left:47%;transform:translateX(-50%);width:500px;padding:9px 13px;display:none;align-items:center;gap:10px;${CARD}`);
  const hotbar = mk(root, 'position:absolute;right:18px;bottom:16px;display:none;',
    `<div style="display:flex;gap:6px;">${GUNS.map((g, i) => `<div style="width:62px;padding:5px 4px 4px;text-align:center;border-radius:8px;${i === 2 ? 'background:rgba(255,210,62,.92);color:#14100a;border:1px solid #ffe98a;' : `${CARD}color:#fff;`}"><div style="font-size:10px;font-weight:900;opacity:.75;">${g[0]}</div><svg width="40" height="18" viewBox="0 0 40 22"><path d="${g[3]}" fill="currentColor"/></svg><div style="font-size:8.6px;font-weight:800;">${g[1]}</div><div style="font-size:10.5px;font-weight:900;">${g[2]}</div></div>`).join('')}</div><div id="gpVehicle" style="margin-top:7px;padding:8px 12px;${CARD}"><div style="font-size:13.5px;"><b>VESPER GT</b> · <b style="color:#ffd23e;">128 KM/H</b></div>${[['CONDITION', 84, '#57e389', '84%'], ['ARMOR', 58, '#37b6ff', '58'], ['HEALTH', 82, '#ff6b5e', '82']].map((b) => `<div style="display:flex;align-items:center;gap:7px;margin-top:5px;font-size:10.5px;font-weight:800;"><span style="width:66px;color:#cfd6e4;">${b[0]}</span><span style="flex:1;height:8px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden;"><span style="display:block;height:100%;width:${b[1]}%;background:${b[2]};"></span></span><span style="width:28px;text-align:right;">${b[3]}</span></div>`).join('')}</div>`);
  const reticle = mk(root, 'position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);font-size:30px;color:rgba(255,255,255,.9);text-shadow:0 1px 5px #000;display:none;', '⊕');
  const prompt = mk(root, 'position:absolute;display:none;background:rgba(10,12,26,.88);border:1.5px solid #ffd23e;border-radius:8px;padding:6px 13px;font-size:15px;font-weight:800;color:#ffd23e;');
  const garageWrap = mk(document.body, 'position:fixed;right:34px;top:calc(50% + 28px);transform:translateY(-50%);z-index:20;display:none;filter:drop-shadow(0 12px 42px rgba(0,0,0,.75));');
  const garageCanvas = document.createElement('canvas'); garageCanvas.width = 560; garageCanvas.height = 640; garageWrap.appendChild(garageCanvas);
  const chip = mk(root, `position:absolute;bottom:22px;left:50%;transform:translateX(-50%);padding:8px 16px;display:none;font-size:14px;white-space:nowrap;${CARD}`, 'VESPER GT · CONDITION <b style="color:#57e389;">68%</b> &nbsp;<b style="color:#57e389;">[✓ TUNE]</b> <span style="color:#9fd8ef;">[PLATING]</span> <span style="color:#ffd23e;">[NITRO]</span>');
  let bannerT = 0, districtT = 0, lastDistrict = '', alertOn = false;
  const hud = {
    el, mm, garageCanvas, objectiveTarget: null,
    setCash(n) { el.cash.textContent = '$' + Math.round(n).toLocaleString('en-US'); },
    setStars(n) { el.stars.textContent = '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); el.stars.classList.toggle('hot', n > 0); el.stars.style.opacity = n > 0 ? 1 : 0.35; },
    setAlert(on, text) { alertOn = on; el.alert.style.display = on ? 'block' : 'none'; if (text) el.alert.textContent = text; },
    setBars(h, a, s) { el.hp.style.width = h + '%'; el.ar.style.width = a + '%'; el.st.style.width = s + '%'; },
    setSpeed(mph, gear, nitroReady, inCar) { el.speed.textContent = inCar ? String(Math.round(mph)) : '0'; el.gear.textContent = inCar ? gear : 'ON FOOT'; el.nitro.textContent = inCar ? (nitroReady ? 'NITRO READY' : 'NITRO …') : ''; el.nitro.classList.toggle('ready', !!nitroReady); },
    setRadio(station) { el.radio.textContent = station ? `♪ ${station.name} — ${station.tag}` : '♪ RADIO OFF'; },
    setWeapon(name, ammo) { el.weapon.textContent = ammo ? `${name} · ${ammo}` : name; },
    setSwitch(activeIdx) { const other = PROTAGONISTS[1 - activeIdx]; el.switchBadge.innerHTML = `${PROTAGONISTS[activeIdx].short} <span class="dim">[TAB ⇄ ${other.short}]</span>`; },
    setObjective(target, dist, mission) { hud.objectiveTarget = target; el.objective.textContent = target ? `◈ ${mission.title} — ${Math.round(dist)}m` : ''; },
    districtCard(d) { if (!d || d.name === lastDistrict) return; lastDistrict = d.name; el.districtName.textContent = d.name; el.districtSub.textContent = `Coral City · Marisol — ${d.sub}`; el.district.style.opacity = 1; districtT = 3.4; },
    banner(title, sub, hold = 4.2) { el.bannerTitle.textContent = title; el.bannerSub.textContent = sub || ''; el.banner.style.opacity = 1; bannerT = hold; },
    subtitle(text, hold = 5) { el.subtitle.textContent = text; el.subtitle.style.opacity = text ? 1 : 0; el.subtitle.dataset.hold = hold; },
    update(dt, t) {
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) el.banner.style.opacity = 0; }
      if (districtT > 0) { districtT -= dt; if (districtT <= 0) el.district.style.opacity = 0; }
      if (alertOn) el.alert.style.opacity = (Math.floor(t * 2.4) % 2 === 0) ? 1 : 0.45;
      el.wantedFlash.style.opacity = alertOn ? 0.1 + 0.07 * Math.sin(t * 6) : 0;
    },
    // Staged showcase panels. mode: 'chase' | 'shootout' | 'garage'
    stagePanels(mode, o = {}) {
      const game = mode === 'chase' || mode === 'shootout';
      missionCard.style.display = game ? 'block' : 'none';
      crewBox.style.display = game ? 'block' : 'none';
      infoCard.style.display = game ? 'block' : 'none';
      dispatch.style.display = game ? 'block' : 'none';
      dialogue.style.display = game ? 'flex' : 'none';
      hotbar.style.display = game ? 'block' : 'none';
      garageWrap.style.display = mode === 'garage' ? 'block' : 'none';
      chip.style.display = mode === 'garage' ? 'block' : 'none';
      chip.style.left = mode === 'garage' ? '33%' : '50%';
      reticle.style.display = mode === 'shootout' ? 'block' : 'none';
      if (!game) { prompt.style.display = 'none'; return; }
      $('topRight').style.display = 'none'; $('bottomRight').style.display = 'none'; $('telePill').style.display = 'none';
      const m = o.mission || { job: '[JOB 3/8]', title: 'SALT & SIRENS · Uncle Mateo', timer: '0:42', stage: 3, stages: 4, stageLabel: 'STAGE 3/4', obj: 'Outrun the Precinct blockade & reach Dockside Customs', next: '[NEXT] Clear the 4-star heat or swap plates with Pilar' };
      missionCard.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:12px;font-weight:800;color:#9fd8ef;"><span style="color:#ffd23e;">${m.job}</span> ${m.title}</span><span style="background:#ff4757;color:#fff;font-weight:900;font-size:12.5px;border-radius:11px;padding:2px 9px;">${m.timer}</span></div><div style="display:flex;align-items:center;gap:5px;margin-top:8px;"><span style="font-size:10.5px;font-weight:900;color:#ffd23e;">${m.stageLabel}</span>${Array.from({ length: m.stages }, (_, i) => `<span style="flex:1;height:7px;border-radius:3px;background:${i < m.stage ? (i % 2 ? '#ff7a59' : '#ffd23e') : 'rgba(255,255,255,.16)'};"></span>`).join('')}</div><div style="font-size:15.5px;font-weight:800;line-height:1.3;margin-top:8px;">${m.obj}</div><div style="font-size:12px;color:#cfd6e4;margin-top:5px;">${m.next}</div>`;
      crewBox.style.top = (m.stages > 3 ? 196 : 188) + 'px';
      infoCard.innerHTML = `<div style="font-size:14.5px;font-weight:800;">18:45 · <span style="color:#57e389;">$18,450</span> · <span style="color:#ffd23e;">★★★★☆</span></div><div style="margin-top:6px;font-size:12px;"><span style="background:#ff4757;color:#fff;font-weight:900;border-radius:4px;padding:2px 7px;">IN SIGHT</span><span style="color:#cfd6e4;"> RESPECT LV 4 · FIXER (1,680 / 2,000 RP)</span></div><div style="height:6px;background:rgba(255,255,255,.15);border-radius:3px;margin-top:6px;overflow:hidden;"><div style="height:100%;width:84%;background:#ffd23e;"></div></div>`;
      const d = o.dialogue;
      dialogue.innerHTML = `<span style="border-radius:8px;overflow:hidden;line-height:0;flex:none;border:2px solid rgba(255,210,62,.7);">${face(d.skin, d.hair, d.cloth, d.bg)}</span><span style="line-height:1.3;"><b style="font-size:13.5px;">${d.name}</b> <span style="color:#ffd23e;font-size:10.5px;font-weight:800;">${d.role}</span><br><span style="font-size:13.5px;">“${d.text}”</span></span>`;
      hotbar.querySelector('#gpVehicle').style.display = mode === 'chase' ? 'block' : 'none';
      if (o.prompt) { prompt.textContent = o.prompt[0]; prompt.style.left = o.prompt[1]; prompt.style.top = o.prompt[2]; prompt.style.display = 'block'; }
    },
  };
  return hud;
}

// Bright coastal GPS radar: player centred facing up, 260-unit range.
export function renderLiveRadarMinimap(ctx, player, roads, cops, objective) {
  const S = 200, C = S / 2, k = C / 260;
  const cos = Math.cos(player.heading), sin = Math.sin(player.heading);
  const toMap = (wx, wz) => { const dx = wx - player.pos.x, dz = wz - player.pos.z; return [C + (dx * cos - dz * sin) * k, C - (dx * sin + dz * cos) * k]; };
  const poly = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  ctx.clearRect(0, 0, S, S);
  ctx.save(); ctx.beginPath(); ctx.arc(C, C, C - 2, 0, 7); ctx.clip();
  ctx.fillStyle = '#1b6f8f'; ctx.fillRect(0, 0, S, S);
  for (const d of DISTRICTS) poly([[d.x0, d.z0], [d.x1, d.z0], [d.x1, d.z1], [d.x0, d.z1]].map(([x, z]) => toMap(x, z)), d.map);
  poly([[424, -600], [470, -600], [470, 600], [424, 600]].map(([x, z]) => toMap(x, z)), '#d9b878');
  ctx.strokeStyle = 'rgba(240,246,250,0.85)'; ctx.lineWidth = 3;
  for (const z of roads.avenues) { const [ax, ay] = toMap(-560, z), [bx, by] = toMap(1130, z); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  ctx.lineWidth = 2.4;
  for (const x of roads.streets) { const [ax, ay] = toMap(x, -560), [bx, by] = toMap(x, 560); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  if (objective) {
    const [ox, oy] = toMap(objective.x, objective.z);
    ctx.strokeStyle = '#c04df0'; ctx.lineWidth = 4.5; ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(C, C); ctx.lineTo(ox, oy); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(C, C); ctx.lineTo(ox, oy); ctx.stroke();
    ctx.fillStyle = '#ffd23e'; ctx.beginPath(); ctx.arc(ox, oy, 5.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.font = '900 9.5px Arial'; ctx.textAlign = 'center';
  for (const p of POIS) {
    const [px, py] = toMap(p[1], p[2]);
    if (px < 8 || py < 8 || px > S - 8 || py > S - 8) continue;
    ctx.fillStyle = 'rgba(8,10,20,0.88)'; ctx.beginPath(); ctx.arc(px, py, 8, 0, 7); ctx.fill();
    ctx.strokeStyle = p[3]; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(p[0], px, py + 3.5);
  }
  const flash = Math.floor(performance.now() / 220) % 2 === 0;
  for (const cop of cops) {
    const [cx, cy] = toMap(cop.mesh.position.x, cop.mesh.position.z);
    if (cx < -6 || cy < -6 || cx > S + 6 || cy > S + 6) continue;
    ctx.fillStyle = flash ? '#ff2438' : '#2f6bff'; ctx.beginPath(); ctx.arc(cx, cy, 4.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 1.7, 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#10131c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(C, C - 9); ctx.lineTo(C - 6, C + 7); ctx.lineTo(C, C + 3); ctx.lineTo(C + 6, C + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(C, C, C - 2, 0, 7); ctx.stroke();
}

function cv(ctx) {
  return {
    t(s, x, y, f = '14px Arial', c = '#fff', a = 'left') { ctx.font = f; ctx.fillStyle = c; ctx.textAlign = a; ctx.fillText(s, x, y); },
    r(x, y, w, h, c, rad = 8) { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); ctx.fill(); },
    bar(x, y, w, pct, c) { this.r(x, y, w, 9, 'rgba(255,255,255,0.15)', 4); this.r(x, y, Math.max(4, w * pct / 100), 9, c, 4); },
  };
}

// 8-slot radial weapon wheel + radio ring + Taller Neon card (live Q overlay).
export function renderWeaponAndRadioWheel(ctx, state) {
  const W = ctx.canvas.width, g = cv(ctx);
  ctx.clearRect(0, 0, W, ctx.canvas.height);
  g.r(0, 0, W, ctx.canvas.height, 'rgba(8,10,20,0.88)', 0);
  const cx = W / 2, cy = 218, R = 168;
  g.t('WEAPON / RADIO WHEEL', cx, 34, 'bold 21px Arial', '#ffd23e', 'center');
  for (let i = 0; i < 8; i++) {
    const a0 = i * Math.PI / 4 - Math.PI / 2, a1 = a0 + Math.PI / 4, sel = WEAPONS[i] === state.weapon, am = a0 + Math.PI / 8;
    ctx.beginPath(); ctx.arc(cx, cy, R, a0 + 0.03, a1 - 0.03); ctx.arc(cx, cy, R * 0.52, a1 - 0.03, a0 + 0.03, true); ctx.closePath();
    ctx.fillStyle = sel ? 'rgba(255,46,136,0.85)' : 'rgba(38,44,66,0.92)'; ctx.fill();
    ctx.strokeStyle = sel ? '#ffd23e' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke();
    g.t(WEAPONS[i], cx + Math.cos(am) * R * 0.76, cy + Math.sin(am) * R * 0.76 + 5, 'bold 14px Arial', '#fff', 'center');
  }
  g.t(state.weapon, cx, cy - 4, 'bold 17px Arial', '#fff', 'center');
  g.t(state.ammo || '', cx, cy + 16, '13px Arial', '#9fd8ef', 'center');
  RADIO_STATIONS.forEach((st, i) => {
    const w = (W - 52) / 3 - 10, x = 26 + i * ((W - 52) / 3), sel = state.radio && state.radio.id === st.id;
    g.r(x, 428, w, 40, sel ? '#37e0ff' : 'rgba(38,44,66,0.92)', 9);
    g.t(`♪ ${st.name}`, x + w / 2, 453, 'bold 14px Arial', sel ? '#06222e' : '#fff', 'center');
  });
  g.t('Q — SELECT WEAPON · R — RADIO · TALLER NEON TUNES WHAT YOU BRING IN', cx, 540, '13px Arial', '#8b93a5', 'center');
}

// Full district map + heist checklist + duo stat bars (live M overlay).
export function renderFullMapOverlay(ctx, state) {
  const W = ctx.canvas.width, g = cv(ctx);
  ctx.clearRect(0, 0, W, ctx.canvas.height);
  g.r(0, 0, W, ctx.canvas.height, 'rgba(8,10,20,0.88)', 0);
  g.t('STATE OF MARISOL — CORAL CITY', W / 2, 34, 'bold 21px Arial', '#ffd23e', 'center');
  const mx = 26, my = 52, mw = W - 52, mh = 252;
  const sx = (x) => mx + ((x + 600) / 1800) * mw, sz = (z) => my + ((z + 620) / 1240) * mh;
  g.r(mx, my, mw, mh, '#0d3d5c', 0);
  for (const d of DISTRICTS) { ctx.fillStyle = d.map; ctx.fillRect(sx(d.x0), sz(d.z0), sx(d.x1) - sx(d.x0), sz(d.z1) - sz(d.z0)); g.t(d.name.toUpperCase(), (sx(d.x0) + sx(d.x1)) / 2, (sz(d.z0) + sz(d.z1)) / 2 + 4, 'bold 13px Arial', '#fff', 'center'); }
  ctx.strokeStyle = 'rgba(230,236,244,0.6)'; ctx.lineWidth = 2;
  for (const z of AVENUES) { ctx.beginPath(); ctx.moveTo(sx(-560), sz(z)); ctx.lineTo(sx(1130), sz(z)); ctx.stroke(); }
  for (const x of STREETS) { ctx.beginPath(); ctx.moveTo(sx(x), sz(-560)); ctx.lineTo(sx(x), sz(560)); ctx.stroke(); }
  if (state.objective) { ctx.fillStyle = '#ffd23e'; ctx.beginPath(); ctx.arc(sx(state.objective.x), sz(state.objective.z), 6, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx(state.playerPos.x), sz(state.playerPos.z), 5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2; ctx.stroke();
  let y = my + mh + 34;
  g.t('HEIST CHECKLIST', 30, y, 'bold 16px Arial', '#ffd23e'); y += 8;
  MISSIONS.forEach((m, i) => { y += 21; const done = i < state.missionIndex, cur = i === state.missionIndex; g.t(`${done ? '☑' : cur ? '▣' : '☐'} ${m.title} — $${[400, 1200, 2500, 25000, 250000][i].toLocaleString('en-US')}`, 30, y, '14.5px Arial', done ? '#57e389' : cur ? '#fff' : '#7d8698'); });
  y += 32; g.t('THE DUO', 30, y, 'bold 16px Arial', '#ffd23e');
  PROTAGONISTS.forEach((p, pi) => {
    y += 24;
    g.t(`${p.name} — ${p.role}`, 30, y, 'bold 14.5px Arial', pi === state.protoIdx ? '#ff5fa2' : '#9fd8ef');
    Object.entries(p.stats).forEach(([k2, v], si) => {
      const bx = 30 + si * ((W - 60) / 4), bw = (W - 60) / 4 - 14;
      g.t(k2.toUpperCase(), bx, y + 16, '11px Arial', '#8b93a5'); g.t(String(v), bx + bw - 16, y + 16, 'bold 11px Arial', '#fff');
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(bx, y + 21, bw, 7);
      ctx.fillStyle = pi === state.protoIdx ? '#ff2e88' : '#37e0ff'; ctx.fillRect(bx, y + 21, bw * v / 100, 7);
    });
    y += 34;
  });
}

// Dockside Customs panel: tabs, labeled 5x5 street/district grid map with POI key,
// workshop shop table, completion checklist, career metrics and save slots.
export function renderGaragePanel(ctx) {
  const W = ctx.canvas.width, H = ctx.canvas.height, g = cv(ctx);
  ctx.clearRect(0, 0, W, H); g.r(0, 0, W, H, 'rgba(8,10,20,0.92)', 0);
  ['MAP', 'WORKSHOP', 'STATS', 'CREW', 'SAVE SLOTS'].forEach((t2, i) => { const x = 18 + i * 106; g.t(t2, x, 30, 'bold 12.5px Arial', i === 0 ? '#ffd23e' : '#8b93a5'); if (!i) { ctx.fillStyle = '#ffd23e'; ctx.fillRect(x, 38, 34, 3); } });
  const mx = 18, my = 52, mw = W - 36, mh = 196;
  const gx = (i) => mx + (i / 5) * mw, gz = (j) => my + (j / 5) * mh;
  g.r(mx, my, mw, mh, '#175d7d', 6);
  ctx.fillStyle = '#d9b878'; ctx.fillRect(gx(4) + (gx(5) - gx(4)) * 0.74, my + 1, (gx(5) - gx(4)) * 0.12, mh - 2); // sand under the zone labels
  for (const [i, j, w, h, c, name, rep] of [[0, 0, 2, 3, '#274435', 'LAS CIÉNAGAS', 'WARY 31'], [2, 0, 2, 3, '#3a3f52', 'DOWNTOWN', 'FRIENDLY 64'], [0, 3, 2, 2, '#54443a', 'PORT AZAHAR', 'NEUTRAL 52'], [2, 3, 2, 2, '#54443a', '', ''], [4, 0, 1, 5, '#2e6f79', 'CORAL BEACH', 'FRIENDLY 78']]) {
    ctx.fillStyle = c; ctx.fillRect(gx(i) + 1, gz(j) + 1, gx(i + w) - gx(i) - 2, gz(j + h) - gz(j) - 2);
    if (name) { g.t(name, gx(i) + 8, gz(j) + 20, 'bold 11.5px Arial', '#fff'); g.t(rep, gx(i) + 8, gz(j) + 36, '10px Arial', '#ffd23e'); }
  }
  ctx.strokeStyle = 'rgba(240,246,250,0.75)'; ctx.lineWidth = 2;
  for (let i = 0; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(gx(i), my); ctx.lineTo(gx(i), my + mh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(mx, gz(i)); ctx.lineTo(mx + mw, gz(i)); ctx.stroke(); }
  ['MARINA ROW', 'PALM AVE', 'NEON STRIP', 'HARBOR WAY', 'BAYOU RD'].forEach((s, j) => g.t(s, mx + 4, gz(j) + 11, '8.5px Arial', 'rgba(255,255,255,0.75)'));
  ['1ST ST', 'OCEAN DR', '5TH AVE', 'DOCKSIDE', 'ISLE RD'].forEach((s, i) => { ctx.save(); ctx.translate(gx(i) + 10, my + mh - 4); ctx.rotate(-Math.PI / 2); g.t(s, 0, 0, '8.5px Arial', 'rgba(255,255,255,0.75)'); ctx.restore(); });
  ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(gx(4) + 66, gz(2)); ctx.lineTo(gx(5), gz(2)); ctx.stroke();
  ctx.fillStyle = '#38624a'; ctx.fillRect(gx(5) - 52, gz(1) + 4, 48, gz(3) - gz(1) - 8);
  g.t('ISLA VERDE', gx(5) - 28, gz(2) + 4, 'bold 9.5px Arial', '#fff', 'center');
  g.t('FRIENDLY 71', gx(5) - 28, gz(2) + 17, '8.5px Arial', '#ffd23e', 'center');
  const poi = (i, j, L, c) => { const X = gx(i) + (gx(1) - gx(0)) / 2, Y = gz(j) + (gz(1) - gz(0)) / 2; ctx.fillStyle = 'rgba(8,10,20,0.9)'; ctx.beginPath(); ctx.arc(X, Y, 10, 0, 7); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke(); g.t(L, X, Y + 4, '900 11px Arial', '#fff', 'center'); };
  poi(4, 1, 'H', '#57e389'); poi(3, 3, 'G', '#37e0ff'); poi(2, 1, 'D', '#ffd23e'); poi(4, 3, 'R', '#ff5fa2'); poi(1, 2, '+', '#fff'); poi(3, 0, 'P', '#7aa2ff');
  let y = my + mh + 20;
  g.t('(H) SAFEHOUSE   (G) GARAGE   (D) JOBS   (R) STREET RACE   (+) CLINIC   (P) PRECINCT', W / 2, y, '10.5px Arial', '#cfd6e4', 'center');
  y += 16; g.t('WORKSHOP — DOCKSIDE CUSTOMS', 18, y + 12, 'bold 14px Arial', '#37e0ff');
  [['FULL REPAIR', '$250', '#fff'], ['RESPRAY', '$400', '#fff'], ['STAGE 2 TUNE', '✓ OWNED', '#57e389'], ['ARMOUR PLATING', '$3,600', '#fff'], ['NITRO KIT', 'LOCKED · LV 6', '#ff9f43']].forEach((r2, i) => {
    const ry = y + 22 + i * 21;
    g.r(18, ry, W - 36, 18, i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)', 4);
    g.t(r2[0], 26, ry + 13.5, '12px Arial', '#e8ecf4'); g.t(r2[1], W - 26, ry + 13.5, 'bold 12px Arial', r2[2], 'right');
  });
  y += 140;
  g.t('74.5% COMPLETE', 18, y, 'bold 15px Arial', '#ffd23e'); g.bar(150, y - 11, W - 168, 74.5, '#ffd23e');
  [['Story missions', '6/8'], ['Street races', '3/4'], ['Stunt jumps', '6/8'], ['Golden Conches', '14/20'], ['Crew recruited', '3/3']].forEach((c2, i) => {
    const cx2 = 18 + (i % 2) * 268, cy2 = y + 22 + Math.floor(i / 2) * 19;
    g.t(`☑ ${c2[0]}`, cx2, cy2, '12.5px Arial', '#e8ecf4'); g.t(c2[1], cx2 + 168, cy2, 'bold 12.5px Arial', '#57e389');
  });
  y += 84; g.t('CARS STOLEN 28 · STARS LOST 34 · BEST LAP 0:46.2 · DRIVEN 52.4 KM', W / 2, y, 'bold 12px Arial', '#9fd8ef', 'center');
  y += 14;
  [['SLOT 1', '74.5% · Act III · Saved 18:45', 1], ['SLOT 2', '31.0% · Act I · Saved 09:12', 0], ['SLOT 3', 'EMPTY', 0]].forEach((s, i) => {
    const sx2 = 18 + i * 178, w2 = 168;
    g.r(sx2, y, w2, 52, s[2] ? 'rgba(255,210,62,0.14)' : 'rgba(255,255,255,0.05)', 8);
    ctx.strokeStyle = s[2] ? '#ffd23e' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(sx2, y, w2, 52, 8); ctx.stroke();
    g.t(s[0], sx2 + 10, y + 20, 'bold 12px Arial', s[2] ? '#ffd23e' : '#cfd6e4');
    g.t(s[1], sx2 + 10, y + 37, '10.5px Arial', '#cfd6e4');
    if (s[2]) g.t('[ SAVE ]', sx2 + w2 - 10, y + 20, 'bold 11px Arial', '#57e389', 'right');
  });
}

// Title-screen menu + save cards, appended into #titleScreen (live title too).
export function renderTitleScreen() {
  const ts = $('titleScreen'); if (!ts || $('titleMenu')) return;
  const pe = ts.querySelector('.pressEnter'); if (pe) pe.style.display = 'none';
  const th = ts.querySelector('.titleHelp'); if (th) th.style.display = 'none';
  const menu = mk(ts, 'margin-top:26px;display:flex;flex-direction:column;gap:7px;align-items:center;', ['CONTINUE', 'NEW GAME', 'LOAD', 'SETTINGS'].map((s, i) => `<div style="width:250px;padding:8px 0;font-size:16.5px;font-weight:800;letter-spacing:2.5px;border-radius:8px;${i === 0 ? 'background:rgba(255,210,62,.92);color:#14100a;' : `${CARD}color:#fff;`}">${s}</div>`).join(''));
  menu.id = 'titleMenu';
  const saves = mk(ts, 'margin-top:20px;display:flex;gap:10px;', [['SLOT 1', '74.5% · Act III', '18:45', 1], ['SLOT 2', '31.0% · Act I', '09:12', 0], ['SLOT 3', 'EMPTY', '', 0]].map((s) => `<div style="width:172px;padding:9px 12px;text-align:left;${CARD}${s[3] ? 'border-color:rgba(255,210,62,.75);' : ''}"><div style="font-size:12px;font-weight:900;color:${s[3] ? '#ffd23e' : '#cfd6e4'};">${s[0]}</div><div style="font-size:12.5px;margin-top:3px;">${s[1]}</div><div style="font-size:11px;color:#8b93a5;">${s[2] ? 'Saved ' + s[2] : '—'}</div></div>`).join(''));
  saves.id = 'titleSaves';
  mk(ts, 'margin-top:18px;font-size:11.5px;color:rgba(230,236,244,.55);letter-spacing:1px;', 'CORAL CITY HEAT · v1.3 GOLDEN HOUR · AN ORIGINAL GAME · MARISOL SHERIFF DEPT. ADVISORY: THEY ARE, IN FACT, COMING');
}

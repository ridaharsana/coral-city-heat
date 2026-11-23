// HUD: DOM panels (cash, wanted stars, bars, speedo, district card, mission banner, radio
// pill, weapon readout, wanted alert), the rotating live radar minimap, the 8-slot weapon /
// radio wheel, and the full-map systems overlay (district map + heist checklist + duo stat
// bars + Taller Neon tuning card) used by the M key and the systems screenshot.
import { DISTRICTS, RADIO_STATIONS, WEAPONS } from './config.js';
import { AVENUES, STREETS } from './world.js';
import { MISSIONS } from './missions.js';
import { PROTAGONISTS } from './people.js';

const $ = (id) => document.getElementById(id);

export function createHud() {
  const el = {
    minimap: $('minimap'), cash: $('cashVal'), stars: $('stars'), alert: $('alertBar'),
    hp: $('hpFill'), ar: $('arFill'), st: $('stFill'), speed: $('speedVal'), gear: $('gearVal'),
    nitro: $('nitroVal'), district: $('districtCard'), districtName: $('districtName'),
    districtSub: $('districtSub'), banner: $('missionBanner'), bannerTitle: $('mbTitle'),
    bannerSub: $('mbSub'), subtitle: $('subtitle'), radio: $('radioPill'), weapon: $('weaponInfo'),
    switchBadge: $('switchBadge'), objective: $('objText'), wheelWrap: $('wheelWrap'),
    mapWrap: $('mapWrap'), wantedFlash: $('wantedFlash'),
  };
  const mm = el.minimap.getContext('2d');
  let bannerT = 0, districtT = 0, lastDistrict = '', alertOn = false;
  const hud = {
    el, mm,
    objectiveTarget: null,
    setCash(n) { el.cash.textContent = '$' + Math.round(n).toLocaleString('en-US'); },
    setStars(n) {
      el.stars.textContent = '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
      el.stars.classList.toggle('hot', n > 0);
      el.stars.style.opacity = n > 0 ? 1 : 0.35;
    },
    setAlert(on, text) {
      alertOn = on;
      el.alert.style.display = on ? 'block' : 'none';
      if (text) el.alert.textContent = text;
    },
    setBars(h, a, s) { el.hp.style.width = h + '%'; el.ar.style.width = a + '%'; el.st.style.width = s + '%'; },
    setSpeed(mph, gear, nitroReady, inCar) {
      el.speed.textContent = inCar ? String(Math.round(mph)) : '0';
      el.gear.textContent = inCar ? gear : 'ON FOOT';
      el.nitro.textContent = inCar ? (nitroReady ? 'NITRO READY' : 'NITRO …') : '';
      el.nitro.classList.toggle('ready', !!nitroReady);
    },
    setRadio(station) { el.radio.textContent = station ? `♪ ${station.name} — ${station.tag}` : '♪ RADIO OFF'; },
    setWeapon(name, ammo) { el.weapon.textContent = ammo ? `${name} · ${ammo}` : name; },
    setSwitch(activeIdx) {
      const other = PROTAGONISTS[1 - activeIdx];
      el.switchBadge.innerHTML = `${PROTAGONISTS[activeIdx].short} <span class="dim">[TAB ⇄ ${other.short}]</span>`;
    },
    setObjective(target, dist, mission) {
      hud.objectiveTarget = target;
      el.objective.textContent = target ? `◈ ${mission.title} — ${Math.round(dist)}m` : '';
    },
    districtCard(d) {
      if (!d || d.name === lastDistrict) return;
      lastDistrict = d.name;
      el.districtName.textContent = d.name;
      el.districtSub.textContent = `Coral City · Marisol — ${d.sub}`;
      el.district.style.opacity = 1; districtT = 3.4;
    },
    banner(title, sub, hold = 4.2) {
      el.bannerTitle.textContent = title; el.bannerSub.textContent = sub || '';
      el.banner.style.opacity = 1; bannerT = hold;
    },
    subtitle(text, hold = 5) { el.subtitle.textContent = text; el.subtitle.style.opacity = text ? 1 : 0; if (text) bannerT = Math.max(bannerT, 0); el.subtitle.dataset.hold = hold; },
    update(dt, t) {
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) el.banner.style.opacity = 0; }
      if (districtT > 0) { districtT -= dt; if (districtT <= 0) el.district.style.opacity = 0; }
      if (alertOn) el.alert.style.opacity = (Math.floor(t * 2.4) % 2 === 0) ? 1 : 0.45;
      el.wantedFlash.style.opacity = alertOn ? 0.1 + 0.07 * Math.sin(t * 6) : 0;
    },
  };
  return hud;
}

// Rotating radar: player at centre facing up, 260-unit range.
export function renderLiveRadarMinimap(ctx, player, roads, cops, objective) {
  const S = 200, C = S / 2, RANGE = 260, k = C / RANGE;
  const heading = player.heading;
  const cos = Math.cos(heading), sin = Math.sin(heading);
  const toMap = (wx, wz) => {
    const dx = wx - player.pos.x, dz = wz - player.pos.z;
    return [C + (dx * cos - dz * sin) * k, C - (dx * sin + dz * cos) * k];
  };
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(C, C, C - 2, 0, 7); ctx.clip();
  ctx.fillStyle = '#101823'; ctx.fillRect(0, 0, S, S);
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.map;
    const pts = [[d.x0, d.z0], [d.x1, d.z0], [d.x1, d.z1], [d.x0, d.z1]].map(([x, z]) => toMap(x, z));
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#0d3d5c'; // water east
  const wpts = [[470, -600], [1150, -600], [1150, 600], [470, 600]].map(([x, z]) => toMap(x, z));
  ctx.beginPath(); wpts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(220,228,240,0.55)'; ctx.lineWidth = 3;
  for (const z of roads.avenues) { const [ax, ay] = toMap(-560, z), [bx, by] = toMap(1130, z); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  for (const x of roads.streets) { const [ax, ay] = toMap(x, -560), [bx, by] = toMap(x, 560); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
  if (objective) { // gold route line + marker
    const [ox, oy] = toMap(objective.x, objective.z);
    ctx.strokeStyle = '#c04df0'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(C, C); ctx.lineTo(ox, oy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffd23e'; ctx.beginPath(); ctx.arc(ox, oy, 5.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  const flash = Math.floor(performance.now() / 220) % 2 === 0;
  for (const cop of cops) {
    const [cx, cy] = toMap(cop.mesh.position.x, cop.mesh.position.z);
    if (cx < -6 || cy < -6 || cx > S + 6 || cy > S + 6) continue;
    ctx.fillStyle = flash ? '#ff2438' : '#2f6bff';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
  }
  ctx.restore();
  // player arrow
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#10131c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(C, C - 9); ctx.lineTo(C - 6, C + 7); ctx.lineTo(C, C + 3); ctx.lineTo(C + 6, C + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(C, C, C - 2, 0, 7); ctx.stroke();
}

// 8-slot radial weapon wheel + radio ring + Taller Neon tuning card (right systems panel).
export function renderWeaponAndRadioWheel(ctx, state) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,10,20,0.88)'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = 218, R = 168;
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 21px Arial'; ctx.textAlign = 'center';
  ctx.fillText('WEAPON / RADIO WHEEL', cx, 34);
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
    const sel = WEAPONS[i] === state.weapon;
    ctx.beginPath(); ctx.arc(cx, cy, R, a0 + 0.03, a1 - 0.03); ctx.arc(cx, cy, R * 0.52, a1 - 0.03, a0 + 0.03, true); ctx.closePath();
    ctx.fillStyle = sel ? 'rgba(255,46,136,0.85)' : 'rgba(38,44,66,0.92)'; ctx.fill();
    ctx.strokeStyle = sel ? '#ffd23e' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke();
    const am = (a0 + a1) / 2, tx = cx + Math.cos(am) * R * 0.76, ty = cy + Math.sin(am) * R * 0.76;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial';
    ctx.fillText(WEAPONS[i], tx, ty + 5);
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Arial'; ctx.fillText(state.weapon, cx, cy - 4);
  ctx.fillStyle = '#9fd8ef'; ctx.font = '13px Arial'; ctx.fillText(state.ammo || '', cx, cy + 16);
  // radio pills
  RADIO_STATIONS.forEach((st, i) => {
    const x = 26 + i * ((W - 52) / 3), w = (W - 52) / 3 - 10, y = 428;
    const sel = state.radio && state.radio.id === st.id;
    ctx.fillStyle = sel ? '#37e0ff' : 'rgba(38,44,66,0.92)';
    ctx.beginPath(); ctx.roundRect(x, y, w, 40, 9); ctx.fill();
    ctx.fillStyle = sel ? '#06222e' : '#fff'; ctx.font = 'bold 14px Arial';
    ctx.fillText(`♪ ${st.name}`, x + w / 2, y + 25);
  });
  // Taller Neon tuning card
  const y = 492;
  ctx.fillStyle = 'rgba(14,26,34,0.95)'; ctx.beginPath(); ctx.roundRect(26, y, W - 52, 128, 10); ctx.fill();
  ctx.strokeStyle = '#37e0ff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#37e0ff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'left';
  ctx.fillText('TALLER NEON — VESPER GT TUNING', 44, y + 28);
  ctx.fillStyle = '#e8ecf4'; ctx.font = '14.5px Arial';
  const rows = ['Engine: Stage 4 · Twin Turbo', 'Neon Underglow: Coral Pink', 'Armor: 100% · Run-Flats', 'Respray: Clear 4-Star Heat — $600'];
  rows.forEach((r, i) => ctx.fillText('▸ ' + r, 44, y + 56 + i * 19));
  ctx.textAlign = 'center';
}

// Full district map + heist checklist + protagonist stat bars (left systems panel).
export function renderFullMapOverlay(ctx, state) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,10,20,0.88)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 21px Arial'; ctx.textAlign = 'center';
  ctx.fillText('STATE OF MARISOL — CORAL CITY', W / 2, 34);
  const mx = 26, my = 52, mw = W - 52, mh = 252;
  const sx = (x) => mx + ((x + 600) / 1800) * mw, sz = (z) => my + ((z + 620) / 1240) * mh;
  ctx.fillStyle = '#0d3d5c'; ctx.fillRect(mx, my, mw, mh);
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.map; ctx.fillRect(sx(d.x0), sz(d.z0), sx(d.x1) - sx(d.x0), sz(d.z1) - sz(d.z0));
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
    ctx.fillText(d.name.toUpperCase(), (sx(d.x0) + sx(d.x1)) / 2, (sz(d.z0) + sz(d.z1)) / 2 + 4);
  }
  ctx.strokeStyle = 'rgba(230,236,244,0.6)'; ctx.lineWidth = 2;
  for (const z of AVENUES) { ctx.beginPath(); ctx.moveTo(sx(-560), sz(z)); ctx.lineTo(sx(1130), sz(z)); ctx.stroke(); }
  for (const x of STREETS) { ctx.beginPath(); ctx.moveTo(sx(x), sz(-560)); ctx.lineTo(sx(x), sz(560)); ctx.stroke(); }
  if (state.objective) {
    ctx.fillStyle = '#ffd23e'; ctx.beginPath(); ctx.arc(sx(state.objective.x), sz(state.objective.z), 6, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx(state.playerPos.x), sz(state.playerPos.z), 5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2; ctx.stroke();
  // heist checklist
  let y = my + mh + 34;
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 16px Arial';
  ctx.fillText('HEIST CHECKLIST', 30, y); y += 8;
  MISSIONS.forEach((m, i) => {
    y += 21;
    const done = i < state.missionIndex, cur = i === state.missionIndex;
    ctx.fillStyle = done ? '#57e389' : cur ? '#ffffff' : '#7d8698';
    ctx.font = '14.5px Arial';
    ctx.fillText(`${done ? '☑' : cur ? '▣' : '☐'} ${m.title} — $${( [400, 1200, 2500, 25000, 250000][i] ).toLocaleString('en-US')}`, 30, y);
  });
  // protagonist stat bars
  y += 32;
  ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 16px Arial'; ctx.fillText('THE DUO', 30, y);
  PROTAGONISTS.forEach((p, pi) => {
    y += 24;
    ctx.fillStyle = pi === state.protoIdx ? '#ff5fa2' : '#9fd8ef'; ctx.font = 'bold 14.5px Arial';
    ctx.fillText(`${p.name} — ${p.role}`, 30, y);
    Object.entries(p.stats).forEach(([k, v], si) => {
      const bx = 30 + si * ((W - 60) / 4), bw = (W - 60) / 4 - 14;
      ctx.fillStyle = '#8b93a5'; ctx.font = '11px Arial'; ctx.fillText(k.toUpperCase(), bx, y + 16);
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(bx, y + 21, bw, 7);
      ctx.fillStyle = pi === state.protoIdx ? '#ff2e88' : '#37e0ff'; ctx.fillRect(bx, y + 21, bw * v / 100, 7);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.fillText(String(v), bx + bw - 16, y + 16);
    });
    y += 34;
  });
  ctx.textAlign = 'center';
}

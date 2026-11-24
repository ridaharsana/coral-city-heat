// CORAL CITY HEAT — missions.js: the five-mission story chain (reach, deliver-car, escape-wanted, collect-cash, reach-with-cargo).
import { TUNING } from './config.js';
export const MISSIONS = [
 {id:'first-wheels',title:'FIRST WHEELS IN CORAL CITY',type:'reach',
  sub:'Meet Dario at the Coral Beach avenue and take the Vesper GT.',
  target:{x:372,z:-118},needCar:'vesper'},
 {id:'port-run',title:'PORT AZAHAR RUN',type:'deliver-car',
  sub:'Drive the Vesper to the Port Azahar warehouse row before the buyer cools off.',
  target:{x:62,z:452}},
 {id:'heat-check',title:'HEAT CHECK',type:'escape-wanted',
  sub:'The sheriff is watching the port. Draw 2 stars, then lose them in Las Ciénagas.',
  target:{x:-420,z:60},crimeAt:{x:62,z:452}},
 {id:'bank-job',title:'THE NATIONAL BANK JOB',type:'collect-cash',
  sub:'Hit Coral City National Bank, grab the bag ($250,000) and reach Taller Neon to clear your heat.',
  target:{x:232,z:-195},dropoff:{x:330,z:296}},
 {id:'final-score',title:'FINAL SCORE AT ISLA VERDE',type:'reach-with-cargo',
  sub:'Take the bridge to Isla Verde with the cargo aboard. Do not stop for the sheriff.',
  target:{x:930,z:-60}},
];
export function createMissionState(saved) {
 return {
  index: Math.min(saved?.missionIndex ?? 0, MISSIONS.length),
  phase: 'go',
  cargo: false, paid: false, startedAt: 0,
 };
}
export function missionTarget(state) {
 const m = MISSIONS[state.index];
 if (!m) return null;
 if (m.type === 'collect-cash' && state.phase === 'escape') return m.dropoff;
 if (m.type === 'escape-wanted' && state.phase === 'crime') return m.target;
 return m.target;
}
export function updateActiveMissionState(state, player, hud, dt) {
 const m = MISSIONS[state.index];
 if (!m) return null;
 const target = missionTarget(state);
 const dx = player.pos.x - target.x, dz = player.pos.z - target.z;
 const dist = Math.hypot(dx, dz);
 hud.setObjective(target, dist, m);
 if (state.phase === 'go') {
  if (m.type === 'reach' && dist < 14 && (!m.needCar || (player.inCar && player.carType === m.needCar) || dist < 6)) return finish(state, hud, m);
  if (m.type === 'deliver-car' && dist < 16 && player.inCar) return finish(state, hud, m);
  if (m.type === 'reach-with-cargo' && dist < 18 && state.cargo) return finish(state, hud, m);
  if (m.type === 'escape-wanted' && dist < 40) {
   state.phase = 'crime';
   hud.banner(m.title, 'Make some noise — then vanish into the bayou.');
   player.events.push('missionCrime');
   return null;
  }
  if (m.type === 'collect-cash' && dist < 13 && !player.inCar) {
   state.phase = 'escape'; state.cargo = true;
   hud.banner('BAG SECURED — $250,000', 'Reach Taller Neon in Port Azahar to clear your heat.');
   player.events.push('missionCrime');
   return null;
  }
 }
 if (state.phase === 'crime' && m.type === 'escape-wanted') {
  if (player.stars >= 2) state.phase = 'escape';
 }
 if (state.phase === 'escape') {
  if (m.type === 'escape-wanted' && player.stars === 0 && dist < 60) return finish(state, hud, m);
  if (m.type === 'collect-cash' && dist < 16) return finish(state, hud, m);
 }
 return null;
}
function finish(state, hud, m) {
 const payout = TUNING.payouts[state.index] || 500;
 hud.addCash(payout);
 state.index += 1; state.phase = 'go'; state.cargo = state.index >= MISSIONS.length ? state.cargo : (MISSIONS[state.index]?.type === 'reach-with-cargo' ? true : state.cargo);
 if (MISSIONS[state.index]?.type === 'reach-with-cargo') state.cargo = true;
 hud.complete(m.title, payout, MISSIONS[state.index] || null);
 return { completed: m, payout };
}

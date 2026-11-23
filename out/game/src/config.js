// CORAL CITY HEAT — tuning, world dimensions and the five districts of Coral City, Marisol.
// Everything gameplay-shaping lives here so the other modules stay declarative: district
// bounds drive ground tints, the minimap and the district title card; TUNING drives vehicle
// speeds, wanted escalation and mission payouts.
export const GAME_TITLE = 'CORAL CITY HEAT';
export const SAVE_KEY = 'coralCityHeatSave';
export const WORLD_SIZE = 1700;
export const STEP = 1 / 60;

export const DISTRICTS = [
  { name: 'Coral Beach', sub: 'the neon strip', x0: 130, x1: 470, z0: -560, z1: 560, tint: 0x2e6f79, map: '#2e6f79' },
  { name: 'Downtown', sub: 'the tower grid', x0: -270, x1: 130, z0: -270, z1: 270, tint: 0x3a3f52, map: '#3a3f52' },
  { name: 'Port Azahar', sub: 'cranes and cargo', x0: -270, x1: 470, z0: 270, z1: 560, tint: 0x54443a, map: '#54443a' },
  { name: 'Las Ciénagas', sub: 'the bayou', x0: -560, x1: -270, z0: -560, z1: 560, tint: 0x274435, map: '#274435' },
  { name: 'Isla Verde', sub: 'across the bridge', x0: 740, x1: 1120, z0: -260, z1: 260, tint: 0x38624a, map: '#38624a' },
];

export const TUNING = {
  walkSpeed: 7, sprintSpeed: 12,
  carAccel: 26, carBrake: 40, carDrag: 0.55, carGrip: 7.5,
  nitroBoost: 1.65, nitroSeconds: 3.2,
  wantedDecaySeconds: 26, wantedPerCrime: { shot: 0.34, crash: 0.2, carjack: 0.5, cop: 1.2 },
  copSpeed: 34, copCountByStars: [0, 0, 2, 3, 4, 6],
  heliStars: 3, roadblockStars: 4,
  startCash: 12450,
  payouts: [400, 1200, 2500, 25000, 250000],
};

export const RADIO_STATIONS = [
  { id: 'onda', name: 'ONDA 98.5', tag: 'SYNTH MARISOL', base: 55 },
  { id: 'roca', name: 'ROCA FM', tag: 'ROCK CLÁSICO', base: 65 },
  { id: 'fiebre', name: 'FIEBRE 105', tag: 'SALSA Y SOL', base: 73.4 },
];

export const WEAPONS = ['FISTS', 'PISTOL', 'CARBINE', 'SHOTGUN', 'SMG', 'SNIPER', 'RPG', 'KNIFE'];

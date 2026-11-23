// Procedural Web Audio engine: no audio files, everything is synthesised — an engine hum
// whose pitch tracks RPM, a two-tone sheriff siren, tire screech noise, gunshot / crash /
// pickup blips, and a synthwave bass loop for the radio. The context starts on the first
// user gesture (browser policy); in screenshot mode nothing ever starts it, so it is silent.
export function initProceduralWebAudioEngine() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, sirenOsc = null;
  let sirenGain = null, radioTimer = 0, radioStep = 0, radioBase = 55, radioOn = false;
  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
    const engineFilter = ctx.createBiquadFilter(); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 420;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master); engineOsc.start();
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
  }
  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
  }
  function noiseBurst(dur, vol, freq) {
    if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  return {
    start,
    get running() { return !!ctx; },
    setEngine(rpm01, driving) {
      if (!ctx) return;
      engineOsc.frequency.value = 55 + rpm01 * 165;
      engineGain.gain.value = driving ? 0.05 + rpm01 * 0.05 : 0.012;
    },
    setSiren(on, dist01) {
      if (!ctx) return;
      const t = ctx.currentTime;
      sirenOsc.frequency.value = on ? 650 + Math.sin(t * 5.2) * 190 : 700;
      sirenGain.gain.value = on ? 0.028 * (1 - dist01 * 0.7) : 0;
    },
    screech(amount) { if (ctx && amount > 0.4) noiseBurst(0.09, 0.05 * amount, 2400); },
    shot() { noiseBurst(0.07, 0.22, 900); blip(160, 0.06, 'square', 0.1, 60); },
    crash() { noiseBurst(0.22, 0.3, 300); blip(90, 0.2, 'sine', 0.25, 40); },
    pickup() { blip(880, 0.09, 'sine', 0.12); setTimeout(() => blip(1320, 0.12, 'sine', 0.12), 70); },
    complete() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.14), i * 90)); },
    setRadio(station) { radioOn = !!station; if (station) radioBase = station.base; },
    update(dt) {
      if (!ctx || !radioOn) return;
      radioTimer -= dt;
      if (radioTimer <= 0) {
        radioTimer = 0.24;
        const scale = [0, 0, 3, 0, 5, 0, 7, 10];
        const f = radioBase * Math.pow(2, scale[radioStep % scale.length] / 12);
        blip(f, 0.2, 'sawtooth', 0.045); blip(f * 2, 0.1, 'square', 0.015);
        radioStep++;
      }
    },
  };
}

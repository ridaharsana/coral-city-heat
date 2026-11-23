// Keyboard + mouse input with per-frame action edges. `down` is level state, `hit` is the
// edge (true only on the first frame of a press) — gameplay reads levels for movement and
// edges for one-shot actions: E enter/exit, Tab switch protagonist, M map, Q wheel, Esc pause.
export function createInput() {
  const keys = new Set();
  const edges = new Set();
  let mouseX = 0, mouseY = 0, mouseDown = false, wheel = 0;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    if (!keys.has(e.code)) edges.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });
  window.addEventListener('mousemove', (e) => { mouseX = e.movementX || 0; mouseY = e.movementY || 0; });
  window.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
  window.addEventListener('wheel', (e) => { wheel += Math.sign(e.deltaY); }, { passive: true });
  return {
    down: (code) => keys.has(code),
    hit: (code) => edges.has(code),
    axis: (neg, pos) => (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0),
    get mouseDown() { return mouseDown; },
    get mouseDX() { const v = mouseX; mouseX = 0; return v; },
    get mouseDY() { const v = mouseY; mouseY = 0; return v; },
    get wheelDelta() { const v = wheel; wheel = 0; return v; },
    endFrame() { edges.clear(); },
    // Named one-shot actions, read by people.js / main.js.
    actionEnter: () => edges.has('KeyE'),
    actionSwitch: () => edges.has('Tab'),
    actionMap: () => edges.has('KeyM'),
    actionWheel: () => keys.has('KeyQ'),
    actionPause: () => edges.has('Escape') || edges.has('KeyP'),
    actionConfirm: () => edges.has('Enter'),
  };
}

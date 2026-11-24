// Keyboard + mouse input: `down` is level state, `hit` the per-frame press edge; named actions at the bottom.
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
  actionEnter: () => edges.has('KeyE'),
  actionSwitch: () => edges.has('Tab'),
  actionMap: () => edges.has('KeyM'),
  actionWheel: () => keys.has('KeyQ'),
  actionPause: () => edges.has('Escape') || edges.has('KeyP'),
  actionConfirm: () => edges.has('Enter'),
 };
}

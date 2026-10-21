const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Horizontal fader. value is 0..1.
export function createSlider(el, { onChange }) {
  const rail = el.querySelector('.fader-rail');
  let value = 0, dragging = false, enabled = true;

  function set(v) {
    value = Math.round(clamp(v, 0, 1) * 1000) / 1000; // rounding keeps keyboard steps from landing on 0.9999
    el.style.setProperty('--v', String(value));
    el.setAttribute('aria-valuenow', String(Math.round(value * 100)));
    onChange(value);
  }

  function fromPointer(e) {
    const r = rail.getBoundingClientRect();
    set((e.clientX - r.left) / r.width);
  }

  el.addEventListener('pointerdown', (e) => {
    if (!enabled) return;
    dragging = true;
    el.setPointerCapture(e.pointerId);
    el.focus({ preventScroll: true });
    fromPointer(e);
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
  const release = () => { dragging = false; };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);

  el.addEventListener('keydown', (e) => {
    if (!enabled) return;
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!dir) return;
    set(value + dir * 0.05);
    e.preventDefault();
  });

  set(0);

  return {
    disable() { enabled = false; dragging = false; },
  };
}

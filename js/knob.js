const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Rotary knob. The pointer sets a *target* angle; the shown angle chases it at no more than
// maxSpeed deg/s, so the turn is always visible no matter how fast the user swipes.
export function createKnob(el, { min, max, start = min, maxSpeed, onChange }) {
  const rot = el.querySelector('.knob-rot');
  let target = start, shown = start;
  let raf = 0, last = 0;
  let dragging = false, lastPointerAngle = 0;
  let enabled = true;

  function render() {
    rot.style.transform = `rotate(${shown}deg)`;
    el.setAttribute('aria-valuenow', String(Math.round(((shown - min) / (max - min)) * 100)));
    onChange(shown);
  }

  function tick(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    const diff = target - shown, step = maxSpeed * dt;
    shown = Math.abs(diff) <= step ? target : shown + Math.sign(diff) * step;
    render();
    raf = shown === target ? 0 : requestAnimationFrame(tick);
  }

  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function pointerAngle(e) {
    const r = el.getBoundingClientRect();
    return (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
  }

  el.addEventListener('pointerdown', (e) => {
    if (!enabled) return;
    dragging = true;
    lastPointerAngle = pointerAngle(e);
    el.setPointerCapture(e.pointerId);
    el.focus({ preventScroll: true });
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const a = pointerAngle(e);
    let d = a - lastPointerAngle;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    lastPointerAngle = a;
    target = clamp(target + d, min, max);
    kick();
  });
  const release = () => { dragging = false; };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);

  el.addEventListener('keydown', (e) => {
    if (!enabled) return;
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!dir) return;
    target = clamp(target + dir * 10, min, max);
    kick();
    e.preventDefault();
  });

  render();

  return {
    disable() { enabled = false; dragging = false; },
  };
}

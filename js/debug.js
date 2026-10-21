// ?debug=1 — overlay the depth/normal maps and show what's sampled under the pointer.
export function createDebug({ stage, surface }) {
  const el = document.createElement('div');
  el.className = 'debug';
  el.innerHTML = '<div><button data-m="none">off</button><button data-m="depth">depth</button><button data-m="normal">normal</button><button data-m="mask">mask</button><button data-m="ao">ao</button></div><pre>move over the image</pre>';
  document.body.appendChild(el);
  const pre = el.querySelector('pre');

  el.addEventListener('click', (e) => {
    const m = e.target.dataset && e.target.dataset.m;
    if (m) stage.setOverlay(m);
  });
  // Don't let panel clicks reach the canvas handlers.
  el.addEventListener('pointerdown', (e) => e.stopPropagation());

  window.addEventListener('pointermove', (e) => {
    const uv = stage.uvAt(e.clientX, e.clientY);
    if (!uv) { pre.textContent = '—'; return; }
    const s = stage.probe(uv.u, uv.v);
    const n = s.footprint;
    const f = (n) => n.toFixed(2);
    pre.textContent =
      `uv      ${f(uv.u)}, ${f(uv.v)}\n` +
      `depth   ${f(s.depth)} (median ${f(surface.median)})${s.blank ? '  BLANK' : ''}${s.masked ? '  OFF-MASK' : ''}\n` +
      `normal  ${f(n.x)}, ${f(n.y)}, ${f(n.z)}  (${n.kept}/${n.total} samples)\n` +
      `scale   ${f(s.scale)}x\n` +
      `tilt    ${Math.round((Math.atan2(n.y, n.x) * 180) / Math.PI)}deg  squash ${f(n.z)}`;
  });
}

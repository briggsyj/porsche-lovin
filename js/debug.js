import { CONFIG } from './config.js';

// ?debug=1 — overlays (depth / normal / mask / ao), a readout of what's sampled under the pointer, and a
// shading tuner: "paint" covers the whole car in one flat colour through the kisses' shading (add &paint=1
// to start with it on), with live sliders for every shading setting and a button to copy the values.
export function createDebug({ stage, surface }) {
  const el = document.createElement('div');
  el.className = 'debug';
  el.innerHTML = `
    <div><button data-m="none">off</button><button data-m="depth">depth</button><button data-m="normal">normal</button><button data-m="mask">mask</button><button data-m="ao">ao</button></div>
    <div class="debug-paint"><button data-paint>paint car</button> <input type="color" value="${stage.kissColor}" title="paint colour"></div>
    <div class="debug-tune" hidden></div>
    <pre>move over the image</pre>`;
  document.body.appendChild(el);
  const pre = el.querySelector('pre');
  const tune = el.querySelector('.debug-tune');
  const colour = el.querySelector('input[type=color]');
  let painting = false;

  // Live shading settings. `ao` ones change the occlusion map itself, so it's rebuilt as they move.
  const sliders = [
    ['kiss.multiply (car light/shade)', () => CONFIG.kiss.multiply, (v) => (CONFIG.kiss.multiply = v), 0, 1, 0.01],
    ['kiss.blend (highlights)', () => CONFIG.kiss.blend, (v) => (CONFIG.kiss.blend = v), 0, 1, 0.01],
    ['kiss.ao (occlusion strength)', () => CONFIG.kiss.ao, (v) => (CONFIG.kiss.ao = v), 0, 1, 0.01],
    ['ao.gain[0] depth fine', () => CONFIG.ao.gain[0], (v) => (CONFIG.ao.gain[0] = v), 0, 40, 0.5, true],
    ['ao.gain[1] depth broad', () => CONFIG.ao.gain[1], (v) => (CONFIG.ao.gain[1] = v), 0, 40, 0.5, true],
    ['ao.normal.gain[0] fine', () => CONFIG.ao.normal.gain[0], (v) => (CONFIG.ao.normal.gain[0] = v), 0, 3, 0.05, true],
    ['ao.normal.gain[1] medium', () => CONFIG.ao.normal.gain[1], (v) => (CONFIG.ao.normal.gain[1] = v), 0, 4, 0.05, true],
  ];
  for (const [label, get, set, min, max, step, isAO] of sliders) {
    const row = document.createElement('label');
    row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${get()}"><output>${get()}</output>`;
    const input = row.querySelector('input'), out = row.querySelector('output');
    input.addEventListener('input', () => {
      set(parseFloat(input.value));
      out.textContent = input.value;
      if (isAO) surface.updateAO();
      stage.refresh();
    });
    tune.appendChild(row);
  }
  const copy = document.createElement('button');
  copy.textContent = 'copy settings';
  copy.addEventListener('click', () => {
    const text = JSON.stringify({
      kiss: { ao: CONFIG.kiss.ao, multiply: CONFIG.kiss.multiply, blend: CONFIG.kiss.blend },
      ao: { gain: CONFIG.ao.gain, normal: { gain: CONFIG.ao.normal.gain } },
    }, null, 2);
    console.log(text);
    navigator.clipboard?.writeText(text).catch(() => {});
    copy.textContent = 'copied (see console)';
    setTimeout(() => (copy.textContent = 'copy settings'), 1500);
  });
  tune.appendChild(copy);

  function setPaint(on) {
    painting = on;
    tune.hidden = !on;
    stage.setPaint(on ? colour.value : null);
  }
  colour.addEventListener('input', () => { if (painting) stage.setPaint(colour.value); });

  el.addEventListener('click', (e) => {
    const m = e.target.dataset && e.target.dataset.m;
    if (m) stage.setOverlay(m);
    if (e.target.dataset && 'paint' in e.target.dataset) setPaint(!painting);
  });
  // Don't let panel clicks reach the canvas handlers.
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  if (new URLSearchParams(location.search).get('paint') === '1') setPaint(true);

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

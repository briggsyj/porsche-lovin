import { CONFIG } from './config.js';
import { createDecal } from './decal.js';

// The canvas: draws the car, then every kiss. Kisses are stored as sampled surface data
// (not pixels), so resizing just replays them and the count is unlimited.
export function createStage({ canvas, carImg, kissImg, surface, onKiss, onFit = () => {} }) {
  const ctx = canvas.getContext('2d');
  const decal = createDecal({ kissImg, carImg, surface });
  const aspect = carImg.naturalWidth / carImg.naturalHeight;
  const kissAspect = kissImg.naturalHeight / kissImg.naturalWidth;
  const kisses = [];
  let cssW = 0, cssH = 0, dpr = 1;
  let enabled = false;
  let overlay = 'none';
  let liftPending = false;
  let resizeTimer = 0;

  const drawKiss = (k) => decal.draw(ctx, k, cssW, cssH, dpr);

  function redraw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(carImg, 0, 0, cssW, cssH);
    for (const k of kisses) drawKiss(k);
    const overlayCanvas = { depth: surface.depthCanvas, normal: surface.normalCanvas, mask: surface.maskCanvas, ao: surface.aoCanvas }[overlay];
    if (overlayCanvas) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(overlayCanvas, 0, 0, cssW, cssH);
      ctx.globalAlpha = 1;
    }
  }

  function fit() {
    const availW = window.innerWidth * 0.94 - 16;
    const availH = window.innerHeight - (window.innerHeight * 0.065 + 28) - 100 - 24; // minus valance above, candles below
    cssW = Math.max(120, Math.floor(Math.min(availW, availH * aspect)));
    cssH = Math.floor(cssW / aspect);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    redraw();
    onFit();
  }

  function uvAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const u = (clientX - r.left) / r.width, v = (clientY - r.top) / r.height;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null;
  }

  // Everything a kiss at (u, v) would be: size from depth, angle from the normals inside its footprint.
  function probe(u, v, spin = 0) {
    const s = surface.surfaceAt(u, v);
    const hw = (CONFIG.kiss.widthFrac * s.scale) / 2;              // half-width in u (fraction of image width)
    const hh = (hw * kissAspect * aspect);                         // half-height in v
    return { ...s, footprint: surface.footprintNormal(u, v, hw, hh, spin) };
  }

  function place(clientX, clientY) {
    const uv = uvAt(clientX, clientY);
    if (!uv) return;
    const spinMax = (CONFIG.kiss.spinMaxDeg * Math.PI) / 180;
    const spin = (Math.random() * 2 - 1) * spinMax;
    const s = probe(uv.u, uv.v, spin);
    if (s.blank || s.masked) return; // black in the depth map or the mask: nothing to kiss
    const kiss = { u: uv.u, v: uv.v, scale: s.scale, spin, normal: s.footprint };
    kisses.push(kiss);
    if (overlay === 'depth' || overlay === 'normal' || overlay === 'mask' || overlay === 'ao') redraw();
    else { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawKiss(kiss); }
    onKiss();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.pointerType === 'touch') liftPending = true; // touch: aim first, kiss on lift
    else place(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (enabled && liftPending) place(e.clientX, e.clientY);
    liftPending = false;
  });
  canvas.addEventListener('pointercancel', () => { liftPending = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Re-warping every kiss is the costly part of a resize, so wait for the drag to settle.
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fit, 120); });
  fit();

  return {
    enable() { enabled = true; },
    setOverlay(name) { overlay = name; redraw(); },
    uvAt,
    probe,
    get kissCount() { return kisses.length; },
  };
}

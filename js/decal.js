import { CONFIG } from './config.js';

// Paints a kiss "onto" the surface rather than flat on the screen.
//
// The kiss is a grid mesh. Each vertex starts at the kiss centre and walks across the surface
// by its decal-space offset; at every step the local normal gives the surface's two tangent
// directions, and the step is the offset expressed in those tangents, projected back to the
// screen. So the kiss compresses where the surface turns away, and bends as the normal changes
// across it. On a flat tilted panel this is exactly the foreshortening you'd get photographing
// a sticker on it.
//
// The mesh is rasterised on the CPU into a small supersampled scratch image (no triangle seams,
// and kisses are only tens of pixels wide), then composited onto the stage.
export function createDecal({ kissImg, carImg, surface }) {
  const { cols: COLS, rows: ROWS, steps: STEPS, supersample: SS } = CONFIG.warp;
  const tw = kissImg.naturalWidth, th = kissImg.naturalHeight;
  const aspect = th / tw;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Premultiplied float copy of the kiss so bilinear sampling doesn't fringe at the edges.
  const tex = new Float32Array(tw * th * 4);
  {
    const c = document.createElement('canvas');
    c.width = tw; c.height = th;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(kissImg, 0, 0);
    const raw = g.getImageData(0, 0, tw, th).data;
    for (let i = 0; i < tw * th; i++) {
      const a = raw[i * 4 + 3] / 255;
      tex[i * 4] = (raw[i * 4] / 255) * a;
      tex[i * 4 + 1] = (raw[i * 4 + 1] / 255) * a;
      tex[i * 4 + 2] = (raw[i * 4 + 2] / 255) * a;
      tex[i * 4 + 3] = a;
    }
  }
  const px = new Float32Array(4);
  function sample(x, y) {
    x = clamp(x - 0.5, 0, tw - 1); y = clamp(y - 0.5, 0, th - 1);
    const x0 = x | 0, y0 = y | 0, x1 = Math.min(x0 + 1, tw - 1), y1 = Math.min(y0 + 1, th - 1);
    const fx = x - x0, fy = y - y0;
    for (let c = 0; c < 4; c++) {
      px[c] = (tex[(y0 * tw + x0) * 4 + c] * (1 - fx) + tex[(y0 * tw + x1) * 4 + c] * fx) * (1 - fy)
        + (tex[(y1 * tw + x0) * 4 + c] * (1 - fx) + tex[(y1 * tw + x1) * 4 + c] * fx) * fy;
    }
  }

  const scratch = () => { const c = document.createElement('canvas'); return { c, g: c.getContext('2d') }; };
  const hi = scratch(), lo = scratch(), lit = scratch();
  const ensure = (s, w, h) => { if (s.c.width < w) s.c.width = w; if (s.c.height < h) s.c.height = h; };

  // Screen-space vertex positions (CSS px) for one kiss.
  function buildMesh(k, cssW, cssH) {
    const W = CONFIG.kiss.widthFrac * cssW * k.scale, H = W * aspect;
    const cs = Math.cos(k.spin), sn = Math.sin(k.spin);
    const pts = new Float32Array((COLS + 1) * (ROWS + 1) * 2);
    for (let j = 0; j <= ROWS; j++) {
      for (let i = 0; i <= COLS; i++) {
        const a0 = (i / COLS - 0.5) * W, b0 = (j / ROWS - 0.5) * H;
        const a = (a0 * cs - b0 * sn) / STEPS, b = (a0 * sn + b0 * cs) / STEPS; // spin within the surface plane
        let x = k.u * cssW, y = k.v * cssH;
        for (let s = 0; s < STEPS; s++) {
          // The kiss's robust footprint normal; optionally eased toward the fine local normal.
          const c = CONFIG.warp.curvature;
          let n = k.normal;
          if (c > 0) {
            const q = surface.normalAt(x / cssW, y / cssH);
            const mx = n.x * (1 - c) + q.x * c, my = n.y * (1 - c) + q.y * c, mz = n.z * (1 - c) + q.z * c;
            const m = Math.hypot(mx, my, mz) || 1;
            n = { x: mx / m, y: my / m, z: mz / m };
          }
          // Tangent basis: e1 = screen-x projected onto the surface plane, e2 = n x e1.
          const l = Math.hypot(1 - n.x * n.x, n.x * n.y, n.x * n.z) || 1;
          const e1x = (1 - n.x * n.x) / l, e1y = (-n.x * n.y) / l, e1z = (-n.x * n.z) / l;
          const e2x = n.y * e1z - n.z * e1y, e2y = n.z * e1x - n.x * e1z;
          x += a * e1x + b * e2x;
          y += a * e1y + b * e2y;
        }
        const p = (j * (COLS + 1) + i) * 2;
        pts[p] = x; pts[p + 1] = y;
      }
    }
    return pts;
  }

  function rasterTri(out, sw, sh, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2) {
    const den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (Math.abs(den) < 1e-9) return;
    const minx = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxx = Math.min(sw - 1, Math.ceil(Math.max(x0, x1, x2)));
    const miny = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxy = Math.min(sh - 1, Math.ceil(Math.max(y0, y1, y2)));
    const E = 1e-3;
    for (let py = miny; py <= maxy; py++) {
      for (let pxl = minx; pxl <= maxx; pxl++) {
        const cx = pxl + 0.5, cy = py + 0.5;
        const l0 = ((y1 - y2) * (cx - x2) + (x2 - x1) * (cy - y2)) / den;
        const l1 = ((y2 - y0) * (cx - x2) + (x0 - x2) * (cy - y2)) / den;
        const l2 = 1 - l0 - l1;
        if (l0 < -E || l1 < -E || l2 < -E) continue;
        sample(l0 * u0 + l1 * u1 + l2 * u2, l0 * v0 + l1 * v1 + l2 * v2);
        const a = px[3];
        const o = (py * sw + pxl) * 4;
        if (a <= 0) { out[o + 3] = 0; continue; }
        out[o] = (px[0] / a) * 255; out[o + 1] = (px[1] / a) * 255; out[o + 2] = (px[2] / a) * 255; out[o + 3] = a * 255;
      }
    }
  }

  // ctx must already have its transform set to (dpr, 0, 0, dpr, 0, 0), i.e. draw in CSS px.
  function draw(ctx, k, cssW, cssH, dpr, wire = false) {
    const pts = buildMesh(k, cssW, cssH);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]);
      minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1]);
    }
    minX -= 1; minY -= 1; maxX += 1; maxY += 1;
    const pw = Math.max(1, Math.ceil((maxX - minX) * dpr)), ph = Math.max(1, Math.ceil((maxY - minY) * dpr));
    const sw = pw * SS, sh = ph * SS, f = dpr * SS;

    const img = hi.g.createImageData(sw, sh);
    const V = (i, j) => { const p = (j * (COLS + 1) + i) * 2; return [(pts[p] - minX) * f, (pts[p + 1] - minY) * f]; };
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const [ax, ay] = V(i, j), [bx, by] = V(i + 1, j), [cx, cy] = V(i, j + 1), [dx, dy] = V(i + 1, j + 1);
        const u0 = (i / COLS) * tw, u1 = ((i + 1) / COLS) * tw, v0 = (j / ROWS) * th, v1 = ((j + 1) / ROWS) * th;
        rasterTri(img.data, sw, sh, ax, ay, u0, v0, bx, by, u1, v0, cx, cy, u0, v1);
        rasterTri(img.data, sw, sh, bx, by, u1, v0, dx, dy, u1, v1, cx, cy, u0, v1);
      }
    }
    ensure(hi, sw, sh); ensure(lo, pw, ph); ensure(lit, pw, ph);
    hi.g.putImageData(img, 0, 0);
    lo.g.clearRect(0, 0, pw, ph);
    lo.g.imageSmoothingQuality = 'high';
    lo.g.drawImage(hi.c, 0, 0, sw, sh, 0, 0, pw, ph);

    const dw = pw / dpr, dh = ph / dpr;

    // Cull whatever falls outside the mask, so kisses near the edge of the car stop at the edge.
    const m = surface.maskAlphaCanvas;
    if (m) {
      lo.g.globalCompositeOperation = 'destination-in';
      lo.g.drawImage(m, (minX / cssW) * m.width, (minY / cssH) * m.height, (dw / cssW) * m.width, (dh / cssH) * m.height, 0, 0, pw, ph);
      lo.g.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(lo.c, 0, 0, pw, ph, minX, minY, dw, dh);

    // Let the paint's light and reflections show through: the car under the kiss, soft-light blended.
    if (CONFIG.kiss.blend > 0) {
      lit.g.globalCompositeOperation = 'source-over';
      lit.g.clearRect(0, 0, pw, ph);
      lit.g.drawImage(carImg, (minX / cssW) * carImg.naturalWidth, (minY / cssH) * carImg.naturalHeight,
        (dw / cssW) * carImg.naturalWidth, (dh / cssH) * carImg.naturalHeight, 0, 0, pw, ph);
      lit.g.globalCompositeOperation = 'destination-in';
      lit.g.drawImage(lo.c, 0, 0, pw, ph, 0, 0, pw, ph);
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = CONFIG.kiss.blend;
      ctx.drawImage(lit.c, 0, 0, pw, ph, minX, minY, dw, dh);
      ctx.restore();
    }

    if (wire) {
      ctx.save();
      ctx.strokeStyle = 'rgb(0 255 120 / .9)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= COLS; i++) { const p = (j * (COLS + 1) + i) * 2; if (i === 0) ctx.moveTo(pts[p], pts[p + 1]); else ctx.lineTo(pts[p], pts[p + 1]); }
      for (let i = 0; i <= COLS; i++) for (let j = 0; j <= ROWS; j++) { const p = (j * (COLS + 1) + i) * 2; if (j === 0) ctx.moveTo(pts[p], pts[p + 1]); else ctx.lineTo(pts[p], pts[p + 1]); }
      ctx.stroke();
      ctx.restore();
    }
  }

  return { draw };
}

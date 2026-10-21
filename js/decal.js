import { CONFIG } from './config.js';

// Paints a kiss onto the surface as a projected decal.
//
// 1. Around the kiss, turn the normal map into a small height field (integrate the slopes the
//    normals describe), so every screen pixel there has a 3D position on the surface.
// 2. The kiss lives on a plane at the kiss's footprint normal. Each surface point is projected
//    onto that plane (straight along the normal, like a decal projector) to find which texel of
//    the kiss lands on it.
// 3. Rasterise: every screen pixel gets the texel of whatever surface point is there. Where the
//    surface turns away or steps (panel edges, grille, lamp rims) the kiss compresses, stretches
//    and breaks exactly as paint on that geometry would; where it turns edge-on it fades out.
//
// The result is drawn into a small supersampled scratch image, clipped to the mask, lit by the
// paint underneath, and composited onto the stage.
export function createDecal({ kissImg, carImg, surface }) {
  const { supersample: SS, reach, fade, planeLimit } = CONFIG.warp;
  const tw = kissImg.naturalWidth, th = kissImg.naturalHeight;
  const aspect = th / tw;
  const mw = surface.width, mh = surface.height;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

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

  // Rasterise one triangle of the grid; texture coords and fade are interpolated across it.
  function tri(out, sw, sh, S, ia, ib, ic) {
    const { X, Y, U, V, F } = S;
    const x0 = X[ia], y0 = Y[ia], x1 = X[ib], y1 = Y[ib], x2 = X[ic], y2 = Y[ic];
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
        const u = l0 * U[ia] + l1 * U[ib] + l2 * U[ic], v = l0 * V[ia] + l1 * V[ib] + l2 * V[ic];
        if (u < 0 || v < 0 || u >= tw || v >= th) continue; // outside the kiss
        const f = l0 * F[ia] + l1 * F[ib] + l2 * F[ic];
        if (f <= 0) continue;
        sample(u, v);
        const a = px[3];
        const o = (py * sw + pxl) * 4;
        if (a <= 0) { out[o + 3] = 0; continue; }
        out[o] = (px[0] / a) * 255; out[o + 1] = (px[1] / a) * 255; out[o + 2] = (px[2] / a) * 255; out[o + 3] = a * f * 255;
      }
    }
  }

  // ctx must already have its transform set to (dpr, 0, 0, dpr, 0, 0), i.e. draw in CSS px.
  function draw(ctx, k, cssW, cssH, dpr) {
    const toCssX = cssW / (mw - 1), toCssY = cssH / (mh - 1); // map px -> CSS px
    const cxm = k.u * (mw - 1), cym = k.v * (mh - 1);
    const W = CONFIG.kiss.widthFrac * k.scale * mw, H = W * aspect; // kiss size in map px
    const R = Math.ceil(0.5 * Math.hypot(W, H) * reach) + 2;        // patch half-size, with room to stretch
    const ci = Math.round(cxm), cj = Math.round(cym), N = 2 * R + 1;

    // Surface slopes and normals over the patch.
    const gx = new Float32Array(N * N), gy = new Float32Array(N * N);
    const nx = new Float32Array(N * N), ny = new Float32Array(N * N), nz = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const n = surface.normalAt((ci - R + i) / (mw - 1), (cj - R + j) / (mh - 1));
        const q = j * N + i;
        nx[q] = n.x; ny[q] = n.y; nz[q] = n.z;
        gx[q] = -n.x / n.z; gy[q] = -n.y / n.z; // n ~ (-dz/dx, -dz/dy, 1), z toward the camera
      }
    }
    // Integrate to heights: down/up the centre column, then out along each row.
    const z = new Float32Array(N * N);
    for (let j = R + 1; j < N; j++) z[j * N + R] = z[(j - 1) * N + R] + 0.5 * (gy[(j - 1) * N + R] + gy[j * N + R]);
    for (let j = R - 1; j >= 0; j--) z[j * N + R] = z[(j + 1) * N + R] - 0.5 * (gy[(j + 1) * N + R] + gy[j * N + R]);
    for (let j = 0; j < N; j++) {
      const row = j * N;
      for (let i = R + 1; i < N; i++) z[row + i] = z[row + i - 1] + 0.5 * (gx[row + i - 1] + gx[row + i]);
      for (let i = R - 1; i >= 0; i--) z[row + i] = z[row + i + 1] - 0.5 * (gx[row + i + 1] + gx[row + i]);
    }

    // The decal's plane: normal n0 (the kiss's footprint normal), tangents t1/t2, spun in-plane.
    const n0 = k.normal;
    const l = Math.hypot(1 - n0.x * n0.x, n0.x * n0.y, n0.x * n0.z) || 1;
    const e1 = [(1 - n0.x * n0.x) / l, (-n0.x * n0.y) / l, (-n0.x * n0.z) / l];
    const e2 = [n0.y * e1[2] - n0.z * e1[1], n0.z * e1[0] - n0.x * e1[2], n0.x * e1[1] - n0.y * e1[0]];
    const cs = Math.cos(k.spin), sn = Math.sin(k.spin);
    const t1 = [cs * e1[0] + sn * e2[0], cs * e1[1] + sn * e2[1], cs * e1[2] + sn * e2[2]];
    const t2 = [-sn * e1[0] + cs * e2[0], -sn * e1[1] + cs * e2[1], -sn * e1[2] + cs * e2[2]];
    const wide = Math.max(W, H);

    // Sprite covers the patch.
    const minX = (ci - R) * toCssX, maxX = (ci + R) * toCssX, minY = (cj - R) * toCssY, maxY = (cj + R) * toCssY;
    const pw = Math.max(1, Math.ceil((maxX - minX) * dpr)), ph = Math.max(1, Math.ceil((maxY - minY) * dpr));
    const sw = pw * SS, sh = ph * SS, f = dpr * SS;

    const S = { X: new Float32Array(N * N), Y: new Float32Array(N * N), U: new Float32Array(N * N), V: new Float32Array(N * N), F: new Float32Array(N * N) };
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const q = j * N + i;
        const Px = ci - R + i - cxm, Py = cj - R + j - cym, Pz = z[q];
        S.X[q] = ((ci - R + i) * toCssX - minX) * f;
        S.Y[q] = ((cj - R + j) * toCssY - minY) * f;
        S.U[q] = ((Px * t1[0] + Py * t1[1] + Pz * t1[2]) / W + 0.5) * tw; // where on the kiss this surface point falls
        S.V[q] = ((Px * t2[0] + Py * t2[1] + Pz * t2[2]) / H + 0.5) * th;
        const facing = nx[q] * n0.x + ny[q] * n0.y + nz[q] * n0.z;        // surface turning away from the decal plane
        const off = Math.abs(Px * n0.x + Py * n0.y + Pz * n0.z) / wide;   // surface far from the decal plane (a different layer)
        S.F[q] = smooth(fade[0], fade[1], facing) * (1 - smooth(planeLimit * 0.6, planeLimit, off));
      }
    }

    const img = hi.g.createImageData(sw, sh);
    for (let j = 0; j < N - 1; j++) {
      for (let i = 0; i < N - 1; i++) {
        const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
        const U = S.U, V = S.V, F = S.F;
        if ((U[a] < 0 && U[b] < 0 && U[c] < 0 && U[d] < 0) || (U[a] >= tw && U[b] >= tw && U[c] >= tw && U[d] >= tw)) continue;
        if ((V[a] < 0 && V[b] < 0 && V[c] < 0 && V[d] < 0) || (V[a] >= th && V[b] >= th && V[c] >= th && V[d] >= th)) continue;
        if (F[a] <= 0 && F[b] <= 0 && F[c] <= 0 && F[d] <= 0) continue;
        tri(img.data, sw, sh, S, a, b, c);
        tri(img.data, sw, sh, S, b, d, c);
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

    // Make the kiss take on the paint's lighting: the car under the kiss is multiplied in (so kisses in
    // shade sit darker, like lipstick on paint, not a bright sticker) and soft-light blended (so
    // highlights and reflections show through).
    if (CONFIG.kiss.blend > 0 || CONFIG.kiss.multiply > 0) {
      lit.g.globalCompositeOperation = 'source-over';
      lit.g.clearRect(0, 0, pw, ph);
      lit.g.drawImage(carImg, (minX / cssW) * carImg.naturalWidth, (minY / cssH) * carImg.naturalHeight,
        (dw / cssW) * carImg.naturalWidth, (dh / cssH) * carImg.naturalHeight, 0, 0, pw, ph);
      lit.g.globalCompositeOperation = 'destination-in';
      lit.g.drawImage(lo.c, 0, 0, pw, ph, 0, 0, pw, ph);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = CONFIG.kiss.multiply;
      ctx.drawImage(lit.c, 0, 0, pw, ph, minX, minY, dw, dh);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = CONFIG.kiss.blend;
      ctx.drawImage(lit.c, 0, 0, pw, ph, minX, minY, dw, dh);
      ctx.restore();
    }

    // Ambient occlusion from the depth map: kisses sitting in creases and recesses darken very slightly.
    if (CONFIG.kiss.ao > 0 && surface.aoCanvas) {
      const a = surface.aoCanvas;
      lit.g.globalCompositeOperation = 'source-over';
      lit.g.clearRect(0, 0, pw, ph);
      lit.g.drawImage(a, (minX / cssW) * a.width, (minY / cssH) * a.height, (dw / cssW) * a.width, (dh / cssH) * a.height, 0, 0, pw, ph);
      lit.g.globalCompositeOperation = 'destination-in';
      lit.g.drawImage(lo.c, 0, 0, pw, ph, 0, 0, pw, ph);
      ctx.save();
      ctx.globalAlpha = CONFIG.kiss.ao;
      ctx.drawImage(lit.c, 0, 0, pw, ph, minX, minY, dw, dh);
      ctx.restore();
    }
  }

  return { draw };
}

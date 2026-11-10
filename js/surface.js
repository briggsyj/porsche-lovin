import { CONFIG } from './config.js';

const MAX_SAMPLE_DIM = 1024;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function readPixels(img, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, data: ctx.getImageData(0, 0, w, h).data };
}

// Separable box blur over an interleaved float field (edge-clamped, running sums).
function boxBlur(src, w, h, r, ch = 3) {
  const n = 2 * r + 1;
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < ch; c++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[(y * w + clamp(k, 0, w - 1)) * ch + c];
      for (let x = 0; x < w; x++) {
        tmp[(y * w + x) * ch + c] = s / n;
        s += src[(y * w + clamp(x + r + 1, 0, w - 1)) * ch + c] - src[(y * w + clamp(x - r, 0, w - 1)) * ch + c];
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < ch; c++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[(clamp(k, 0, h - 1) * w + x) * ch + c];
      for (let y = 0; y < h; y++) {
        out[(y * w + x) * ch + c] = s / n;
        s += tmp[(clamp(y + r + 1, 0, h - 1) * w + x) * ch + c] - tmp[(clamp(y - r, 0, h - 1) * w + x) * ch + c];
      }
    }
  }
  return out;
}

// Reads the depth + normal maps once, then answers "what is the surface like at (u, v)?"
export function createSurface(carImg, depthImg, normalImg, maskImg = null) {
  const sameSize = (img) => img.naturalWidth === carImg.naturalWidth && img.naturalHeight === carImg.naturalHeight;
  if (!sameSize(depthImg) || !sameSize(normalImg) || (maskImg && !sameSize(maskImg))) {
    console.warn('[surface] car, depth and normal images differ in size; they must be pixel-aligned.',
      { car: [carImg.naturalWidth, carImg.naturalHeight], depth: [depthImg.naturalWidth, depthImg.naturalHeight], normal: [normalImg.naturalWidth, normalImg.naturalHeight], mask: maskImg && [maskImg.naturalWidth, maskImg.naturalHeight] });
  }

  const k = Math.min(1, MAX_SAMPLE_DIM / Math.max(carImg.naturalWidth, carImg.naturalHeight));
  const w = Math.max(1, Math.round(carImg.naturalWidth * k));
  const h = Math.max(1, Math.round(carImg.naturalHeight * k));
  const depth = readPixels(depthImg, w, h);
  const normal = readPixels(normalImg, w, h);
  const mask = maskImg ? readPixels(maskImg, w, h) : null; // white = valid
  const radius = Math.max(1, Math.round(w * CONFIG.sampleRadiusFrac));
  const { nearIsWhite, strength, scaleMin, scaleMax, blackCutoff } = CONFIG.depth;

  const depthAt = (p) => (nearIsWhite ? depth.data[p] : 255 - depth.data[p]) / 255;

  // Median depth over the whole image: a kiss placed there comes out at the base size.
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) hist[nearIsWhite ? depth.data[i * 4] : 255 - depth.data[i * 4]]++;
  let acc = 0, medianBin = 0;
  for (; medianBin < 256; medianBin++) { acc += hist[medianBin]; if (acc >= (w * h) / 2) break; }
  const median = Math.max(medianBin / 255, 0.02);
  // Near end of the scene (98th percentile, so a few stray bright pixels don't set it): the person is full size here.
  let nearBin = 0;
  for (acc = 0; nearBin < 255; nearBin++) { acc += hist[nearBin]; if (acc >= 0.98 * w * h) break; }
  const nearDepth = Math.max(nearBin / 255, 0.02);

  // Basic ambient occlusion from the depth map: a point sitting further back than its surroundings
  // (a crease, a recess, the foot of a panel) is shaded. Two scales: tight creases and broader recesses.
  const depthFineOcc = new Float32Array(w * h), depthBroadOcc = new Float32Array(w * h);
  {
    const d = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) d[i] = depthAt(i * 4);
    const { smallFrac, largeFrac } = CONFIG.ao;
    const flat = boxBlur(d, w, h, Math.max(1, Math.round(w * CONFIG.ao.noiseFrac)), 1); // the depth map's fine speckle isn't geometry
    const small = boxBlur(d, w, h, Math.max(1, Math.round(w * smallFrac)), 1);
    const large = boxBlur(d, w, h, Math.max(1, Math.round(w * largeFrac)), 1);
    for (let i = 0; i < w * h; i++) { depthFineOcc[i] = Math.max(0, small[i] - flat[i]); depthBroadOcc[i] = Math.max(0, large[i] - flat[i]); }
  }

  // Mask as an alpha channel (white = opaque, black = clear, edge steepened a little so it stays crisp),
  // used to clip kisses at the edge of the allowed area.
  let maskAlpha = null;
  if (mask) {
    maskAlpha = document.createElement('canvas');
    maskAlpha.width = w;
    maskAlpha.height = h;
    const g = maskAlpha.getContext('2d');
    const img = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) img.data[i * 4 + 3] = clamp(((mask.data[i * 4] / 255 - 0.5) * 8 + 0.5), 0, 1) * 255;
    g.putImageData(img, 0, 0);
  }

  // Normal field decoded to screen space (x right, y DOWN, z toward camera), then blurred.
  // Canvas y points down; an OpenGL map has green pointing up, so flip it.
  const decoded = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    decoded[i * 3] = normal.data[i * 4] / 127.5 - 1;
    decoded[i * 3 + 1] = (normal.data[i * 4 + 1] / 127.5 - 1) * (CONFIG.normal.openGL ? -1 : 1);
    decoded[i * 3 + 2] = normal.data[i * 4 + 2] / 127.5 - 1;
  }
  const field = boxBlur(decoded, w, h, Math.max(1, Math.round(w * CONFIG.warp.smoothFrac)));

  // Finer occlusion from the normal map, which holds more detail than the depth map. Read the normals as
  // surface slopes; where the slopes converge (positive divergence) the surface is concave: a crease, a
  // panel gap, the inside of a vent. Measured at a fine and a medium scale, added to the depth occlusion.
  // Stored as black with the occlusion in alpha; kisses are darkened by it, lightly, where they sit.
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = w;
  aoCanvas.height = h;
  const normalFineOcc = new Float32Array(w * h), normalMediumOcc = new Float32Array(w * h);
  {
    const detail = boxBlur(decoded, w, h, 1);
    const sx = new Float32Array(w * h), sy = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const len = Math.hypot(detail[i * 3], detail[i * 3 + 1], detail[i * 3 + 2]) || 1;
      const z = Math.max(detail[i * 3 + 2] / len, CONFIG.normal.minForeshorten);
      sx[i] = clamp(-(detail[i * 3] / len) / z, -3, 3);
      sy[i] = clamp(-(detail[i * 3 + 1] / len) / z, -3, 3);
    }
    const divergence = (step) => {
      const out = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const xa = Math.min(w - 1, x + step), xb = Math.max(0, x - step), ya = Math.min(h - 1, y + step), yb = Math.max(0, y - step);
          out[y * w + x] = (sx[y * w + xa] - sx[y * w + xb]) / (xa - xb || 1) + (sy[ya * w + x] - sy[yb * w + x]) / (ya - yb || 1);
        }
      }
      return out;
    };
    const { steps } = CONFIG.ao.normal;
    const fine = divergence(steps[0]), medium = divergence(steps[1]);
    for (let i = 0; i < w * h; i++) { normalFineOcc[i] = Math.max(0, fine[i]); normalMediumOcc[i] = Math.max(0, medium[i]); }
  }

  // Combine the four occlusion layers with the current gains into the AO canvas. Called once now, and
  // again by the debug tuner whenever a gain changes.
  function updateAO() {
    const { gain, normal } = CONFIG.ao;
    const g = aoCanvas.getContext('2d');
    const img = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const occ = depthFineOcc[i] * gain[0] + depthBroadOcc[i] * gain[1] + normalFineOcc[i] * normal.gain[0] + normalMediumOcc[i] * normal.gain[1];
      img.data[i * 4 + 3] = clamp(occ, 0, 1) * 255;
    }
    g.putImageData(img, 0, 0);
  }
  updateAO();

  // Unit surface normal at (u, v), bilinearly interpolated. nz is floored so grazing
  // surfaces never collapse a kiss to nothing.
  function normalAt(u, v) {
    const fx = clamp(u * (w - 1), 0, w - 1), fy = clamp(v * (h - 1), 0, h - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
    const tx = fx - x0, ty = fy - y0;
    const at = (x, y, c) => field[(y * w + x) * 3 + c];
    const mix = (c) => (at(x0, y0, c) * (1 - tx) + at(x1, y0, c) * tx) * (1 - ty) + (at(x0, y1, c) * (1 - tx) + at(x1, y1, c) * tx) * ty;
    let nx = mix(0), ny = mix(1), nz = mix(2);
    if (Math.hypot(nx, ny, nz) < 1e-3) { nx = 0; ny = 0; nz = 1; }
    const len = Math.hypot(nx, ny, nz);
    nx /= len; ny /= len; nz /= len;
    nz = Math.max(nz, CONFIG.normal.minForeshorten);
    const len2 = Math.hypot(nx, ny, nz);
    return { x: nx / len2, y: ny / len2, z: nz / len2 };
  }

  // One reliable normal for a kiss: sample a few raw normal-map pixels spread inside its footprint,
  // throw away outliers (tiny details, noise) by distance from the medoid, average the rest.
  // hw/hh are the kiss's half-width/half-height in u/v units; spin rotates the footprint.
  function footprintNormal(u, v, hw, hh, spin) {
    const { samples, ring, outlierDeg } = CONFIG.warp.footprint;
    const cs = Math.cos(spin), sn = Math.sin(spin);
    const cx = u * (w - 1), cy = v * (h - 1);
    const ns = [];
    for (let i = 0; i < samples; i++) {
      const ang = (2 * Math.PI * (i + 0.5)) / samples;
      const a = Math.cos(ang) * ring * hw * w, b = Math.sin(ang) * ring * hh * h;
      const x = clamp(Math.round(cx + a * cs - b * sn), 0, w - 1);
      const y = clamp(Math.round(cy + a * sn + b * cs), 0, h - 1);
      const p = (y * w + x) * 3;
      const len = Math.hypot(decoded[p], decoded[p + 1], decoded[p + 2]);
      if (len > 1e-3) ns.push([decoded[p] / len, decoded[p + 1] / len, decoded[p + 2] / len]);
    }
    if (!ns.length) return { x: 0, y: 0, z: 1, kept: 0, total: samples };
    const angle = (p, q) => Math.acos(clamp(p[0] * q[0] + p[1] * q[1] + p[2] * q[2], -1, 1));
    let medoid = ns[0], best = Infinity;
    for (const p of ns) {
      const total = ns.reduce((acc, q) => acc + angle(p, q), 0);
      if (total < best) { best = total; medoid = p; }
    }
    const limit = (outlierDeg * Math.PI) / 180;
    const kept = ns.filter((p) => angle(p, medoid) <= limit);
    let nx = 0, ny = 0, nz = 0;
    for (const p of kept) { nx += p[0]; ny += p[1]; nz += p[2]; }
    const len = Math.hypot(nx, ny, nz) || 1;
    nz = Math.max(nz / len, CONFIG.normal.minForeshorten);
    nx /= len; ny /= len;
    const len2 = Math.hypot(nx, ny, nz);
    return { x: nx / len2, y: ny / len2, z: nz / len2, kept: kept.length, total: samples };
  }

  // Which way the surface around (u, v) faces sideways: the mean x of the unit normals over a disc of
  // radius radiusFrac (fraction of image width). +1 = facing right, -1 = facing left, ~0 = flat on / mixed.
  // Averaging over a wide disc keeps tiny details from swinging it.
  function facingAt(u, v, radiusFrac) {
    let sum = 0, count = 0;
    for (let j = -3; j <= 3; j++) {
      for (let i = -3; i <= 3; i++) {
        if (i * i + j * j > 9.5) continue;
        sum += normalAt(u + (i / 3) * radiusFrac, v + (j / 3) * radiusFrac * (w / h)).x;
        count++;
      }
    }
    return sum / count;
  }

  function surfaceAt(u, v) {
    const cx = clamp(Math.round(u * (w - 1)), 0, w - 1);
    const cy = clamp(Math.round(v * (h - 1)), 0, h - 1);
    let d = 0, raw = 0, count = 0;
    for (let y = Math.max(0, cy - radius); y <= Math.min(h - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(w - 1, cx + radius); x++) {
        const p = (y * w + x) * 4;
        d += depthAt(p);
        raw += depth.data[p];
        count++;
      }
    }
    d /= count;
    raw /= count * 255;
    // Blank if the exact pixel or the neighbourhood is (near) black, whatever the near/far convention.
    const blank = depth.data[(cy * w + cx) * 4] / 255 <= blackCutoff || raw <= blackCutoff;
    const masked = mask ? mask.data[(cy * w + cx) * 4] < 128 : false; // black (off the car) = no kiss
    const n = normalAt(u, v);
    return {
      scale: clamp(Math.pow(Math.max(d, 0.02) / median, strength), scaleMin, scaleMax), // distance from camera -> size
      blank,
      masked,
      depth: d,
      normal: n,
      theta: Math.atan2(n.y, n.x), // direction the surface leans, in screen space (debug readout)
      f: n.z,                      // how squarely it faces the camera (debug readout)
    };
  }

  return { width: w, height: h, updateAO, surfaceAt, normalAt, footprintNormal, facingAt, depthCanvas: depth.canvas, normalCanvas: normal.canvas, maskCanvas: mask && mask.canvas, maskAlphaCanvas: maskAlpha, aoCanvas, median, nearDepth };
}

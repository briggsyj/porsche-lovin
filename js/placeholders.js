// Procedural stand-ins used when the real assets aren't in /assets yet.
// The scene's colour, depth and normal maps are all derived from one height field, so they agree.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function makeScene(w = 960, h = 600) {
  const n = w * h;
  const height = new Float32Array(n);
  const region = new Uint8Array(n); // 0 sky, 1 ground, 2 body, 3 glass, 4 tyre

  const ellipse = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
  const wheelRx = 0.06 * h / w;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, i = y * w + x;
      let d, r = 0;
      if (v < 0.5) { d = 0.08; r = 0; } else { d = 0.1 + 0.7 * (v - 0.5) * (v - 0.5) * 2 + 0.2 * (v - 0.5); r = 1; }

      for (const cx of [0.3, 0.7]) {
        const e = ellipse(u, v, cx, 0.74, wheelRx, 0.06);
        if (e < 1) { const hh = 0.45 + 0.2 * Math.sqrt(1 - e); if (hh > d) { d = hh; r = 4; } }
      }
      const body = ellipse(u, v, 0.5, 0.62, 0.36, 0.17);
      if (body < 1) { const hh = 0.5 + 0.45 * Math.sqrt(1 - body); if (hh > d) { d = hh; r = 2; } }
      const cabin = ellipse(u, v, 0.5, 0.47, 0.17, 0.09);
      if (cabin < 1) { const hh = 0.7 + 0.28 * Math.sqrt(1 - cabin); if (hh > d) { d = hh; r = 3; } }

      height[i] = d;
      region[i] = r;
    }
  }

  const car = canvasOf(w, h), depth = canvasOf(w, h), normal = canvasOf(w, h);
  const carData = car.getContext('2d').createImageData(w, h);
  const depthData = depth.getContext('2d').createImageData(w, h);
  const normalData = normal.getContext('2d').createImageData(w, h);

  const S = 600; // slope exaggeration so the dome produces meaningful tilts
  const L = (() => { const v = [-0.4, 0.6, 0.7]; const m = Math.hypot(...v); return v.map((c) => c / m); })();
  const base = [[70, 120, 190], [95, 95, 100], [58, 143, 183], [25, 40, 60], [20, 20, 22]];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, p = i * 4;
      const xl = height[y * w + Math.max(0, x - 1)], xr = height[y * w + Math.min(w - 1, x + 1)];
      const yu = height[Math.max(0, y - 1) * w + x], yd = height[Math.min(h - 1, y + 1) * w + x];
      // OpenGL-style view-space normal: x right, y up, z toward camera.
      let nx = -((xr - xl) / 2) * S, ny = ((yd - yu) / 2) * S, nz = 1;
      const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;

      const shade = 0.35 + 0.65 * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const col = base[region[i]];
      carData.data[p] = col[0] * shade;
      carData.data[p + 1] = col[1] * shade;
      carData.data[p + 2] = col[2] * shade;
      carData.data[p + 3] = 255;

      const g = clamp(height[i], 0, 1) * 255;
      depthData.data[p] = depthData.data[p + 1] = depthData.data[p + 2] = g;
      depthData.data[p + 3] = 255;

      normalData.data[p] = (nx * 0.5 + 0.5) * 255;
      normalData.data[p + 1] = (ny * 0.5 + 0.5) * 255;
      normalData.data[p + 2] = (nz * 0.5 + 0.5) * 255;
      normalData.data[p + 3] = 255;
    }
  }
  car.getContext('2d').putImageData(carData, 0, 0);
  depth.getContext('2d').putImageData(depthData, 0, 0);
  normal.getContext('2d').putImageData(normalData, 0, 0);

  const ctx = car.getContext('2d');
  ctx.font = `700 ${Math.round(h * 0.05)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgb(255 255 255 / .8)';
  ctx.fillText('PLACEHOLDER CAR', w / 2, h * 0.12);

  return { car, depth, normal };
}

export function makePerson(w = 300, h = 400) {
  const c = canvasOf(w, h), g = c.getContext('2d');
  g.fillStyle = '#2d4a7a';
  g.beginPath(); g.ellipse(w / 2, h + 20, 130, 120, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#e8b896';
  g.fillRect(w / 2 - 22, h * 0.55, 44, 60);
  g.beginPath(); g.ellipse(w / 2, h * 0.4, 78, 96, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3b2a20';
  g.beginPath(); g.ellipse(w / 2, h * 0.3, 82, 70, 0, Math.PI, 0); g.fill();
  g.strokeStyle = '#3b2a20'; g.lineWidth = 4; g.lineCap = 'round';
  for (const dx of [-30, 30]) { g.beginPath(); g.arc(w / 2 + dx, h * 0.38, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  g.fillStyle = '#c4243a';
  g.beginPath(); g.ellipse(w / 2, h * 0.5, 17, 11, 0, 0, Math.PI * 2); g.fill(); // puckered lips at y=0.5, matching person.anchor
  g.fillStyle = '#7a1020';
  g.beginPath(); g.ellipse(w / 2, h * 0.5, 6, 4, 0, 0, Math.PI * 2); g.fill();
  return c;
}

export function makeKiss(w = 160, h = 110) {
  const c = canvasOf(w, h), g = c.getContext('2d');
  g.fillStyle = '#d6203c';
  g.beginPath();
  g.moveTo(10, 58);
  g.bezierCurveTo(38, 14, 64, 16, 80, 36);
  g.bezierCurveTo(96, 16, 122, 14, 150, 58);
  g.bezierCurveTo(112, 68, 48, 68, 10, 58);
  g.fill();
  g.beginPath();
  g.moveTo(10, 58);
  g.bezierCurveTo(48, 68, 112, 68, 150, 58);
  g.bezierCurveTo(124, 104, 36, 104, 10, 58);
  g.fill();
  g.strokeStyle = '#7a0f20'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(10, 58); g.bezierCurveTo(48, 68, 112, 68, 150, 58); g.stroke();
  g.fillStyle = 'rgb(255 255 255 / .35)';
  g.beginPath(); g.ellipse(80, 82, 26, 7, 0, 0, Math.PI * 2); g.fill();
  return c;
}

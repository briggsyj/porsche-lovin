import { CONFIG } from './config.js';

// The person image that tracks the pointer, lips on the cursor.
export function createFollower({ el, personImg }) {
  const body = el.querySelector('.body');
  const img = el.querySelector('img.main');
  const strips = el.querySelector('.strips');
  img.src = personImg.src;
  let ax = 0, ay = 0, x = -9999, y = -9999, raf = 0, hideTimer = 0;
  let scale = 1, scaleTarget = 1;

  function layout() {
    const h = Math.min((window.innerHeight * CONFIG.person.heightVh) / 100, CONFIG.person.maxHeightPx);
    const w = (h * personImg.naturalWidth) / personImg.naturalHeight;
    img.style.height = `${h}px`;
    img.style.width = `${w}px`;
    ax = w * CONFIG.person.anchor.x;
    ay = h * CONFIG.person.anchor.y;
    el.style.transformOrigin = `${ax}px ${ay}px`; // scale and flip about the lips so they stay on the cursor
    body.style.transformOrigin = `${ax}px ${ay}px`;
    buildStrips(w, h);
    paint();
  }

  // The bend: slice the image into bands across the head-to-feet diagonal (head top-right, feet
  // bottom-left). Each band tilts about the lips by the local lean, which falls off logarithmically
  // from head to feet; depth is the running sum of those slopes, pinned to 0 at the feet so the
  // feet never grow. The --k variable (0 at rest, 1 on click) scales every band's transform.
  function buildStrips(w, h) {
    const { peakDeg, falloff, perspective, strips: N } = CONFIG.person.lean;
    const S = Math.SQRT1_2;
    const t = (px, py) => (px - ax) * -S + (py - ay) * S; // signed distance from the lips toward the feet
    const tMin = t(w, 0), tMax = t(0, h), span = tMax - tMin, dt = span / N;
    const slope = (s) => ((peakDeg * Math.PI) / 180) * (1 - Math.log(1 + falloff * s) / Math.log(1 + falloff));

    const bands = [];
    let zEnd = 0; // depth at the feet-side edge of the band being processed
    for (let i = N - 1; i >= 0; i--) {
      const phi = slope((i + 0.5) / N);
      const tc = tMin + (i + 0.5) * dt;
      const zc = zEnd - (Math.tan(phi) * dt) / 2;
      zEnd -= Math.tan(phi) * dt;
      bands[i] = { phi, z: zc - tc * Math.sin(phi) };
    }

    strips.replaceChildren();
    const R = w + h;
    const pt = (tt, side) => `${ax - S * tt + S * R * side}px ${ay + S * tt + S * R * side}px`;
    for (let i = 0; i < N; i++) {
      const t0 = tMin + i * dt - (i === 0 ? 3 : 1.5), t1 = tMin + (i + 1) * dt + (i === N - 1 ? 3 : 1.5); // slight overlap hides seams
      const b = document.createElement('img');
      b.src = personImg.src;
      b.alt = '';
      b.draggable = false;
      b.style.width = `${w}px`;
      b.style.height = `${h}px`;
      b.style.transformOrigin = `${ax}px ${ay}px`;
      b.style.clipPath = `polygon(${pt(t0, -1)}, ${pt(t0, 1)}, ${pt(t1, 1)}, ${pt(t1, -1)})`;
      b.style.transform = `perspective(${perspective}px) translate3d(0, 0, calc(var(--k) * ${bands[i].z.toFixed(2)}px)) rotate3d(1, 1, 0, calc(var(--k) * ${((bands[i].phi * 180) / Math.PI).toFixed(3)}deg))`;
      strips.appendChild(b);
    }
  }

  function paint() {
    raf = 0;
    scale += (scaleTarget - scale) * 0.25; // ease so depth changes don't make the person jump
    if (Math.abs(scaleTarget - scale) < 0.002) scale = scaleTarget;
    el.style.transform = `translate3d(${x - ax}px, ${y - ay}px, 0) scale(${scale})`;
    if (scale !== scaleTarget) raf = requestAnimationFrame(paint);
  }

  window.addEventListener('resize', layout);
  layout();

  return {
    move(cx, cy) { x = cx; y = cy; if (!raf) raf = requestAnimationFrame(paint); },
    // Nearer parts of the scene (higher depth) -> bigger person, as if they move toward/away from the camera.
    setDepth(depth, nearDepth) {
      const { min, strength } = CONFIG.person.depthScale;
      scaleTarget = Math.min(1, Math.max(min, Math.pow(depth / nearDepth, strength)));
      if (!raf) raf = requestAnimationFrame(paint);
    },
    setFlipped(flipped) { body.classList.toggle('flipped', flipped); },
    show() { clearTimeout(hideTimer); el.classList.add('on'); },
    hide(delay = 0) { clearTimeout(hideTimer); hideTimer = setTimeout(() => el.classList.remove('on'), delay); },
    pulse() { el.classList.add('kiss'); setTimeout(() => el.classList.remove('kiss'), 140); },
  };
}

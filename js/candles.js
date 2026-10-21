// Candles grouped in a few uneven clusters along the bottom edge, the way you'd scatter them at home
// to set a mood: mixed heights and types, some tucked slightly behind others, each flickering on its own beat.
// Layout is seeded, so it looks the same every load; it's rebuilt when the window width changes.
export function createCandles(el) {
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function build() {
    const r = rng(11);
    const W = window.innerWidth;
    const clusters = Math.min(4, Math.max(2, Math.round(W / 420)));
    el.replaceChildren();
    let n = 0;
    for (let c = 0; c < clusters; c++) {
      const centre = W * ((c + 0.5) / clusters) + (r() - 0.5) * W * 0.1;
      const count = 2 + Math.floor(r() * 3); // 2-4 per cluster
      for (let i = 0; i < count; i++) {
        const roll = r();
        const type = i === 0 ? 'taper' : roll < 0.4 ? 'taper' : roll < 0.7 ? 'pillar' : 'tealight';
        const y = Math.round(r() * 10); // a little further back = a little higher, smaller and behind
        const candle = document.createElement('div');
        candle.className = `candle ${type}`;
        candle.style.setProperty('--x', `${Math.round(centre + (i - (count - 1) / 2) * 34 + (r() - 0.5) * 24)}px`);
        candle.style.setProperty('--y', `${y}px`);
        candle.style.setProperty('--s', (1 - y * 0.012).toFixed(3));
        candle.style.zIndex = String(20 - y);
        if (type === 'taper') { candle.style.setProperty('--h', `${22 + Math.round(r() * 22)}px`); candle.style.setProperty('--w', `${14 + Math.round(r() * 4)}px`); }
        if (type === 'pillar') { candle.style.setProperty('--h', `${14 + Math.round(r() * 16)}px`); candle.style.setProperty('--w', `${24 + Math.round(r() * 6)}px`); }
        if (type === 'tealight') candle.style.setProperty('--fs', '0.7');
        else candle.style.setProperty('--fs', (0.85 + r() * 0.25).toFixed(2));
        candle.style.setProperty('--delay', `${-(r() * 1.4).toFixed(2)}s`);
        candle.style.setProperty('--speed', `${(1.1 + r() * 0.7).toFixed(2)}s`);
        candle.innerHTML = '<div class="fire"><div class="flame"></div></div><div class="wick"></div><div class="wax"></div><div class="dish"></div>';
        el.appendChild(candle);
        n++;
      }
    }
    return n;
  }

  let width = window.innerWidth, timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (window.innerWidth !== width) { width = window.innerWidth; build(); } }, 150);
  });
  build();
}

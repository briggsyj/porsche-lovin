import { CONFIG } from './config.js';
import { synthJazz, synthKiss } from './synth.js';

// Web Audio engine. The context is created on the first user gesture (browser autoplay rules),
// and the jazz loop starts silent so the slider can fade it in.
export function createAudio() {
  let ctx = null, master = null, jazzGain = null;
  let jazzBuf = null, kissBufs = [], lastKiss = -1;
  let volume = 0;

  async function decode(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  async function load(url, fallback) {
    const buf = await decode(url);
    if (buf) return buf;
    console.info(`[audio] ${url} not available, using synthesised stand-in`);
    return fallback(ctx);
  }

  // Whichever kiss files load are used; if none do, fall back to a synthesised smooch.
  async function loadKisses() {
    const bufs = (await Promise.all(CONFIG.assets.kissSounds.map(decode))).filter(Boolean);
    if (bufs.length) return bufs;
    console.info('[audio] no kiss sounds found, using synthesised stand-in');
    return [synthKiss(ctx)];
  }

  function startJazz() {
    const src = ctx.createBufferSource();
    src.buffer = jazzBuf;
    src.loop = true;
    src.connect(jazzGain);
    src.start();
  }

  function applyVolume() {
    if (jazzGain) jazzGain.gain.setTargetAtTime(volume * volume * 0.9, ctx.currentTime, 0.05);
  }

  return {
    unlock() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      ctx.resume();
      master = ctx.createGain();
      master.connect(ctx.destination);
      jazzGain = ctx.createGain();
      jazzGain.gain.value = 0;
      jazzGain.connect(master);
      Promise.all([load(CONFIG.assets.jazz, synthJazz), loadKisses()]).then(([j, k]) => {
        jazzBuf = j;
        kissBufs = k;
        startJazz();
        applyVolume();
      });
    },
    setJazzVolume(v) { volume = v; applyVolume(); },
    playKiss() {
      if (!ctx || !kissBufs.length) return;
      // Random pick, never the same one twice in a row.
      let i = Math.floor(Math.random() * kissBufs.length);
      if (kissBufs.length > 1 && i === lastKiss) i = (i + 1) % kissBufs.length;
      lastKiss = i;
      const src = ctx.createBufferSource();
      src.buffer = kissBufs[i];
      src.playbackRate.value = 0.95 + Math.random() * 0.1;
      src.connect(master);
      src.start();
    },
  };
}

// Synthesised stand-ins for the jazz and kiss audio, used when those files aren't present.

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

export function synthJazz(ctx) {
  const sr = ctx.sampleRate;
  const bpm = 104, beat = 60 / bpm;
  // [bass root, minor?, comping voicing]
  const bars = [
    [38, true, [53, 57, 60, 64]],   // Dm9
    [43, false, [53, 59, 62, 64]],  // G13
    [36, false, [52, 55, 59, 62]],  // Cmaj9
    [45, false, [55, 61, 64, 67]],  // A7
    [38, true, [53, 57, 60, 64]],
    [43, false, [53, 59, 62, 64]],
    [36, false, [52, 55, 59, 62]],
    [36, false, [52, 55, 59, 62]],
  ];
  const len = Math.round(sr * beat * 4 * bars.length);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);

  // Notes wrap past the end so the loop is seamless.
  const tone = (start, dur, freq, amp, decay, harmonics) => {
    const s0 = Math.round(start * sr), n = Math.round(dur * sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.006) * Math.exp(-t * decay);
      let v = 0;
      for (let h = 0; h < harmonics.length; h++) v += harmonics[h] * Math.sin(2 * Math.PI * freq * (h + 1) * t);
      out[(s0 + i) % len] += v * env * amp;
    }
  };
  const noise = (start, dur, amp, decay) => {
    const s0 = Math.round(start * sr), n = Math.round(dur * sr);
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 2 - 1;
      out[(s0 + i) % len] += (x - prev) * Math.exp(-(i / sr) * decay) * amp; // crude high-pass
      prev = x;
    }
  };

  bars.forEach(([root, minor, voicing], b) => {
    const t0 = b * beat * 4;
    const next = bars[(b + 1) % bars.length][0];
    const walk = [root, root + (minor ? 3 : 4), root + 7, next + (next > root ? -1 : 1)];
    walk.forEach((m, i) => tone(t0 + i * beat, beat * 0.95, midi(m), 0.32, 3, [1, 0.5, 0.15]));
    for (const at of [0, 1.67]) {
      voicing.forEach((m) => tone(t0 + at * beat, beat * 0.9, midi(m), 0.07, 4.5, [1, 0.4, 0.15]));
    }
    for (const at of [0, 1, 1.67, 2, 3, 3.67]) noise(t0 + at * beat, 0.14, 0.09, 30);   // ride
    for (const at of [1, 3]) noise(t0 + at * beat, 0.05, 0.12, 80);                      // hat chick
  });

  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  for (let i = 0; i < len; i++) out[i] *= 0.7 / (peak || 1);
  return buf;
}

export function synthKiss(ctx) {
  const sr = ctx.sampleRate;
  const len = Math.round(sr * 0.24);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    phase += (2 * Math.PI * (260 + 900 * Math.exp(-t * 22))) / sr;
    let v = Math.sin(phase) * Math.exp(-t * 16) * (1 - Math.exp(-t * 600)) * 0.6;
    if (t < 0.03) v += (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.35;
    out[i] = v;
  }
  return buf;
}

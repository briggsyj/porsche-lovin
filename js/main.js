import { CONFIG } from './config.js';
import { loadImage, imageFromCanvas } from './assets.js';
import { makeScene, makePerson, makeKiss } from './placeholders.js';
import { createSurface } from './surface.js';
import { createStage } from './stage.js';
import { createFollower } from './follower.js';
import { createAudio } from './audio.js';
import { runIntro } from './intro.js';
import { createSpotlight } from './spotlight.js';
import { createCandles } from './candles.js';
import { createShare } from './share.js';
import { createDebug } from './debug.js';

const params = new URLSearchParams(location.search);
const root = document.documentElement;
const setLight = (l) => root.style.setProperty('--light', String(l));

// Real files from /assets when present; procedural stand-ins otherwise.
async function loadAssets() {
  const A = CONFIG.assets;
  let [car, depth, normal, person, kiss, mask] = await Promise.all([A.car, A.depth, A.normal, A.person, A.kiss, A.mask].map(loadImage));
  if (!(car && depth && normal)) {
    console.info('[assets] car/depth/normal not all found, using placeholder scene');
    const s = makeScene();
    [car, depth, normal] = await Promise.all([s.car, s.depth, s.normal].map(imageFromCanvas));
    mask = null; // the real mask doesn't match the placeholder scene
  }
  if (!person) person = await imageFromCanvas(makePerson());
  if (!kiss) kiss = await imageFromCanvas(makeKiss());
  if (!mask) console.info('[assets] no mask found, kisses allowed anywhere (subject to depth)');
  return { car, depth, normal, person, kiss, mask };
}

async function boot() {
  createCandles(document.querySelector('.candles'));
  const audio = createAudio();
  const modal = document.getElementById('modal');
  let stage, follower, surface, spotlight;

  // Build the stage as soon as assets are ready so the car is visible behind the modal.
  const ready = loadAssets().then((a) => {
    surface = createSurface(a.car, a.depth, a.normal, a.mask);
    follower = createFollower({ el: document.getElementById('follower'), personImg: a.person });
    stage = createStage({
      canvas: document.getElementById('stage'),
      carImg: a.car,
      kissImg: a.kiss,
      surface,
      onKiss() { audio.playKiss(); follower.pulse(); },
      onFit() { if (spotlight) spotlight.layout(); },
    });
    spotlight = createSpotlight({ el: document.querySelector('.spot'), canvas: document.getElementById('stage'), maskAlphaCanvas: surface.maskAlphaCanvas });
    if (params.get('debug') === '1') createDebug({ stage, surface });
  });

  if (params.get('skip') === '1') {
    modal.hidden = true;
    setLight(0.1);
    window.addEventListener('pointerdown', () => { audio.unlock(); audio.setJazzVolume(0.8); }, { once: true });
  } else {
    await runIntro({ audio, setLight });
  }
  await ready;

  stage.enable();
  createShare({ getCount: () => stage.kissCount });
  document.body.classList.add('play');

  // The person faces the way the surface under the cursor faces. The normal map is averaged over a wide
  // area, smoothed over time, and given a dead zone and dwell time, so tiny details don't make them flip-flop.
  let flipped = false, facing = 0, lastFlip = 0, lastSample = performance.now();
  const track = (e) => {
    const uv = stage.uvAt(e.clientX, e.clientY);
    if (uv) {
      follower.setDepth(surface.surfaceAt(uv.u, uv.v).depth, surface.nearDepth);
      const { radiusFrac, smoothMs, threshold, dwellMs } = CONFIG.person.facing;
      const now = performance.now();
      const head = follower.headAt(e.clientX, e.clientY);
      const headUv = stage.uvAt(head.x, head.y) || uv; // head can hang off the image edge: fall back to the lips
      facing += (surface.facingAt(headUv.u, headUv.v, radiusFrac) - facing) * (1 - Math.exp(-(now - lastSample) / smoothMs));
      lastSample = now;
      if (now - lastFlip > dwellMs && ((!flipped && facing > threshold) || (flipped && facing < -threshold))) {
        flipped = !flipped;
        lastFlip = now;
        follower.setFlipped(flipped);
      }
    } else lastSample = performance.now(); // off the image: keep the last size and facing
    follower.move(e.clientX, e.clientY);
    follower.show();
  };
  window.addEventListener('pointermove', track);
  window.addEventListener('pointerdown', track);
  const lift = (e) => { if (e.pointerType === 'touch') follower.hide(350); };
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', lift);
  document.documentElement.addEventListener('mouseleave', () => follower.hide());
}

boot();

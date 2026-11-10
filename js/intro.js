import { CONFIG } from './config.js';
import { createKnob } from './knob.js';
import { createSlider } from './slider.js';

// Modal flow: dim the lights (knob), then turn up the jazz (fader). Resolves when the modal is gone.
export function runIntro({ audio, setLight }) {
  return new Promise((resolve) => {
    const $ = (s) => document.querySelector(s);
    const modal = $('#modal'), stepLights = $('#step-lights'), stepJazz = $('#step-jazz');
    const { knobMin, knobMax, knobMaxSpeed, doneBelow } = CONFIG.lights;
    let lightsDone = false, jazzDone = false;

    const ticks = $('#ticks');
    for (let i = 0; i <= 20; i++) {
      const t = document.createElement('div');
      t.className = i % 5 === 0 ? 'tick major' : 'tick';
      t.style.transform = `rotate(${knobMin + (i * (knobMax - knobMin)) / 20}deg)`;
      ticks.appendChild(t);
    }

    const knobEl = $('#knob');
    const unlock = () => audio.unlock();
    knobEl.addEventListener('pointerdown', unlock, { once: true });
    knobEl.addEventListener('keydown', unlock, { once: true });

    const knob = createKnob(knobEl, {
      min: knobMin, max: knobMax, start: knobMax, maxSpeed: knobMaxSpeed, // starts at the right (bright), turns left to dim
      onChange(angle) {
        const level = (angle - knobMin) / (knobMax - knobMin);
        setLight(level);
        if (!lightsDone && level <= doneBelow) {
          lightsDone = true;
          knob.disable();
          setTimeout(toJazz, 500);
        }
      },
    });

    let level = 0, raf = 0;
    const needles = [$('#needleL'), $('#needleR')];
    function animateNeedles(t) {
      needles.forEach((n, i) => {
        const wobble = Math.sin(t / 90 + i * 2) * 7 * level + Math.sin(t / 37 + i) * 3 * level;
        n.style.transform = `rotate(${-55 + level * 95 + wobble}deg)`;
      });
      raf = requestAnimationFrame(animateNeedles);
    }

    function toJazz() {
      stepLights.hidden = true;
      stepJazz.hidden = false;
      raf = requestAnimationFrame(animateNeedles);
      const slider = createSlider($('#fader'), {
        onChange(v) {
          level = v;
          audio.setJazzVolume(v);
          if (!jazzDone && v >= CONFIG.jazz.doneAbove) {
            jazzDone = true;
            slider.disable();
            setTimeout(close, 700);
          }
        },
      });
    }

    function close() {
      modal.classList.add('closing');
      setTimeout(() => {
        cancelAnimationFrame(raf);
        modal.hidden = true;
        resolve();
      }, 650);
    }
  });
}

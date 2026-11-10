import { CONFIG } from './config.js';

// Places the spotlight element over the stage canvas and shapes it with a feathered copy of the car mask.
export function createSpotlight({ el, canvas, maskAlphaCanvas }) {
  let maskUrl;
  if (maskAlphaCanvas) {
    const { grow, feather } = CONFIG.spotlight;
    const shrink = (src, width) => {
      while (src.width > width) {
        const c = document.createElement('canvas');
        c.width = Math.max(width, src.width >> 1);
        c.height = Math.max(1, Math.round((src.height * c.width) / src.width));
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(src, 0, 0, c.width, c.height);
        src = c;
      }
      return src;
    };
    // 1. Small copy of the car mask. 2. Grow it outward (union of copies shifted around a ring) so the
    // light reaches past the car's outline. 3. Shrink further; the browser scales that back up smoothly,
    // which feathers the edge, so the car edge sits well inside the lit area and falls off outside it.
    const base = shrink(maskAlphaCanvas, 128);
    const grown = document.createElement('canvas');
    grown.width = base.width;
    grown.height = base.height;
    const g = grown.getContext('2d');
    g.drawImage(base, 0, 0);
    for (const r of [0.5, 1]) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * 2 * Math.PI, d = r * grow * base.width;
        g.drawImage(base, Math.cos(a) * d, Math.sin(a) * d);
      }
    }
    const soft = shrink(grown, Math.max(8, Math.round(1 / feather)));
    maskUrl = `url(${soft.toDataURL('image/png')})`;
  } else {
    maskUrl = 'radial-gradient(ellipse 50% 45% at 50% 55%, #000 30%, transparent 100%)'; // no mask: a soft oval instead
  }
  el.style.maskImage = el.style.webkitMaskImage = maskUrl;

  function layout() {
    const r = canvas.getBoundingClientRect();
    Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }
  window.addEventListener('resize', layout);
  layout();
  return { layout };
}

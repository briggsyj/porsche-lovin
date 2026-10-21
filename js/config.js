// Tunables. Asset paths are relative so the site works under /<repo>/ on GitHub Pages.
export const CONFIG = {
  assets: {
    car: './assets/car.jpg',
    depth: './assets/car_depth.jpg',
    normal: './assets/car_normal.jpg',
    mask: './assets/car_mask.jpg',   // white = kisses allowed, black = not allowed. Optional
    person: './assets/person.png',
    kiss: './assets/kiss.png',
    jazz: './assets/jazz.mp3',
    kissSounds: ['./assets/kiss_1.wav', './assets/kiss_2.wav', './assets/kiss_3.wav'], // one is picked at random per kiss
  },
  lights: {
    doneBelow: 0,         // step 1 completes when brightness is at or below this (0 = knob fully turned)
    knobMin: -135,        // degrees; knob sweeps 270 degrees, from bright (knobMax, right) to dim (knobMin, left)
    knobMax: 135,
    knobMaxSpeed: 360,    // degrees per second
  },
  jazz: { doneAbove: 1 },
  kiss: {
    widthFrac: 0.025,     // base kiss width as a fraction of the image width
    spinMaxDeg: 40,       // random in-surface rotation, +/- this
    blend: 0.55,          // 0-1: how much of the car's light/reflections shows through the kiss (0 = flat sticker)
  },
  depth: {
    nearIsWhite: true,
    strength: 1,          // exponent on the size ratio; >1 exaggerates, <1 softens
    scaleMin: 0.25,
    scaleMax: 2.2,
    blackCutoff: 0.05,    // no kiss where the depth map is this close to black (0-1)
  },
  normal: {
    openGL: true,         // green = up. Set false for DirectX-style maps
    minForeshorten: 0.25, // stops grazing surfaces squashing the kiss to nothing
  },
  sampleRadiusFrac: 0.006, // depth sampling window radius, fraction of map width
  warp: {
    cols: 14,             // decal mesh resolution
    rows: 12,
    steps: 4,             // integration steps per vertex when following the surface
    footprint: {          // each kiss is angled by a robust average of normal-map pixels sampled inside its footprint
      samples: 8,
      ring: 0.6,          // sample ring radius, as a fraction of the kiss's half-size (keeps samples inside the kiss)
      outlierDeg: 20,     // samples further than this from the median normal are discarded
    },
    curvature: 0,         // 0 = kiss is one flat patch at the robust normal; up to 1 = also follows the fine-grained local normal
    smoothFrac: 0.008,    // normal-map blur radius (fraction of map width); higher = calmer wrap over rough surfaces like gravel
    supersample: 2,       // anti-aliasing for the warped edge
  },
  person: {
    heightVh: 34.8,         // height at the nearest depth in the scene, i.e. the largest the person gets
    maxHeightPx: 426,
    depthScale: {
      min: 0.3,           // smallest fraction of full size, for the furthest parts of the scene
      strength: 1,        // exponent on depth/nearest-depth; >1 shrinks them faster with distance
    },
    lean: {                     // on click the person bends: head (top-right) leans away from the viewer, easing off toward the feet
      peakDeg: 22,              // lean at the head end
      falloff: 6,               // log curve steepness: higher = lean is concentrated nearer the head
      perspective: 600,         // px; lower = stronger 3D
      strips: 16,               // bend smoothness
    },
    anchor: { x: 0.9, y: 0.18 }, // where the lips sit in person.png (0-1); this lands on the cursor
  },
};

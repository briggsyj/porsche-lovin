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
    ao: 0.6,              // 0-1: how strongly depth-based occlusion shading darkens a kiss in creases and recesses
    multiply: 0.5,        // 0-1: how much the car's own light/shade is multiplied into the kiss, so it sits in the paint rather than on top of it
    blend: 0.55,          // 0-1: how much of the car's light/reflections shows through the kiss (0 = flat sticker)
  },
  depth: {
    nearIsWhite: true,
    strength: 1.5,        // exponent on the size ratio; >1 exaggerates, <1 softens
    scaleMin: 0.15,
    scaleMax: 2.2,
    blackCutoff: 0.05,    // no kiss where the depth map is this close to black (0-1)
  },
  normal: {
    openGL: true,         // green = up. Set false for DirectX-style maps
    minForeshorten: 0.12, // floor on how edge-on a surface can read (limits the slopes integrated for the decal)
  },
  spotlight: {
    grow: 0.07,           // how far the light reaches past the car's outline, as a fraction of the image width
    feather: 0.07,        // softness of the falloff, as a fraction of the image width
  },
  ao: {                 // depth-based ambient occlusion shading on kisses
    noiseFrac: 0.006,     // depth is smoothed this much first so its fine speckle doesn't read as geometry
    smallFrac: 0.02,      // tight-crease scale (fraction of image width)
    largeFrac: 0.05,      // broader-recess scale
    gain: [16, 12],       // how strongly depth differences at each scale read as occlusion
  },
  sampleRadiusFrac: 0.006, // depth sampling window radius, fraction of map width
  warp: {
    reach: 1.4,           // how far past the kiss's size the surface is read, so the decal has room to stretch
    fade: [0.15, 0.5],    // decal fades out where the surface turns away from it (cos of the angle: fully gone below the first, full above the second)
    planeLimit: 0.6,      // decal fades where the surface is this far (in kiss sizes) in front of/behind its plane, i.e. a different layer
    footprint: {          // the decal plane is set by a robust average of normal-map pixels sampled inside the kiss's footprint
      samples: 8,
      ring: 0.6,          // sample ring radius, as a fraction of the kiss's half-size (keeps samples inside the kiss)
      outlierDeg: 20,     // samples further than this from the median normal are discarded
    },
    smoothFrac: 0.003,    // normal-map blur radius (fraction of map width); higher = calmer wrap over rough surfaces like gravel
    supersample: 2,       // anti-aliasing for the decal's edge
  },
  person: {
    heightVh: 34.8,         // height at the nearest depth in the scene, i.e. the largest the person gets
    maxHeightPx: 426,
    facing: {             // the person faces the way the surface under the cursor faces: right-facing surface -> they face left, and vice versa
      radiusFrac: 0.02,   // area of the normal map averaged around the kiss point (fraction of image width)
      smoothMs: 60,       // the averaged value is also smoothed a little over time
      threshold: 0.08,    // average sideways lean needed to switch (a small dead zone stops flip-flopping on flat areas)
      dwellMs: 120,       // minimum time between flips
    },
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

# Porsche Lovin'

Static site: no build step. Open it at `/?pw=g` (without `pw=g` you get the "magic word" splash).

## Run locally
Serve over HTTP (opening `index.html` via `file://` blocks reading the depth/normal maps):

    python3 -m http.server 8000   # then visit http://localhost:8000/?pw=g

Extra URL params: `debug=1` (depth/normal overlay + readout), `skip=1` (skip the intro modal).

## Assets
Drop these into `assets/`. Anything missing falls back to a generated placeholder.

| File | Notes |
|---|---|
| `car.jpg`, `car_depth.jpg`, `car_normal.jpg` | Must be identical size/crop. Depth: near = white. Normal: OpenGL (green up). All three are needed, or the placeholder scene is used. |
| `car_mask.jpg` | Optional, same size as the car. White = kisses allowed, black = not allowed. |
| `person.png` | Transparent PNG. Set the lips position in `js/config.js` (`person.anchor`). |
| `kiss.png` | Transparent PNG. |
| `jazz.mp3` | Loopable. |
| `kiss_1.wav`, `kiss_2.wav`, `kiss_3.wav` | Short smooches; one is picked at random per kiss. Paths are listed in `js/config.js` (`assets.kissSounds`). |

Tunables (knob speed, thresholds, depth/normal behaviour, kiss size) are in `js/config.js`.

## Deploy
Push to GitHub, then Settings → Pages → deploy from `main` / root. Visit `https://<user>.github.io/<repo>/?pw=g`.

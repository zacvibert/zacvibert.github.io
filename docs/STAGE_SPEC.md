# Stage spec — image-based stages

When `public/assets/stages/<id>/stage.json` exists, its image layers replace the
procedural stage. Otherwise the procedural sunset stage renders. The active
stage id is set in `src/main.ts` (`DEFAULT_STAGE`).

## Files

```
public/assets/stages/dockside/
├── stage.json
├── sky.png          # e.g. 800×200, delta 0.15
├── far.png          # skyline band, delta 0.35
├── main.png         # 1280×360 full stage painting, delta 1
└── lamp.png         # optional animated strip: frames side by side
```

## stage.json

```json
{
  "layers": [
    { "image": "sky.png",  "delta": 0.15 },
    { "image": "far.png",  "delta": 0.35, "y": 60 },
    { "image": "main.png", "delta": 1 },
    { "image": "lamp.png", "delta": 1, "x": 96, "y": 24, "frames": 3, "fps": 6 }
  ]
}
```

| Field | Meaning |
|---|---|
| `image` | PNG in the same folder |
| `delta` | parallax: 0 = fixed to camera, 1 = moves with the floor; far layers < 1 |
| `x`, `y` | placement (x in world space, y in screen space; default 0) |
| `frames` | animated strip: frame count, frames laid out horizontally in one PNG |
| `fps` | strip playback speed (default 8) |

Layers draw in list order (first = back). Engine facts the art must respect:
screen is 640×360, the stage scrolls across **1280×360** total, and the
fighters' feet line is **y = 320** — keep the strip below y≈300 clear of props.

## From an AI master image to these files

Deliver the max-res master (per PROMPT_PLAYBOOK.md Kit 2) into
`art-src/stages/<name>/refs/` — commit it via GitHub web UI (branch →
Add file → Upload files) or locally. Claude then does the conversion:
downscale/crop to 1280×360, palette quantize, slice sky/far/main layers,
cut animated elements (flicker, rain, lightning) into strips, write
stage.json, verify in-game, and log everything in ASSETS.md.

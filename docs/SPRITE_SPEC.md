# Sprite sheet spec — how art plugs into the engine

The engine already supports pixel sprites: drop files into
`public/assets/characters/<id>/` and matching animations replace the procedural
renderer automatically, one animation at a time. Nothing else changes — frame
data, hitboxes and gameplay stay exactly as they are.

## Files

```
public/assets/characters/fighter-zero/
├── sheet.png       # one grid image: columns = frames, rows = animations
├── sheet-alt.png   # optional P2 palette variant (same layout); P2 falls back to sheet.png
└── frames.json     # metadata, schema below
```

## frames.json schema

```json
{
  "cell": { "w": 160, "h": 160 },
  "anchor": { "x": 80, "y": 150 },
  "animations": {
    "idle":  { "row": 0, "frames": 6, "fps": 8 },
    "walkF": { "row": 1, "frames": 6, "fps": 10 },
    "5LP":   { "row": 2, "frames": 4, "sync": "move" },
    "hitstun": { "row": 3, "frames": 3, "fps": 12, "loop": false }
  }
}
```

| Field | Meaning |
|---|---|
| `cell` | fixed size of every grid cell (see ART_DIRECTION.md: 160×160) |
| `anchor` | the character's feet-centre inside a cell — same pixel in **every** frame, or the character slides |
| `row` | zero-based row in sheet.png |
| `frames` | frame count in that row, drawn left to right |
| `fps` | playback speed for state animations (default 10) |
| `loop` | default true; `false` holds the last frame (hit reactions, knockdown) |
| `sync: "move"` | attacks only: frames spread evenly across the move's startup+active+recovery, so animation timing always matches gameplay frame data |

## Animation keys

State keys: `idle, walkF, walkB, crouch, prejump, jump, hitstun, blockstun,
launched, knockdown, wakeup, throwHold, thrown`.
Attack keys = move ids from the character JSON: `5LP 5MP 5HP 5LK 5MK 5HK 2LK 2HK
jP jK QCFP DPP throw`.

Any key you don't provide keeps the procedural renderer — partial sheets are the
normal workflow, starting with `idle` only.

## Facing and drawing

Draw every frame **facing right**; the engine mirrors for the left side. Sprites
may overflow the gameplay boxes freely (smears, stretched limbs) — collision
comes from frame data, not pixels.

## Import checklist (every delivery)

1. PNG is indexed to the character's locked palette, transparent background.
2. Anchor verified: feet on the same pixel row/column in every frame.
3. `ASSETS.md` entry added (author, tool, licence).
4. Ask Claude: *"Wire in the new [anim] row for [character] and verify in-game"*
   — Claude updates frames.json, runs the browser check, and screenshots the
   result for approval.

## First milestone

One file, one row: a 6-frame idle in `sheet.png` + minimal `frames.json`. That
proves the entire pipeline (palette, anchor, export, import, in-game look)
before any serious frame count is invested.

## Path B — one image per animation (recommended when you make the art)

You don't need animation strips to get your character in the game. Supply **one
still PNG per animation** and run the ingest tool — it does background removal
(plain white/green backdrops become transparency), trimming, uniform scaling,
feet anchoring, sheet packing and frames.json generation automatically.

1. Create one full-body PNG per animation: same character, side view facing
   right, plain solid background, consistent size across images.
2. Name each file by its animation key (see list above): `idle.png`, `5HP.png`,
   `hitstun.png`, … `idle.png` is required — it sets the scale for everything.
   A multi-frame strip is `walkF@6.png` (6 equal frames side by side).
3. Put them in `art-src/<id>/poses/` — via GitHub web UI (branch → Add file →
   Upload files) or locally — and run `node tools/ingest-character.mjs <id>`
   (or ask Claude to run it and verify in-game).

Multi-frame animations: numbered files (`5HP_1.png`, `5HP_2.png`, `5HP_3.png`)
are assembled into one animation in order; a single pre-made strip works too
(`walkF@6.png`). See docs/PRODUCTION_PIPELINE.md for the full frame manifest.

### Scale calibration

`art-src/<id>/calibration.json` controls sizing:

```json
{ "charH": 165, "autoLevel": [], "poses": { "crouch": { "scale": 0.90, "dy": 0 } } }
```

- `charH` — the character's on-screen height in game pixels (165 ≈ correct human
  scale against the dockside stage; the screen is 360 tall).
- `poses[key].scale` — per-pose correction, needed when source art is drawn at
  inconsistent zoom. Judge these from the contact sheet.
- `poses[key].dx/dy` — nudge a pose that sits off its feet.
- Run with `--contact` to write `art-src/<id>/contact-sheet.png`: every pose
  feet-aligned with a head-height reference line, which makes scale errors
  obvious at a glance.

Starter set for a playable character: `idle`, `walkF`, `5HP`, `5HK`,
`hitstun`, `knockdown` — six images. Missing keys are aliased where sensible
(walkB→walkF, prejump/wakeup→crouch, launched/thrown→hitstun) and everything
else falls back to the procedural renderer until you replace it.

## Offline demo build (single file)

`npm run demo` produces **viktor-v-demo.html** — the entire game (code, sprite
sheet, stage, rain) inlined into one file. Double-click it to play: no server,
no install, no internet, nothing to deploy. Use it for laptop demos and for
sending a build to someone. It is git-ignored, so it never ships to the site.

For a P2 palette variant, add `sheet-alt.png` next to `sheet.png` and set
`"altSheet": true` in frames.json.

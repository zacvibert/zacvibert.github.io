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

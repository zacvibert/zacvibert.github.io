# art-src — working files (not shipped)

Aseprite sources, palettes and reference boards live here; exported PNGs ship
from `public/assets/`. Keep one folder per character/stage.

## Aseprite setup (per character)

1. New file **160×160**, Indexed colour mode.
2. Load/lock the character palette (max 24 colours) — save it as `palette.gpl`
   in the character's folder so every file shares it.
3. Draw the feet-centre at pixel **(80, 150)** in every frame (add a locked
   guide layer with a marker there).
4. One tag per animation (`idle`, `walkF`, …) using the keys in
   docs/SPRITE_SPEC.md; onion-skin for in-betweens.
5. Export: File → Export Sprite Sheet → arrange so each animation is one row of
   equal 160×160 cells → save as `sheet.png` in
   `public/assets/characters/<id>/`. (Starting out with idle only: a single
   horizontal strip is exactly right.)
6. Add the `ASSETS.md` entry, then ask Claude to wire in `frames.json` and
   verify in-game.

## Structure

```
art-src/
└── fighter-zero/
    ├── refs/          # AI concept references, mood boards (never shipped)
    ├── palette.gpl
    └── fighter-zero.aseprite
```

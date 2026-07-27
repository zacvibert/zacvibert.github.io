# Art direction — the one-pager

Every visual asset in the game obeys these rules. That consistency — not detail —
is what makes retro art look professional. When in doubt, this document wins.

## Canvas and scale

| Rule | Value |
|---|---|
| Internal game resolution | 640×360, integer-scaled, no smoothing |
| Character sprite cell | **160×160 px**, feet anchored at (80, 150) |
| Character height (standing) | ~104–112 px to the top of the head |
| Stage paintings | 1280×360 main layer (2× screen width) + far/mid layers |
| Pixel grid | 1:1 — never draw at higher res and downscale |

## Colour

- **One indexed palette per character, max 24 colours + transparency.** Locked at
  model-sheet time; every animation frame uses exactly these colours.
- Skin/cloth ramps: 3–4 shades per material (shadow, base, light, highlight).
- **No anti-aliasing, no partial alpha.** Every pixel is a palette colour or empty.
- Outline: 1 px, very dark warm purple `#1a1420` — not pure black — around the
  full silhouette. Interior lines only where materials meet.
- Backgrounds sit 20–30% lower in saturation and contrast than characters, and
  avoid the characters' accent colours. Fighters must win the squint test.

## Light

- **Single light source, upper-left**, matching the sunset stage. Baked into every
  sprite: highlights on upper-left surfaces, shadow ramp on lower-right.
- Rim light optional on the right edge (sunset bounce), 1 px, sparing.

## Silhouette

- Every character readable as a solid black shape; every attack readable from
  silhouette alone. Test each pose by filling it black before detailing.
- Distinct head-to-body ratio and stance per character — no two characters share
  a silhouette.

## Animation principles

- Anticipation → action → follow-through: wind-up frames before, smear/settle after.
- Attacks snap: 1–2 startup drawings, **1 strong active drawing**, 2–3 recovery.
- Loops breathe: idle 6 frames, walk 6, ~8–10 fps for loops (set per-anim in
  `frames.json`); attack anims sync to gameplay frame data automatically.
- Smears and stretched limbs on fast moves are encouraged — period-authentic.

## Frame budgets (per character, target)

idle 6 · walk 6 · crouch 2 · prejump/jump 4 · per normal 3–4 · per special 5–6 ·
hit reactions 4 · block 2 · knockdown/wakeup 6 · throw 6 · win 4 → **~90–130 frames**
for a complete character at this style level.

## Provenance

Nothing enters `public/assets/` without an `ASSETS.md` entry (author, tool,
licence). AI images are references only; shipped pixels are human-made.

# Customizing the game — workflows and prompts

This game is built so that **everything you see is data or a small piece of code**,
and every change below is something Claude can do for you from a plain-English
prompt. Copy the prompt templates, fill in the brackets, done.

A hard rule first (see FIGHTING_GAME_PLAN.md §2): we never import sprites, music,
names or backgrounds from Street Fighter or any commercial game — including via
fan repos that bundle them. Everything here produces *original* content. That is
what keeps zacvibert.github.io safe to publish.

---

## 1. What is customizable right now (no art tools needed)

| Thing | Where it lives | Example prompt to Claude |
|---|---|---|
| Fighter colours (skin, gi, headband) | `appearance` / `altAppearance` in `src/characters/fighter-zero.json` | "Give P1 a black gi with a red headband, and P2 a white gi with a blue belt." |
| Fighter name | `name` in the character JSON | "Rename Fighter Zero to [NAME] everywhere." |
| Move speed / damage / range | `moves` frame data in the character JSON | "Make the sweep slower but reach further, and buff the fireball to 70 damage." |
| Body shape & poses | `src/game/pose.ts` | "Make the idle stance wider and more aggressive, arms higher." |
| New moves | JSON + a pose in `pose.ts` | "Add a ↓↘→+K slide kick: 12f startup, hits low, knocks down, very punishable." |
| Stage look | `drawStage()` in `src/game/match.ts` | "Make a night version of the stage: rain, neon signs, reflections on the floor." |
| HUD style | `drawHud()` in `src/game/match.ts` | "Give the health bars angled ends and put a round timer plate behind the pips." |
| Game feel | constants in `fighter.ts` / JSON | "Increase hitstop on heavy hits and add more pushback in the corner." |
| Whole new character | copy the JSON + design doc | see §3 |

Workflow for ALL of these: tell Claude the change → Claude edits, runs the tests
and the browser smoke check, pushes to the PR → you play the preview build.
That's the "coping with changes" loop, and it's already proven.

## 2. How the visuals work (why there are no sprite files yet)

Fighters are drawn as an articulated skeleton (joints posed per state in
`pose.ts`, rendered as thick rounded limbs with gi, belt, headband, fists).
Because poses are code, Claude can restyle bodies, add moves, and animate new
states instantly — with zero drawing work from you. This is the right mode to
stay in while gameplay is still changing.

When a character's design is final, we upgrade it to hand-made pixel sprites
(§4) without touching gameplay: rendering is the only thing that swaps.

## 3. Creating a new character (the repeatable workflow)

1. **Design doc** — prompt: *"Draft docs/design/characters/[name].md: a [archetype,
   e.g. slow grappler / fast rushdown] who [one-line fantasy]. Full move list with
   frame data, cancel routes, combo routes, strengths/weaknesses/counterplay."*
   You review the doc — this is where you make creative decisions.
2. **Implementation** — prompt: *"Implement [name] from the design doc as a new
   character JSON + poses, selectable for P2."* (Character select screen gets
   built the first time two characters exist.)
3. **Playtest** on the PR preview; give notes in plain English
   ("her sweep feels too safe") — Claude adjusts numbers.
4. **Look pass** — appearance palette + pose restyling prompts until the
   silhouette feels right.
5. Later: pixel-sprite upgrade (§4).

## 4. Real pixel-art sprites (when you want them)

The upgrade path, one animation at a time:

1. **Concept references** (optional, AI image tool of your choice). Prompt
   template: *"Original 2D fighting game character concept, [body type],
   [costume], [colour palette], side-on fighting stance, retro 16-bit pixel art
   style, plain background, full body."* Use results as **references only** —
   never ship AI output directly, and never ask an image tool for an existing
   game's character.
2. **Model sheet**: pick one design; draw (or commission) a clean front/side
   reference with a fixed 16–32 colour palette.
3. **Pixel the frames in Aseprite** at a fixed cell size (128×128, feet centred
   at the bottom-middle of the cell). Start with idle (4–6 frames) only.
4. **Export** `sheet.png` (one row per animation) into
   `public/assets/characters/[name]/` per **docs/SPRITE_SPEC.md** — the loader
   is already built: any animation present in the sheet automatically replaces
   the procedural renderer, and everything else keeps the procedural look, so
   you can upgrade one animation at a time and the game keeps working throughout.
5. Log every asset in `ASSETS.md` (who made it, tool, licence) — Claude refuses
   to wire in files that aren't logged.

Frame budget honestly: idle+walk+jump+crouch ≈ 25 frames; a full character
≈ 150–400. That's why we perfect gameplay in procedural mode first.

## 5. Stages

Stages are pure code today (`drawStage`), so restyles are one prompt. For
image-based stages later: a wide background painting (1280×360 for 2× parallax)
+ separate far/mid layer PNGs; AI-generated *backgrounds* are more usable than
AI characters (no frame-consistency problem) but still get pixelled over by
hand before shipping, and still get logged in `ASSETS.md`.

## 6. Prompts you can use next, verbatim

- "Add simple retro sound effects (generated, original) for hits, blocks, fireball and KO."
- "Add a character select screen and a second character: a slow heavy grappler with a command grab, per the workflow in docs/CUSTOMIZING.md §3."
- "Add a training mode: infinite health, input display, frame advantage readout."
- "Add a simple CPU opponent with three difficulty levels."
- "Restyle the stage as [your idea] and the fighters as [your idea]."

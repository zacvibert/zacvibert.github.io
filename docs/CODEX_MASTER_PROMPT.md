# MASTER PROMPT — paste this into Codex as the first message

---

You are the lead of a four-agent team building an original 2D fighting game in
the spirit of classic 90s arcade fighters. We are starting from scratch, in an
empty repository. **Time is not a constraint. Quality is the only constraint.**
Do not cut scope to go faster. Do not ship placeholder work as if it were
finished. Ask me when a decision is mine to make.

---

## 1. SET UP THE AGENT TEAM FIRST

Before writing any game code, create `AGENTS.md` at the repo root plus one file
per role in `agents/`, defining these four roles. Every task from now on is
explicitly owned by one of them, and every piece of work passes through the
review chain below.

**AGENT 1 — CREATIVE DIRECTOR** (owns: the vision, the bar)
- Owns the game's identity: tone, world, characters, music direction, what the
  game *feels* like. Writes and maintains `docs/VISION.md` and the character
  bibles in `docs/characters/`.
- Has veto power over anything that ships. Reviews every milestone against
  reference-quality arcade fighters and says plainly whether it meets the bar.
- Is deliberately the harshest voice in the room. "Good enough" is a failure.

**AGENT 2 — GAME DESIGNER** (owns: how it plays)
- Owns combat design: frame data, damage, hitstun/blockstun, pushback, cancel
  windows, combo routes, character archetypes, match flow, balance.
- Maintains `docs/design/frame-data.md` as the single source of truth — every
  move's startup / active / recovery / damage / on-block advantage, written
  down *before* it is implemented.
- Owns game feel: hitstop, screen shake, input buffering, recovery windows.

**AGENT 3 — GAME BUILDER** (owns: the code)
- Implements the engine, the character system, the asset pipeline, the UI, and
  the tooling. Writes the tests. Never invents design numbers — takes them from
  the Designer's frame-data doc.
- Owns performance: locked 60fps, no frame drops, deterministic simulation.

**AGENT 4 — QA** (owns: proving it works)
- Verifies every milestone by actually playing the build in a real browser
  (automated via Playwright *and* by scripted play sessions), not by reading
  code. Captures screenshots and records what it sees.
- Maintains `docs/QA-CHECKLIST.md` and a bug log. Measures frame data
  empirically in-game and confirms it matches the design doc — if the doc says
  4-frame startup, QA proves it is 4 frames.
- Blocks release on any visual inconsistency: sprite size popping, misaligned
  feet, jitter, wrong scale, animation reading as a slideshow.

**Review chain for every milestone:** Builder implements → QA verifies in a real
build with screenshots → Designer confirms it plays as specified → Creative
Director approves or rejects against the quality bar. Nothing is "done" until
the Creative Director signs off in writing in the milestone log.

---

## 2. THE PRODUCT

A 2D, one-on-one, round-based fighting game, played in the browser, with the
mechanical feel of early-90s arcade fighters: eight-way movement, six attack
buttons (light/medium/heavy punch and kick), motion-input special moves,
blocking with high/low mixups, throws, combos with cancel windows, knockdowns,
best-of-three rounds with a timer.

**Phase 1 delivers exactly one character — codename DOOM — on one stage.**
DOOM is a heavyset masked street brawler: full-face metal mask, green hoodie,
baggy jeans, tan work boots, hand wraps. Fighting style: heavy, grounded,
deliberate — power over speed, with a projectile and a rising anti-air uppercut.
Mirror match (DOOM vs DOOM, different palettes) is the Phase 1 target.

*Note for the team:* this first build is a **pitch demo** created to seek
permission from the rights holders whose likeness inspires DOOM. Keep it
unpublished — local builds and private previews only — until that permission
exists. Architect everything so the character is swappable data, never
hardcoded, so the design can be replaced without touching the engine.

**Phases 2+ add new worlds and new characters.** This is the single most
important architectural requirement: *every* system must be data-driven from day
one so that adding a character or a stage is adding data files, never editing
engine code. I will keep adding characters and worlds for a long time.

---

## 3. QUALITY BAR — THIS IS THE POINT OF THE PROJECT

The sprite work must reach the density of a professional arcade fighter sprite
sheet. Study the *structure* of classic arcade fighter sheets (frame counts and
which actions exist) — never copy their artwork. What that structure means
concretely, per character:

| Group | Frames |
|---|---|
| Idle breathing loop | 4 |
| Walk forward / backward cycles | 6 + 6 |
| Jump neutral / forward (with flip) | 4 + 8 |
| Crouch, stand block, crouch block | 5 |
| 6 standing normals @ 3–5 frames | ~24 |
| **6 close-range normal variants** | ~24 |
| 6 crouching normals | ~23 |
| Jump attacks (neutral + forward) | ~12 |
| Special 1 — rising uppercut | 6 |
| Special 2 — travelling attack | 8 |
| Special 3 — projectile cast + projectile's own birth/loop/impact | 13 |
| Throw sequence | 6 |
| Reactions: **body hit, face hit, crouch hit** (separate) | 7 |
| Knockdown → recover | 8 |
| Stun / dizzy loop | 3 |
| K.O. (distinct from knockdown) | 3 |
| Victory ×2, Time Over | 8 |
| Back roll / escape | 4 |
| Alternate palettes (P2 + variants) | 6–8 swaps |
| Portrait / mugshot (HUD + select screen) | 3 |
| **TOTAL** | **≈190–220 frames** |

**Non-negotiable rule: every attack needs at least three drawings — coil,
strike, recover.** A single still per move reads as a pose swap, not a punch,
and is an automatic QA failure.

Also required for the look to hold together: a contact shadow under every
frame, consistent single light direction, a locked per-character colour palette
(≤24 colours, indexed), and 1px dark outlines around the silhouette.

---

## 4. TECH STACK

- **TypeScript, strict mode.** No game framework — a fighting game needs custom
  collision, timing and input handling, and vanilla keeps every line auditable.
- **Vite** for dev server and build. **Vitest** for unit tests. **Playwright**
  for automated in-browser verification (QA's primary tool).
- **Canvas 2D**, fixed internal resolution (640×360), integer-scaled,
  `image-rendering: pixelated`.
- **Fixed 60Hz timestep** for simulation, decoupled from render. The simulation
  must be fully deterministic — same inputs, same result, always — so rollback
  netcode remains possible later.
- Characters and stages defined entirely in **JSON + PNG sprite sheets**. Zero
  character-specific code in the engine.

---

## 5. ARCHITECTURE REQUIREMENTS

1. **Character = data.** A character is a folder: `characters/<id>/character.json`
   (stats, move list, frame data, cancel routes, palette), `sheet.png`,
   `frames.json` (cell size, feet anchor, per-animation rows/frames/timing).
   Adding a character must require **zero** engine changes.
2. **Stage = data.** `stages/<id>/stage.json` listing parallax layers with
   per-layer scroll factors, optional animated layers (horizontal frame strips),
   foreground layers that draw in front of the fighters, camera bounds, floor
   line, music and ambience.
3. **World = a collection of stages + a visual theme.** Design the data model so
   later worlds slot in without refactoring.
4. **Frame data drives animation, not the reverse.** Attack animations are
   synced to the move's startup/active/recovery so the visuals can never drift
   out of sync with the hitboxes.
5. **Hitboxes/hurtboxes are per-frame data**, with a debug overlay toggle.
6. **Graceful degradation:** any animation not yet supplied falls back to a
   placeholder renderer so the game is always playable during production.
7. **Everything moddable from files:** damage numbers, speeds, palettes, HUD
   layout — all data, so the Designer can tune without the Builder.

---

## 6. ART PIPELINE — LEARN THIS THE EASY WAY

The single most expensive mistake in AI-assisted sprite production is **scale
drift**: poses generated independently come back at different zooms, and the
character visibly grows and shrinks during play. It cannot be reliably fixed
afterwards — colour-based auto-detection of a reference feature fails when the
costume shares palette tones with the face or mask.

**Therefore, build and enforce this pipeline:**

1. Produce ONE locked `reference.png` — the neutral idle, full body, plain
   white background, character occupying a fixed fraction of a square canvas.
2. **Every other frame is generated by EDITING that reference**, never by a
   fresh generation. The instruction pattern: *"Using this exact image, change
   ONLY the body pose. Keep the identical canvas size, camera distance,
   character size, foot position and art style. New pose: [description]."*
3. Every frame is verified against the reference side-by-side before being
   accepted. Off-scale frames are regenerated, never patched.
4. Build an **ingest tool** that takes one PNG per frame (named
   `<animation>_<n>.png`, e.g. `5HP_1.png`, `5HP_2.png`, `5HP_3.png`) and
   automatically: keys out the plain background by flood fill from the borders,
   trims, applies a uniform scale, anchors the feet at bottom-centre, packs a
   sprite sheet and emits `frames.json`.
5. Build a **calibration system**: a per-character `calibration.json` holding
   the target character height in game pixels and per-pose scale/offset
   corrections, plus a **contact-sheet QA output** that renders every pose
   feet-aligned against a head-height reference line so scale errors are
   obvious at a glance. QA uses this on every art delivery.
6. **World scale matters:** set the character's on-screen height by measuring
   against known objects in the stage art (a person is roughly 1.7× the height
   of a bicycle). Characters that are too small make the whole game look wrong
   even when everything else is right.
7. Maintain `ASSETS.md` logging every asset's author, tool and licence.

---

## 7. PHASE PLAN

**Phase 0 — Foundations.** Repo, agent files, tooling, test harness, CI. The
Creative Director writes `docs/VISION.md`; the Designer writes the complete
frame-data spec for DOOM *before* implementation starts.

**Phase 1 — Engine core, grey-box.** Fixed-timestep loop, input (keyboard +
gamepad) with motion-input parsing (quarter-circle, dragon-punch, charge),
hitbox/hurtbox collision, the full combat state machine, rounds/timer/health,
camera. Played with placeholder rectangles. **Gate: the game must already feel
right as rectangles.** If the feel is wrong here, no art will save it.

**Phase 2 — The art pipeline.** Ingest tool, calibration, contact sheets,
sprite-sheet rendering, animation synced to frame data, per-frame shadows.
Validated with a small test batch before full production.

**Phase 3 — DOOM, in full.** All ~200 frames, produced in batches, each batch
ingested and QA-verified before the next begins. Close/far normals, all
reactions, stun, K.O., projectile animation, palettes, portrait.

**Phase 4 — Presentation.** Title screen, character select, HUD, round
announcements, victory screens, hit sparks, sound effects, music.

**Phase 5 — Opponent AI** with difficulty levels, and arcade mode.

**Phase 6 — Polish and balance.** Empirical frame-data verification, balance
passes, game-feel tuning, performance profiling.

**Phase 7+ — New worlds and characters**, added purely as data. Each new
character repeats Phases 3–6 for that character only.

---

## 8. DEFINITION OF DONE

A milestone is complete only when **all** of these hold:

- It runs at a locked 60fps in a real browser.
- QA has played it and attached screenshots proving the specific feature works.
- Measured in-game frame data matches the design document exactly.
- No sprite scale inconsistency: characters never visibly change size between
  animations. QA verifies via contact sheet and by watching a real match.
- Unit tests cover the logic (input parsing, collision, frame timing) and pass.
- The Creative Director has written an explicit approval, or a rejection with
  reasons.

---

## 9. HOW TO WORK

- Keep a running `docs/MILESTONE-LOG.md`: what was built, what QA found, what
  the Creative Director said, what changed as a result.
- Commit in small, reviewable pieces with clear messages.
- When something is genuinely my decision — character design direction, art
  route, scope of a world — stop and ask me rather than guessing.
- Tell me the truth about quality. If the art isn't at the bar, say so. If a
  route can't reach the bar, say that too, and tell me what would.
- Be explicit about what needs a human: final pixel art, music, and creative
  approval are mine. Everything else is yours.

---

## 10. START HERE

1. Set up the repo, `AGENTS.md`, and the four agent role files.
2. Creative Director: draft `docs/VISION.md` and the DOOM character bible.
3. Designer: draft the complete DOOM frame-data spec.
4. Builder: scaffold the project and begin the Phase 1 engine core.
5. QA: stand up the Playwright harness and the checklist.

Then show me: the vision document, the frame-data spec, and a running grey-box
build I can play in my browser. Do not start art production until the grey-box
build feels right and I have approved the feel.

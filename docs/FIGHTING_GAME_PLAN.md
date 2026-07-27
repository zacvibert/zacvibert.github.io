# Original Retro 2D Fighting Game — Full Project Plan

*Goal: an original fighting game with the gameplay feel of Street Fighter II — original fighters, moves, stages, art and music. No copied assets, characters or code from any commercial game.*

---

## 0. Reality check (read this first)

Street Fighter II shipped with 8 playable characters, each with hundreds of hand-drawn
animation frames, made by a large professional team. The honest constraint on this
project is **not code — it is art**. Code and character logic are text, and AI handles
text extremely well. Pixel-art animation that stays consistent across 150–400 frames
per character is slow, largely manual work that no current AI tool does well.

**Recommended v1.0 scope (achievable):**

- 2 original characters, fully complete (not 8 half-finished ones)
- 2 original stages
- Local versus + arcade mode vs. CPU
- Menus, health bars, rounds, timer — provided by the engine
- Online play via the engine's built-in rollback netcode (free win, no netcode to write)

Everything beyond that (more characters, more stages, story mode) is post-1.0 content
added with the reusable pipelines described below. If you insist on 6+ characters for
v1, expect 12+ months of art production or budget for a pixel artist.

---

## 1. The three best open-source foundations

### A. Ikemen GO — https://github.com/ikemen-engine/Ikemen-GO
- **What it is:** A complete, standalone fighting-game engine written in Go, clean-room
  compatible with M.U.G.E.N content formats, extended with modern features.
- **License:** MIT (engine). Bundled placeholder screenpack assets are Creative Commons.
- **Status:** Actively maintained — nightly releases (latest July 17 2026), ~6,300 commits, 1.4k stars.
- **Ships with:** character/stage systems, input buffering and command parsing, hitbox/
  hurtbox system, AI opponents, menus, lifebars, rounds, arcade/versus/training/survival
  modes, controller support, **rollback and delay netcode**, Lua scripting for game modes,
  and a modern character scripting language (ZSS) alongside classic CNS.

### B. Castagne — https://github.com/panthavma/castagne
- **What it is:** A fighting-game framework/toolkit built on Godot (GDScript), with its
  own editor and a custom character-scripting language. Rollback via dsnopek's addon.
- **License:** MPL 2.0.
- **Status:** v0.5x, last release October 2024 — development has stalled for ~21 months
  as of July 2026. 149 stars, small community. Two indie games shipped on it.

### C. FOOTSIES — https://github.com/hifight/Footsies
- **What it is:** A minimal, elegant Unity fighting game (one attack button, real
  hitboxes/hurtboxes, frame data, and an official rollback fork). The best *educational*
  codebase for understanding fighting-game internals.
- **License:** GPL-3.0 — any game built on it must also be GPL-3.0 open source.
- **Status:** Reference project, not an engine; you would build every system SF2 needs
  (6 buttons, specials, supers, menus, rounds, AI) yourself on top of Unity (proprietary
  engine, revenue-based fees).

### Comparison

| Criterion | **Ikemen GO** | Castagne | FOOTSIES |
|---|---|---|---|
| License | MIT ✅ | MPL 2.0 ✅ | GPL-3.0 ⚠️ (viral) |
| Language | Go engine; characters in ZSS/CNS text + Lua | GDScript + custom DSL | C# (Unity) |
| Engine | Self-contained | Godot 3.x | Unity |
| Code quality | Mature, large, some legacy MUGEN semantics | Clean but alpha | Small and readable |
| Documentation | Good wiki + 20 yrs of MUGEN docs/tutorials | Decent but incomplete | Minimal |
| Ease of customisation | High (everything is data files) | High in theory, alpha in practice | You build everything |
| Character system | Complete, data-driven ✅ | Basic, evolving | None (2 hardcoded) |
| Input/combo system | Complete (buffering, motions, chains, cancels) ✅ | Basic | Minimal by design |
| Hit/hurtboxes | Per-frame Clsn boxes, debug display ✅ | Supported | Yes, simple |
| Animation support | Sprite-based .AIR timelines ✅ | Godot animation | Unity animator |
| Controller support | Built-in ✅ | Via Godot | Via Unity |
| AI opponents | Built-in, scriptable ✅ | No real support | Simple demo AI |
| Local multiplayer | Built-in ✅ | Built-in | Built-in |
| Online / rollback | **Built-in rollback + delay netcode** ✅ | Rollback addon | Rollback in a fork |
| Maintenance (Jul 2026) | Active, nightly builds ✅ | Stalled since Oct 2024 ⚠️ | Hobby project ⚠️ |
| Beginner + AI-assist fit | **Best** — characters are plain text files Claude can write/review | Medium — must learn Godot + alpha DSL | Worst for a full game — huge build-out |

### Final recommendation: **Ikemen GO**

Reasons:
1. It is the only option where menus, rounds, lifebars, AI, training mode, controller
   support and **rollback netcode already work**. You spend your time on characters and
   art — the actual creative product — not engine plumbing.
2. Characters, stages, and UI are **plain text data files** (.def, .air, .cmd, ZSS/CNS,
   Lua). That is the ideal medium for AI-assisted development: Claude can write, review
   and refactor every one of them directly.
3. MIT license: you can sell the game, close-source your content, no obligations.
4. Actively maintained with a large community and two decades of accumulated
   documentation (MUGEN docs apply almost 1:1).

Trade-offs to accept:
- The CNS/AIR formats are old and quirky (INI-style state machines). Mitigation: use the
  modern **ZSS** scripting language where possible, and lean on Claude for the arcana.
- **No browser build.** Ikemen GO ships Windows/macOS/Linux binaries. Your
  zacvibert.github.io repo becomes the project website + download page, not the game
  itself. (If "playable in the browser on my GitHub Pages site" is a hard requirement,
  the plan changes to a custom TypeScript/Canvas engine — say so and we re-plan; cost is
  building input buffering, hitboxes, AI and netcode ourselves, and online play drops
  out of v1.)

---

## 2. Legal and technical risk flags

1. **The MUGEN ecosystem is a copyright minefield.** The Ikemen GO *engine* is clean
   MIT code, but the vast majority of community-made characters, stages and screenpacks
   are built from sprites ripped from Capcom/SNK/etc. games. **Never** ship, bundle, or
   even "temporarily use" downloaded community characters/stages. For placeholders,
   use only the CC-licensed assets bundled with the engine, and replace them before release.
2. **Mechanics are safe; expression is not.** Gameplay systems (quarter-circle motions,
   6-button layouts, chip damage, combos) are not copyrightable — cloning SF2's *feel* is
   legal. Characters, sprites, names, music, sounds, stage art and story are protected.
   Don't make "Ryu with a palette swap"; make genuinely original fighters.
3. **Trademarks:** don't use "Street Fighter" (or similar) in your title or marketing.
   "Inspired by classic arcade fighters" is fine.
4. **FOOTSIES' GPL-3.0** would force your whole game open-source — a reason it isn't the pick.
5. **AI-generated art:** usable for concepts/mood boards; check each tool's licence terms,
   and be aware pure AI output has unsettled copyright status in several jurisdictions.
   Final sprites should be human-authored (pixelled over) — which is also the only way
   they'll animate consistently.
6. **Keep an asset manifest** (`ASSETS.md`): for every sprite, sound and track, record
   who made it, with what tool, and under what licence. Do this from day one.
7. **Technical:** Ikemen GO uses indexed-palette sprite formats (SFF); you'll need the
   free **Fighter Factory Studio** tool for sprite packing — it's an extra tool in the
   pipeline, but a mature one.

---

## 3. Recommended technology stack

| Layer | Choice |
|---|---|
| Engine | **Ikemen GO** (prebuilt nightly binaries; build from source only if needed) |
| Character logic | **ZSS** (modern) + CNS where docs/examples demand, `.cmd` for inputs, `.air` for animation/boxes |
| UI / game modes | Engine defaults first; Lua + `system.def`/`fight.def` for custom menus & lifebars |
| Pixel art | **Aseprite** (~$20, the industry standard; libresprite is the free fork) |
| Sprite packing | **Fighter Factory Studio** (free) → SFF v2 |
| Concept art | Claude + any AI image tool for *references only*; final art pixelled by hand |
| Audio | CC0/CC-BY libraries (freesound.org, OpenGameArt) or Bfxr/jsfxr for retro SFX; original or CC0 music |
| Versioning | This GitHub repo (game data + art sources + website); Git LFS if art grows large |
| AI assistant | **Claude Code / Claude Fable** as the single dev tool (see §9) |

---

## 4. Development roadmap

**Phase 0 — Setup (day 1)**
1. Restructure this repo (see §5): game content in `game/`, website in `site/` (or keep
   `index.html` at root for Pages).
2. Download the latest Ikemen GO release for your OS; keep the engine *out* of git
   (it's a binary you re-download), pin the version in `docs/ENGINE_VERSION.md`.
3. Run the engine with its bundled CC demo content. Confirm: menus, a fight, training
   mode, controller input, and the hitbox debug display (Ctrl+C in-game).

**Phase 1 — Understand the codebase (week 1)**
- You don't read the Go engine; you learn the *content formats*: `.def` (manifests),
  `.sff` (sprites), `.air` (animations + collision boxes), `.cmd` (inputs), ZSS/CNS
  (state machines), `stage .def`, `system.def`. Claude explains any file on demand.
- Exercise: take the bundled training dummy, change its walk speed, damage and one
  animation timing. This teaches 80% of the model.

**Phase 2 — Grey-box combat prototype (weeks 2–4)**
- Build **Fighter Zero**, a template character with *rectangle placeholder sprites*
  (generated programmatically — no art needed yet): idle/walk/jump/crouch, 6 normals,
  1 fireball, 1 uppercut, throw, block, hit reactions, knockdown.
- Tune the SF2 feel with real frame data: walk speeds, jump arcs, hitstun/blockstun,
  pushback, damage scaling, cancel windows. This is pure text + playtesting — the
  highest-value phase for AI assistance, zero art required.

**Phase 3 — First real character (months 2–3)**
- Design doc → concept art → sprites (see §7) for Character 1, wired into the proven
  Fighter Zero logic skeleton.

**Phase 4 — Second character + first stage (months 3–5)**
- Character 2 (different archetype), Stage 1 (see §8). Now real matches exist.

**Phase 5 — Presentation (month 5–6)**
- Replace placeholder screenpack: original title screen, character select, lifebars,
  fonts, announcer/SFX, victory screens. All data + art, engine features already exist.

**Phase 6 — AI opponents & modes**
- Script CPU behaviour per character (`.cmd` AI triggers / ZSS AI states). Configure
  arcade ladder, versus, training, survival in `select.def` — mostly configuration.

**Phase 7 — Testing & balancing**
- Training-mode frame-data verification against the design docs (hitbox display on).
- Human playtests; tune damage/frame data in text files; keep a balance changelog.
- Test rollback online play with a friend (built into the engine).

**Phase 8 — Packaging**
- A release = engine binary + your content folders, zipped per OS (Win/macOS/Linux).
- Script it (`tools/package.sh`), publish via GitHub Releases; zacvibert.github.io
  becomes the landing/download page. Steam later if wanted.

---

## 5. Proposed repository structure

```
zacvibert.github.io/
├── index.html                  # project website (GitHub Pages)
├── docs/
│   ├── FIGHTING_GAME_PLAN.md   # this document
│   ├── ENGINE_VERSION.md       # pinned Ikemen GO release
│   ├── design/
│   │   ├── game-design.md      # global mechanics: damage model, meter, systems
│   │   └── characters/         # one design doc per fighter (source of truth)
│   └── balance-changelog.md
├── game/                       # drops into the Ikemen GO folder (or is symlinked)
│   ├── chars/
│   │   ├── fighter-zero/       # grey-box template character (reusable skeleton)
│   │   └── <name>/             # per fighter: def, sff, air, cmd, zss/cns, snd
│   ├── stages/
│   ├── data/                   # system.def, select.def, fight.def, common.zss
│   ├── font/  sound/  music/
├── art-src/                    # Aseprite sources, palettes, reference sheets
│   └── <name>/
├── tools/
│   ├── package.sh              # build release zips
│   └── framedata-check.py      # lint .air/ZSS against the design doc
└── ASSETS.md                   # licence/provenance manifest for every asset
```

---

## 6. Reusable custom-character system

**Principle: one design doc + one code skeleton per archetype = a character factory.**

**(a) The design doc** (`docs/design/characters/<name>.md`) is the source of truth and
covers, per character: name & visual identity · fighting style · archetype (shoto /
grappler / rushdown / zoner / charge) · full move list with inputs · frame data table
(startup/active/recovery, damage, hitstun, blockstun, on-block advantage) · hitbox and
hurtbox intent per move · cancel routes · intended combo routes · strengths, weaknesses
and counterplay. Claude generates and balance-checks these tables directly.

**(b) The engine mapping** — each concept maps to a specific file:

| Design concept | Where it lives |
|---|---|
| Manifest (name, files, palette) | `<name>.def` |
| Sprites | `<name>.sff` (packed from PNGs via Fighter Factory) |
| Animations + per-frame hitboxes (Clsn1) / hurtboxes (Clsn2) | `<name>.air` — each move is a numbered anim; startup/active/recovery are literally the frame ticks before/with/after the Clsn1 boxes |
| Input commands & combos | `<name>.cmd` — motion definitions (e.g. `~D,DF,F,x` = quarter-circle punch) and the rules mapping commands → states |
| Move logic: damage, hitstun, blockstun, knockdown type, juggle, cancels, projectiles | ZSS/CNS states — one `statedef` per move; a `HitDef` carries damage/stun/pushback; cancel routes are `ChangeState` triggers gated on `MoveContact`/frame windows |
| Shared mechanics (walking, jumping, blocking, hit reactions, throws, knockdown/wakeup, victory/defeat) | engine common states — you inherit them and override only what's unique |
| Standard state numbers | idle 0, walk 20, jump 40/50, guard 120–155, hit reactions 5000s, etc. — a fixed convention every character shares |

**(c) The factory workflow for each new fighter:**
1. Write the design doc (Claude drafts, you decide).
2. Copy `fighter-zero/`, rename, and have Claude rewrite states/frame data to match
   the doc — playable immediately with placeholder boxes.
3. Playtest and tune the *grey-box* version until the character is fun.
4. Only then produce art (§7) and swap sprites in. Logic and art are decoupled, so
   art never blocks design iteration.

---

## 7. Character-art workflow

1. **Concept:** written description → AI-generated *reference* images (mood/costume
   exploration only) → pick a direction → draw a clean **model sheet** (front/side/back,
   colour palette) — this sheet is the consistency anchor for every frame.
2. **Technical spec first:** pick game resolution (recommend 640×360 internal for a
   crisp retro-HD look, or 320×240 for pure arcade), character canvas (e.g. 160×192 px),
   and a fixed **indexed palette of 16–32 colours** per character. Palette discipline is
   what makes frames look consistent and enables palette-swap alternate colours for free.
3. **Pixel production (Aseprite):** for each move, block in **key frames** first
   (e.g. 3 keys for a punch), test them in-engine at real timing, then draw in-betweens.
   Never polish a frame before its timing is proven. Budget honestly: a complete fighter
   is ~150–400 frames; idle+walk+jump+crouch+one punch (~25 frames) is your first
   milestone.
4. **Export:** one PNG per frame (consistent canvas, transparent background) or a sprite
   sheet; a naming convention like `200-03.png` (anim 200, frame 3) keeps the pipeline scriptable.
5. **Import:** Fighter Factory Studio packs PNGs into `.sff` (v2), assigning each sprite
   a group/index number and an **axis** (anchor point — put it at the character's feet
   centre, identically on every frame, or the character will slide and pop).
6. **Align boxes:** in the `.air`, per frame, position hurtboxes (Clsn2) around the body
   and hitboxes (Clsn1) on the striking limb during active frames only. Verify with the
   engine's in-game hitbox display.
7. **Test timing:** play every animation in training mode with debug display; compare
   actual startup/active/recovery ticks against the design doc (`tools/framedata-check.py`
   automates the comparison).

---

## 8. Original stages

A stage is a `.def` + `.sff` — far cheaper than a character. Per stage:

- **Composition:** wide painting (e.g. 2× screen width) with a clear horizontal band
  where the action reads; detail lives above and below the fighters' zone.
- **Floor:** `zoffset` sets the ground line; keep floor texture low-contrast.
- **Camera:** `boundleft/boundright` (how far the camera pans), `verticalfollow` and
  tension values control the SF2-style follow; start from the engine defaults.
- **Parallax:** multiple background layers, each with a `delta` (0.5 = half-speed far
  background, >1 foreground); the classic SF2 depth effect is 3–5 layers.
- **Background animations:** any layer can play an `.air` animation — flickering signs,
  crowd cycles (2–4 frame loops are period-authentic and cheap).
- **Lighting:** baked into the art (retro-correct); add mood with a semi-transparent
  colour overlay layer or palette choice; keep one strong light direction consistent
  with character sprites (pick top-left and use it everywhere).
- **Music/ambience:** loopable OGG per stage set in the stage `.def` (with loop points);
  layer one ambient SFX loop for life. Original or CC0 music only — log it in `ASSETS.md`.
- **Fighter readability:** background saturation and contrast lower than characters;
  characters get a 1px dark outline; never place high-frequency detail at torso height.
  Squint test: fighters must pop when the screen is blurred.

---

## 9. Division of labour — what Claude does vs. what needs other tools

**Claude can produce directly (the majority of the project):** every text/code artifact —
character state machines, frame data, `.air`/`.cmd`/`.def` files, ZSS/CNS, Lua game
modes, stage defs, menu/lifebar config, design docs, balance math, packaging scripts,
lint tools, the website, and *programmatically generated placeholder sprites* for
grey-box characters. Also: reviewing frame data for balance, debugging engine errors,
and explaining any format.

**Needs you + a tool:**
- **Aseprite (manual pixel art):** all final character/stage/UI art. This is the
  project's real cost. Alternative: commission a pixel artist for character sprites.
- **AI image tools (optional):** concept references and stage *background* bases
  (backgrounds tolerate AI generation + manual pixel-over far better than animated
  characters do). Not viable for character animation frames.
- **Fighter Factory Studio:** SFF packing and visual box editing (Claude writes the
  `.air` numbers; the visual check is yours).
- **Game engine editor:** none needed — Ikemen GO has no editor; everything is files.
- **A developer:** not required for v1. Only if you later want engine-level changes
  (custom shaders, platform ports) would Go programming matter — and Claude can do that too.
- **Additional testing:** human playtesting is irreplaceable for feel and balance;
  online rollback testing needs a second person.

---

## 10. Which AI tool?

**Claude Code (with Claude Fable) is sufficient as the sole AI development tool** for
this project, and is the right primary: the entire codebase is text-based data files,
long-context reasoning over frame data and state machines is the core skill needed, and
it runs the engine, edits files, commits and packages autonomously in this repo.

- **Cursor / other AI IDEs:** redundant — same class of tool; pick one, you already have one.
- **ChatGPT / Gemini:** no capability you're missing for this project; adding them just
  fragments context. Ignore.
- **AI image tools** (whichever you prefer): yes, but only for concept refs and stage
  background bases, per §9.
- **AI music tools:** optional for stage music drafts — verify the tool's licence allows
  game distribution, log in `ASSETS.md`, or use CC0 music instead.

---

## 11. First prompt to start development — SUPERSEDED by §12.6

> (Original Ikemen GO prompt kept for reference; the project now targets the browser, see §12.)

> Read docs/FIGHTING_GAME_PLAN.md. Start Phase 0 and Phase 2 setup:
> 1. Restructure the repo per §5 (keep the GitHub Pages site working).
> 2. Write docs/ENGINE_VERSION.md pinned to the latest Ikemen GO release, with exact
>    download/run instructions for my OS.
> 3. Create the Fighter Zero grey-box template character: generate placeholder
>    rectangle sprite PNGs programmatically, plus the .def, .air, .cmd and ZSS files
>    for idle, walk, jump, crouch, block, 6 normals (LP/MP/HP/LK/MK/HK), one
>    quarter-circle fireball, one dragon-punch-motion uppercut, a throw, hit
>    reactions and knockdown — with an SF2-style frame data table documented in
>    docs/design/characters/fighter-zero.md.
> 4. Tell me exactly which manual steps I must do (engine download, Fighter Factory
>    SFF packing) and verify everything else yourself.
> Commit and push to this branch as you go.

---

## 12. DECISION (2026-07-18): playable in-browser — revised plan

The game will run in the browser, playable directly at **https://zacvibert.github.io**
(and optionally on Vercel). This supersedes the Ikemen GO desktop plan above; the
research, scope warnings, legal flags, art workflow (§7), stage design rules (§8), and
character design-doc system (§6a) all still apply unchanged.

### 12.1 Consequences (honest trade-offs)

- We now build the engine ourselves: fixed-timestep game loop, input buffering and
  motion parsing, hitbox/hurtbox resolution, state machines, CPU AI, menus, lifebars.
  This is all code — Claude's strength — but it replaces "free" engine features.
- **Online rollback netcode drops out of v1.** Local multiplayer (shared keyboard +
  gamepads) ships in v1; online later via WebRTC + rollback if ever (big project).
- Upside: zero-install distribution — anyone with the URL can play instantly; PR
  preview deploys let you playtest every change from any device.

### 12.2 Revised technology stack

| Layer | Choice |
|---|---|
| Language | **TypeScript** (strict) |
| Build tool | **Vite** (dev server + production bundle) |
| Rendering | **Canvas 2D**, fixed internal resolution (e.g. 640×360), integer-scaled, `image-rendering: pixelated` |
| Game loop | Fixed 60 ticks/sec update, decoupled render (deterministic — keeps a future rollback door open) |
| Characters | **Data-driven JSON**: frame data, boxes, cancels per move + sprite-sheet PNGs (replaces .air/.cmd/CNS) |
| Input | Keyboard + **Gamepad API**; ring-buffer input history for motion inputs (QCF etc.) |
| Audio | Web Audio API; OGG/M4A assets |
| Framework | None — no Phaser/engine dependency; a fighting game needs custom boxes/timing anyway and vanilla keeps every line understandable |
| Testing | Vitest for engine logic (frame data, box overlap, input parser — all pure functions) |

### 12.3 Revised repository structure

```
zacvibert.github.io/
├── index.html              # the game page (Pages serves repo root)
├── src/
│   ├── engine/             # loop, input, collision, camera, audio, renderer
│   ├── game/               # match flow, rounds, health, menus, CPU AI
│   └── characters/         # loader + per-character logic hooks
├── public/assets/
│   ├── characters/<name>/  # sheet.png + data.json
│   ├── stages/  ui/  audio/
├── docs/                   # this plan, design docs (unchanged)
├── art-src/                # Aseprite sources (unchanged)
├── ASSETS.md
└── .github/workflows/deploy.yml   # build + deploy to GitHub Pages
```

### 12.4 Shipping to GitHub Pages (primary — your existing site)

`zacvibert.github.io` is a *user site*: GitHub Pages serves it at the root URL. Since
Vite needs a build step, deploy with the official Pages Action:

1. Repo → **Settings → Pages → Source: "GitHub Actions"** (one-time, in the web UI).
2. Add `.github/workflows/deploy.yml`: on every push to `main`, it runs
   `npm ci && npm run build` and publishes the `dist/` folder via
   `actions/upload-pages-artifact` + `actions/deploy-pages`. (Claude writes this file.)
3. Ship = **merge to `main`**. ~1 minute later the new build is live at
   https://zacvibert.github.io. Nothing else to do, ever.

### 12.5 Shipping to Vercel (optional mirror — adds per-PR preview URLs)

Dashboard route (no CLI needed):
1. Go to **vercel.com** → sign up / log in **with GitHub**.
2. **Add New… → Project** → Import `zacvibert/zacvibert.github.io`.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output directory `dist` (defaults are correct). → **Deploy**.
4. You get a permanent URL like `https://<project>.vercel.app`. From then on:
   every push to `main` = production deploy; **every PR gets its own preview URL**
   posted automatically on the PR — ideal for playtesting branches on your phone.

CLI route (equivalent): `npm i -g vercel` → `vercel` in the repo (links project,
deploys a preview) → `vercel --prod` for production.

### 12.6 Revised first prompt to start development

> Read docs/FIGHTING_GAME_PLAN.md §12. Start the browser build:
> 1. Scaffold Vite + TypeScript per §12.3, keeping docs/ intact.
> 2. Add the GitHub Pages deploy workflow (§12.4); I'll flip Settings → Pages to
>    "GitHub Actions" myself.
> 3. Build the engine core: 60Hz fixed-timestep loop, 640×360 pixel-scaled canvas,
>    keyboard + gamepad input with an input-history buffer and QCF/DP motion parser,
>    and the hitbox/hurtbox collision system with a debug overlay toggle.
> 4. Create the Fighter Zero grey-box character from JSON frame data (idle, walk,
>    jump, crouch, block, 6 normals, fireball, uppercut, throw, hit reactions,
>    knockdown) and a placeholder stage, so two players can fight on one keyboard.
> 5. Add Vitest tests for the input parser and collision math.
> Commit and push to this branch as you go; the PR preview is my playtest build.

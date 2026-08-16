# Production pipeline — getting to a world-class sprite set

Written after studying professional arcade fighter sprite sheets (Ryu, Fei Long,
E. Honda from Super Street Fighter II). We study their **structure** — how many
frames each action needs, which actions exist — never their artwork.

---

## 1. What the reference sheets actually prove

Counting a professional character sheet:

| Group | What's there | Frames |
|---|---|---|
| Idle | breathing loop | 4 |
| Walk forward / back | full step cycles | 6 + 6 |
| Jump neutral / forward | forward jump includes a full flip | 4 + 8 |
| Crouch, block (stand + crouch) | transitions, not single stills | 2 + 3 |
| 6 standing normals | 3–5 frames each | ~24 |
| **6 "close" normal variants** | different move when near the opponent | ~24 |
| 6 crouching normals | 3–6 frames each | ~23 |
| Jump attacks | punch + kick, neutral + forward | ~12 |
| Special 1 (uppercut) | rise + fall | 6 |
| Special 2 (spinning kick) | full travel cycle | 8 |
| Special 3 (projectile) | cast + the projectile's own birth/loop/impact | 5 + 8 |
| Throw | grab → lift → toss | 4–6 |
| Reactions | **body hit, face hit, crouch hit** — separate | 7 |
| Knockdown → recover | long tumble-and-rise sequence | 8 |
| Stunned (dizzy) | looping | 3 |
| K.O. | separate from knockdown | 3 |
| Victory ×2, Time Over | | 8 |
| Back roll / escape | | 4 |
| Alternate palettes | P2 colour swaps | 6–8 variants |
| Portraits (mugshots) | HUD + character select | 3 |
| **TOTAL** | | **≈190–220 frames** |

**Our current Viktor V: 21 frames — one still per action.** That is ~10% of a
professional set, and it is exactly why it reads as a slideshow rather than a
game. Every attack needs a *minimum* of three drawings — wind-up, impact,
recovery — or the eye sees a pose swap instead of a punch.

Three structural things we're missing beyond raw count:

1. **Close/far normal variants** — the signature of that era's feel.
2. **Distinct reactions** (body vs face vs crouching hit, stun, KO, recover).
3. **A baked contact shadow** under every frame, which is what visually glues
   fighters to the floor.

---

## 2. The three realistic routes to that quality

Honest assessment — pick one, or mix:

| Route | Quality ceiling | Effort | Notes |
|---|---|---|---|
| **A. AI image editing, 3–5 frames per action** | Good — reads as real animation | ~80–110 images, 1–2 weekends | Realistic today. Detailed below. |
| **B. Dedicated pixel-art AI** (Retro Diffusion, PixelLab) | Good–very good | Learning curve + cleanup | Built for sprite frames and palette locking; check the licence permits distribution. |
| **C. Commission a pixel artist** | **World-class — the only route that truly reaches it** | £2–6k per character, 4–8 weeks | The reference sheets were made by professionals; there's no shortcut around that. Our pipeline accepts their output directly. |

Recommendation: **A now** (a genuinely good playable demo, fast), **C for the
final product** if the pitch lands. The engine and pipeline are identical for
both, so nothing is wasted.

---

## 3. The rule that fixes the size-popping (non-negotiable)

The current art varies **21% in drawn scale between poses** — the source images
came in six different canvas shapes and the character occupies a different
fraction of each. No post-processing can reliably undo that: recovering true
scale needs a rigid reference, and colour-matching the mask fails because the
hand-wraps share its palette. **It must be fixed at generation.**

The method that works: **never generate a pose from scratch — always EDIT the
locked reference image.**

1. Produce ONE perfect reference: the idle pose, full body, plain background.
   This becomes `reference.png`, the scale bible.
2. For every other frame, upload `reference.png` and ask for an *edit*:
   "keep the canvas size, framing, camera distance and character size exactly
   the same; change only the pose to X."
3. Image editing preserves framing far better than fresh generation. Any frame
   that comes back visibly bigger or smaller gets rejected and redone — not
   accepted and patched later.

Additional hard requirements per image:
- Identical canvas dimensions on every file (square, e.g. 1024×1024).
- Character's feet at the same height, character centred, full body always in frame.
- Plain white background, no shadow drawn in the art (the engine adds it).
- No cropping of limbs, ever.

---

## 4. Frame manifest — what to generate, in priority order

Naming: `<key>_<n>.png` (e.g. `5HP_1.png`, `5HP_2.png`, `5HP_3.png`). The ingest
tool assembles numbered files into one animation automatically.

**Stage 1 — makes it feel like a real game (43 images, do this first)**

| Action | Files | Frames to draw |
|---|---|---|
| idle | `idle_1..4` | 4 | breathing: settle, rise, peak, settle |
| walkF | `walkF_1..6` | 6 | full step cycle |
| 5LP / 5MP / 5HP | `5LP_1..3`, `5MP_1..3`, `5HP_1..4` | 10 | wind-up, extended, retract |
| 5LK / 5MK / 5HK | same pattern | 10 | |
| QCFP (projectile cast) | `QCFP_1..4` | 4 | gather, thrust, release, recover |
| DPP (uppercut) | `DPP_1..4` | 4 | crouch, launch, apex, descend |
| hitstun | `hitstun_1..3` | 3 | impact, recoil, return |
| knockdown | `knockdown_1..4` | 4 | tumble, land, lie, rise |

**Stage 2 — completes the move set (~40 images)**
crouch normals (`2LP…2HK`, 3 frames each), jump attacks (`jP_1..3`, `jK_1..3`),
walkB, jump/forward-jump cycles, blockstun (2), crouch block, throw (4), victory (4).

**Stage 3 — the professional finish (~25 images)**
close-range normal variants (`5HPc` etc. — needs a small engine addition, I'll
handle it), face-hit and crouch-hit reactions, stun loop, K.O., back roll,
projectile's own frames (birth/travel/impact), portrait/mugshot, P2 palette.

---

## 5. Exact ChatGPT prompts

**Step 1 — the reference (do once, get it perfect)**

> Create my character in a neutral fighting stance, full body head to toe,
> facing right, standing on flat ground, plain pure-white background, no shadow,
> square image, character centred and occupying about 80% of the image height.
> [describe the character]

Save as `reference.png`. **Everything else is an edit of this file.**

**Step 2 — every subsequent frame** (upload `reference.png` each time)

> Using this exact image, change ONLY the body pose. Keep the identical canvas
> size, camera distance, character size, position of the feet, and art style.
> Same character, same clothes, same colours, plain white background, no shadow.
> New pose: [POSE DESCRIPTION].

**Step 3 — pose descriptions for a 3-frame attack** (run three times)

- Frame 1: *"wind-up of a heavy straight punch — weight shifted back, fist pulled to the hip, shoulders coiled"*
- Frame 2: *"the exact moment of impact of a heavy straight punch — arm fully extended, body driven forward, weight on the front foot"*
- Frame 3: *"recovery from a heavy straight punch — arm half retracted, returning to stance"*

Same three-beat structure for every attack: **coil → strike → recover.**

**Step 4 — sanity check before saving**

> Show this new pose side by side with the original reference image so I can
> confirm the character is exactly the same size in both.

If it isn't identical, regenerate. This one check prevents the entire
size-popping problem.

---

## 6. What I need from you

1. **`reference.png`** — the one locked idle image everything else edits from.
2. **Frames named by the manifest** (`5HP_1.png`, `5HP_2.png`…), uploaded to
   `art-src/viktor-v/poses/` as before. Send Stage 1 in one batch if you can —
   I'd rather ingest 43 consistent frames at once than dribs and drabs.
3. **Rejects excluded.** If a frame looks off-scale to you, don't upload it;
   one bad frame is more visible than a missing one.
4. **A decision on Route A vs C** (§2) — it changes what "world-class" means
   for the timeline, not what I build.

## 7. What I do with it

Ingest and calibration (already built), multi-frame playback synced to the
frame data, close/far normal variants, per-frame shadows, hit sparks tuned to
impact frames, stun and K.O. states, projectile animation, palette-swapped P2,
portraits in the HUD, character select — plus the balance pass so the new
timings feel right. All of that is my side; none of it needs your art to exist
first, so I can build the systems while you generate.
